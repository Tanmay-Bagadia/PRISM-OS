import type {
  BenchmarkTopology,
  ReferenceMetric,
  SubjectRatio,
} from '../../types/benchmark';
import { scrubPII } from './scrubber';

const IGNORED_KEYS = new Set([
  'date',
  'time',
  'timestamp',
  'ssn',
  'phone',
  'email',
  'id',
  'account',
  'account number',
  'card',
  'zip',
  'address',
  'patient',
  'client',
  'customer',
  'employee',
  'doctor',
  'subject',
  'target',
  'name',
  'company',
  'organization',
  'org',
]);

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  K: 1_000,
  m: 1_000_000,
  M: 1_000_000,
  b: 1_000_000_000,
  B: 1_000_000_000,
};

const ORG_PATTERN =
  /\b[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*)*\s+(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Co\.?|LP|LLP|GmbH|PLC)\b/g;

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[*_`~]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/^[\s\-*•]+/, '')
    .replace(/[*_`~]/g, '')
    .replace(/:$/, '')
    .trim();
}

function isDateOrIdentifier(raw: string): boolean {
  const trimmed = raw.trim();
  return (
    /^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}$/.test(trimmed) ||
    /^\d{3}[-\s]\d{2}[-\s]\d{4}$/.test(trimmed) ||
    /^(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(trimmed) ||
    /^(?:\d{4}[-\s]?){3}\d{4}$/.test(trimmed)
  );
}

function roundRatio(num: number): number {
  return Number(num.toPrecision(6));
}

function parseScaledNumber(rawToken: string): { value: number; isCurrency: boolean } | null {
  const trimmed = rawToken.trim();
  if (!trimmed || isDateOrIdentifier(trimmed)) return null;

  const match = trimmed.match(
    /^([$€£¥])?\s*(-?\d{1,3}(?:,\d{3})+|-?\d+)(?:\.(\d+))?\s*([kKmMbB](?![a-zA-Z]))?$/
  );
  if (!match) return null;

  const [, currency, intPart, decPart, suffix] = match;
  if (!intPart) return null;

  const base = Number(`${intPart.replace(/,/g, '')}${decPart ? `.${decPart}` : ''}`);
  if (!Number.isFinite(base)) return null;

  const multiplier = suffix ? MULTIPLIERS[suffix] ?? 1 : 1;
  return {
    value: Number((base * multiplier).toPrecision(12)),
    isCurrency: Boolean(currency),
  };
}

interface ParsedRatioValue {
  value: number;
  unit: string;
  rawNumerator?: number;
  rawDenominator?: number;
}

function parseRatioExpression(rawVal: string): ParsedRatioValue | null {
  const trimmed = rawVal.trim().replace(/\s*\([^)]*\)$/, '').trim();
  if (!trimmed || isDateOrIdentifier(trimmed)) return null;

  // 1. Paired numerator / denominator expression: e.g. "$120,000 / $400,000" or "45 / 150"
  const slashMatch = trimmed.match(
    /^([$€£¥]?\s*-?[\d,]+(?:\.\d+)?\s*[kKmMbB]?)\s*\/\s*([$€£¥]?\s*-?[\d,]+(?:\.\d+)?\s*[kKmMbB]?)$/
  );
  if (slashMatch && slashMatch[1] && slashMatch[2]) {
    const numA = parseScaledNumber(slashMatch[1]);
    const numB = parseScaledNumber(slashMatch[2]);
    if (numA && numB && numB.value !== 0) {
      return {
        value: roundRatio(numA.value / numB.value),
        unit: 'ratio',
        rawNumerator: numA.value,
        rawDenominator: numB.value,
      };
    }
  }

  // 2. Colon ratio: e.g. "3:1" or "2.5:1"
  const colonMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (colonMatch) {
    const numA = Number(colonMatch[1]);
    const numB = Number(colonMatch[2]);
    if (Number.isFinite(numA) && Number.isFinite(numB) && numB !== 0) {
      return {
        value: roundRatio(numA / numB),
        unit: 'ratio',
        rawNumerator: numA,
        rawDenominator: numB,
      };
    }
  }

  // 3. Percentage, multiplier (1.8x), compound rate/unit (3.3 mEq/L, 10.25 months), or unitless index
  const valueMatch = trimmed.match(
    /^(-?\d{1,3}(?:,\d{3})+|-?\d+)(?:\.(\d+))?\s*(%|x|X|[a-zA-Z][a-zA-Z0-9/%°µμ.-]*(?:\s*\/\s*[a-zA-Z0-9%°µμ.-]+)?)?$/
  );
  if (!valueMatch) return null;

  const [, intPart, decPart, rawUnit] = valueMatch;
  if (!intPart) return null;

  const numericValue = Number(`${intPart.replace(/,/g, '')}${decPart ? `.${decPart}` : ''}`);
  if (!Number.isFinite(numericValue)) return null;

  const unit = rawUnit ? rawUnit.replace(/\s+/g, '') : '';
  // Normalize 'X' multiplier to lowercase 'x'
  const normalizedUnit = unit === 'X' ? 'x' : unit;

  return {
    value: numericValue,
    unit: normalizedUnit,
  };
}

function extractCandidates(text: string): Array<{ label: string; rawValue: string }> {
  if (!text) return [];
  const candidates: Array<{ label: string; rawValue: string }> = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // Markdown table row: | Key | Value |
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      if (cells.length >= 2 && !cells.every((c) => /^:?-{2,}:?$/.test(c))) {
        const label = cleanLabel(cells[0] ?? '');
        const rawValue = cells[1];
        if (label && rawValue) {
          candidates.push({ label, rawValue });
        }
      }
      continue;
    }

    // Inline Numerator / Denominator pair on a single line:
    // e.g. "Numerator: $450,000 ... Denominator: $45,000" or "Runway — Numerator: $450k, Denominator: $45k"
    const inlinePairMatch = line.match(
      /^(?:(.+?)\s*[:\-—]\s*)?Numerator\s*:\s*(.+?)(?:\s*[,;|]\s*|\s+\.\.\.\s+|\s+)Denominator\s*:\s*(.+)$/i
    );
    if (inlinePairMatch && inlinePairMatch[2] && inlinePairMatch[3]) {
      const prefix = inlinePairMatch[1] ? cleanLabel(inlinePairMatch[1]) : 'Computed Ratio';
      candidates.push({
        label: prefix,
        rawValue: `${inlinePairMatch[2].trim()} / ${inlinePairMatch[3].trim()}`,
      });
      continue;
    }

    // Standard Key: Value or Bullet Key: Value
    const kvMatch = line.match(/^(?:[-*•]\s*)?([^:]{2,80}?)\s*:\s*(.+)$/);
    if (kvMatch && kvMatch[1] && kvMatch[2]) {
      const label = cleanLabel(kvMatch[1]);
      const rawValue = kvMatch[2].trim();
      if (label && rawValue) {
        candidates.push({ label, rawValue });
      }
    }
  }

  return candidates;
}

function extractRatiosFromText(text: string): Array<Omit<SubjectRatio, 'ratioKey'>> {
  const candidates = extractCandidates(text);
  const results: Array<Omit<SubjectRatio, 'ratioKey'>> = [];

  let pendingNumerator: { prefix: string; value: number } | null = null;

  for (const { label, rawValue } of candidates) {
    const normalized = normalizeLabel(label);
    if (!normalized || IGNORED_KEYS.has(normalized)) continue;

    // Check for multi-line Numerator / Denominator pairs
    if (normalized === 'numerator' || normalized.endsWith(' numerator')) {
      const num = parseScaledNumber(rawValue);
      if (num) {
        const prefix = label.replace(/\s*numerator$/i, '').trim();
        pendingNumerator = { prefix, value: num.value };
      }
      continue;
    }

    if (normalized === 'denominator' || normalized.endsWith(' denominator')) {
      const denom = parseScaledNumber(rawValue);
      if (denom && denom.value !== 0 && pendingNumerator) {
        const prefix =
          pendingNumerator.prefix ||
          label.replace(/\s*denominator$/i, '').trim() ||
          'Computed';
        results.push({
          label: `${prefix} Ratio`.trim(),
          value: roundRatio(pendingNumerator.value / denom.value),
          unit: 'ratio',
          rawNumerator: pendingNumerator.value,
          rawDenominator: denom.value,
        });
        pendingNumerator = null;
      }
      continue;
    }

    const parsed = parseRatioExpression(rawValue);
    if (!parsed) continue;

    results.push({
      label,
      value: parsed.value,
      unit: parsed.unit,
      ...(parsed.rawNumerator !== undefined ? { rawNumerator: parsed.rawNumerator } : {}),
      ...(parsed.rawDenominator !== undefined ? { rawDenominator: parsed.rawDenominator } : {}),
    });
  }

  return results;
}

/**
 * Extracts unitless ratios, rates, percentages, indices, and paired numerator/denominator
 * quantities dynamically from raw input and hydrated report text.
 *
 * Retains `rawNumerator` and `rawDenominator` strictly in local memory for Stage 3 hydration.
 */
export function extractSubjectRatios(
  rawContent: string,
  hydratedReport: string
): SubjectRatio[] {
  const seen = new Set<string>();
  const combined: Array<Omit<SubjectRatio, 'ratioKey'>> = [];

  for (const source of [hydratedReport, rawContent]) {
    for (const item of extractRatiosFromText(source)) {
      const key = normalizeLabel(item.label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      combined.push(item);
    }
  }

  return combined.map((item, idx) => ({
    ratioKey: `Ratio_${idx + 1}`,
    ...item,
  }));
}

interface ParsedBenchmarkNumbers {
  targetValue: number;
  peerMedian?: number;
  topQuartile?: number;
  unit: string;
}

function parseSingleNumberWithUnit(raw: string): { value: number; unit: string } | null {
  const trimmed = raw.trim();
  if (!trimmed || isDateOrIdentifier(trimmed)) return null;

  const match = trimmed.match(
    /^(-?\d{1,3}(?:,\d{3})+|-?\d+)(?:\.(\d+))?\s*(%|x|X|[a-zA-Z][a-zA-Z0-9/%°µμ.-]*(?:\s*\/\s*[a-zA-Z0-9%°µμ.-]+)?)?$/
  );
  if (!match) return null;

  const [, intPart, decPart, rawUnit] = match;
  if (!intPart) return null;
  const value = Number(`${intPart.replace(/,/g, '')}${decPart ? `.${decPart}` : ''}`);
  if (!Number.isFinite(value)) return null;

  const unit = rawUnit ? (rawUnit.trim() === 'X' ? 'x' : rawUnit.replace(/\s+/g, '')) : '';
  return { value, unit };
}

function parseAnnotatedBenchmarkValue(raw: string): ParsedBenchmarkNumbers | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let targetValue: number | undefined;
  let peerMedian: number | undefined;
  let topQuartile: number | undefined;
  let unit = '';

  const medianMatch = trimmed.match(
    /(?:peer\s+median|median|p50)\s*[:=]?\s*(-?\d+(?:\.\d+)?)\s*(%|x|X|[a-zA-Z][a-zA-Z0-9/%°µμ.-]*)?/i
  );
  if (medianMatch) {
    peerMedian = Number(medianMatch[1]);
    if (!unit && medianMatch[2]) unit = medianMatch[2] === 'X' ? 'x' : medianMatch[2];
  }

  const quartileMatch = trimmed.match(
    /(?:top\s+quartile|p75|upper\s+quartile)\s*[:=]?\s*(-?\d+(?:\.\d+)?)\s*(%|x|X|[a-zA-Z][a-zA-Z0-9/%°µμ.-]*)?/i
  );
  if (quartileMatch) {
    topQuartile = Number(quartileMatch[1]);
    if (!unit && quartileMatch[2]) unit = quartileMatch[2] === 'X' ? 'x' : quartileMatch[2];
  }

  const targetMatch = trimmed.match(
    /(?:target|benchmark|goal|threshold)\s*[:=]?\s*(-?\d+(?:\.\d+)?)\s*(%|x|X|[a-zA-Z][a-zA-Z0-9/%°µμ.-]*)?/i
  );
  if (targetMatch) {
    targetValue = Number(targetMatch[1]);
    if (!unit && targetMatch[2]) unit = targetMatch[2] === 'X' ? 'x' : targetMatch[2];
  }

  // Range expression: e.g. "20% - 30%" or "1.5 - 2.5x"
  if (targetValue === undefined) {
    const rangeMatch = trimmed.match(
      /^(-?\d+(?:\.\d+)?)\s*(%|x|X|[a-zA-Z][a-zA-Z0-9/%°µμ.-]*)?\s*(?:-|to|–)\s*(-?\d+(?:\.\d+)?)\s*(%|x|X|[a-zA-Z][a-zA-Z0-9/%°µμ.-]*)?$/i
    );
    if (rangeMatch) {
      const low = Number(rangeMatch[1]);
      const high = Number(rangeMatch[3]);
      if (Number.isFinite(low) && Number.isFinite(high)) {
        targetValue = roundRatio((low + high) / 2);
        const rangeUnit = rangeMatch[4] || rangeMatch[2] || '';
        unit = rangeUnit === 'X' ? 'x' : rangeUnit;
      }
    }
  }

  // Leading bare number before parenthetical or comma annotations: e.g. "25% (median: 20%, top quartile: 32%)"
  if (targetValue === undefined) {
    const leadingMatch = trimmed.match(
      /^(-?\d{1,3}(?:,\d{3})+|-?\d+)(?:\.(\d+))?\s*(%|x|X|[a-zA-Z][a-zA-Z0-9/%°µμ.-]*)?/
    );
    if (leadingMatch && leadingMatch[1]) {
      targetValue = Number(
        `${leadingMatch[1].replace(/,/g, '')}${leadingMatch[2] ? `.${leadingMatch[2]}` : ''}`
      );
      if (!unit && leadingMatch[3]) {
        unit = leadingMatch[3] === 'X' ? 'x' : leadingMatch[3];
      }
    }
  }

  if (targetValue === undefined && peerMedian !== undefined) {
    targetValue = peerMedian;
  } else if (targetValue === undefined && topQuartile !== undefined) {
    targetValue = topQuartile;
  }

  if (targetValue === undefined || !Number.isFinite(targetValue)) {
    return null;
  }

  return {
    targetValue,
    ...(peerMedian !== undefined && Number.isFinite(peerMedian) ? { peerMedian } : {}),
    ...(topQuartile !== undefined && Number.isFinite(topQuartile) ? { topQuartile } : {}),
    unit,
  };
}

function parseJsonReferenceData(
  referenceText: string,
  citation: string
): ReferenceMetric[] | null {
  const trimmed = referenceText.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    const items: Array<Omit<ReferenceMetric, 'metricKey' | 'sourceCitation'>> = [];

    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (!entry || typeof entry !== 'object') continue;
        const record = entry as Record<string, unknown>;
        const rawLabel = String(
          record.label ?? record.name ?? record.metric ?? record.kpi ?? ''
        ).trim();
        if (!rawLabel) continue;

        const targetRaw =
          record.targetValue ?? record.target ?? record.value ?? record.benchmark;
        const medianRaw = record.peerMedian ?? record.median ?? record.p50;
        const quartileRaw = record.topQuartile ?? record.p75 ?? record.upperQuartile;
        const unitRaw = typeof record.unit === 'string' ? record.unit.trim() : '';

        let targetValue = typeof targetRaw === 'number' ? targetRaw : undefined;
        let unit = unitRaw;

        if (targetValue === undefined && typeof targetRaw === 'string') {
          const parsedVal = parseSingleNumberWithUnit(targetRaw);
          if (parsedVal) {
            targetValue = parsedVal.value;
            if (!unit) unit = parsedVal.unit;
          }
        }

        const peerMedian =
          typeof medianRaw === 'number'
            ? medianRaw
            : typeof medianRaw === 'string'
              ? parseSingleNumberWithUnit(medianRaw)?.value
              : undefined;

        const topQuartile =
          typeof quartileRaw === 'number'
            ? quartileRaw
            : typeof quartileRaw === 'string'
              ? parseSingleNumberWithUnit(quartileRaw)?.value
              : undefined;

        if (targetValue === undefined && peerMedian !== undefined) {
          targetValue = peerMedian;
        }
        if (targetValue === undefined || !Number.isFinite(targetValue)) continue;

        items.push({
          label: cleanLabel(rawLabel),
          targetValue,
          ...(peerMedian !== undefined ? { peerMedian } : {}),
          ...(topQuartile !== undefined ? { topQuartile } : {}),
          unit,
        });
      }
    } else if (parsed && typeof parsed === 'object') {
      for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
        const label = cleanLabel(key);
        if (!label) continue;

        if (typeof val === 'number' && Number.isFinite(val)) {
          items.push({ label, targetValue: val, unit: '' });
        } else if (typeof val === 'string') {
          const parsedVal = parseAnnotatedBenchmarkValue(val);
          if (parsedVal) {
            items.push({ label, ...parsedVal });
          }
        } else if (val && typeof val === 'object') {
          const record = val as Record<string, unknown>;
          const target = Number(record.targetValue ?? record.target ?? record.value);
          if (!Number.isFinite(target)) continue;
          const peerMedian = Number(record.peerMedian ?? record.median);
          const topQuartile = Number(record.topQuartile ?? record.p75);
          const unit = typeof record.unit === 'string' ? record.unit.trim() : '';
          items.push({
            label,
            targetValue: target,
            ...(Number.isFinite(peerMedian) ? { peerMedian } : {}),
            ...(Number.isFinite(topQuartile) ? { topQuartile } : {}),
            unit,
          });
        }
      }
    }

    if (items.length === 0) return null;
    return items.map((item, idx) => ({
      metricKey: `Metric_${idx + 1}`,
      ...item,
      sourceCitation: citation,
    }));
  } catch {
    return null;
  }
}

interface TableColumnMap {
  labelIdx: number;
  targetIdx: number;
  medianIdx: number;
  quartileIdx: number;
  unitIdx: number;
}

function detectTableColumns(headers: string[]): TableColumnMap {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  const findIdx = (patterns: RegExp[]): number =>
    normalized.findIndex((h) => patterns.some((p) => p.test(h)));

  const labelIdx = Math.max(
    0,
    findIdx([/^metric/, /^label/, /^name/, /^ratio/, /^kpi/, /^indicator/])
  );
  const medianIdx = findIdx([/median/, /p50/, /peer/]);
  const quartileIdx = findIdx([/quartile/, /p75/, /top/, /upper/]);
  const unitIdx = findIdx([/^unit/]);
  let targetIdx = findIdx([/target/, /benchmark/, /goal/, /threshold/, /value/]);

  if (targetIdx === -1) {
    targetIdx = normalized.findIndex(
      (_, idx) => idx !== labelIdx && idx !== medianIdx && idx !== quartileIdx && idx !== unitIdx
    );
  }

  return { labelIdx, targetIdx, medianIdx, quartileIdx, unitIdx };
}

function parseDelimitedRow(
  cells: string[],
  cols: TableColumnMap
): Omit<ReferenceMetric, 'metricKey' | 'sourceCitation'> | null {
  const rawLabel = cells[cols.labelIdx];
  if (!rawLabel) return null;
  const label = cleanLabel(rawLabel);
  if (!label || IGNORED_KEYS.has(normalizeLabel(label))) return null;

  const unitCell = cols.unitIdx >= 0 ? cells[cols.unitIdx] : undefined;
  let unit = unitCell ? unitCell.trim() : '';
  let targetValue: number | undefined;
  let peerMedian: number | undefined;
  let topQuartile: number | undefined;

  const targetCell = cols.targetIdx >= 0 ? cells[cols.targetIdx] : undefined;
  if (targetCell) {
    const parsed = parseSingleNumberWithUnit(targetCell);
    if (parsed) {
      targetValue = parsed.value;
      if (!unit && parsed.unit) unit = parsed.unit;
    }
  }
  const medianCell = cols.medianIdx >= 0 ? cells[cols.medianIdx] : undefined;
  if (medianCell) {
    const parsed = parseSingleNumberWithUnit(medianCell);
    if (parsed) {
      peerMedian = parsed.value;
      if (!unit && parsed.unit) unit = parsed.unit;
    }
  }
  const quartileCell = cols.quartileIdx >= 0 ? cells[cols.quartileIdx] : undefined;
  if (quartileCell) {
    const parsed = parseSingleNumberWithUnit(quartileCell);
    if (parsed) {
      topQuartile = parsed.value;
      if (!unit && parsed.unit) unit = parsed.unit;
    }
  }

  if (targetValue === undefined && peerMedian !== undefined) {
    targetValue = peerMedian;
  }
  if (targetValue === undefined || !Number.isFinite(targetValue)) return null;

  return {
    label,
    targetValue,
    ...(peerMedian !== undefined ? { peerMedian } : {}),
    ...(topQuartile !== undefined ? { topQuartile } : {}),
    unit,
  };
}

/**
 * Dynamically parses numeric benchmarks, target thresholds, medians, or ranges
 * from user-supplied reference text (key-value lines, markdown tables, CSV, or JSON-like pairs).
 */
export function parseUserReferenceData(
  referenceText: string,
  sourceTitle: string
): ReferenceMetric[] {
  const citation = sourceTitle.trim() || 'User-Supplied Reference';
  if (!referenceText || !referenceText.trim()) return [];

  const jsonResult = parseJsonReferenceData(referenceText, citation);
  if (jsonResult) return jsonResult;

  const lines = referenceText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const extracted: Array<Omit<ReferenceMetric, 'metricKey' | 'sourceCitation'>> = [];
  const seen = new Set<string>();

  let tableCols: TableColumnMap | null = null;
  let csvCols: TableColumnMap | null = null;

  const pushUnique = (item: Omit<ReferenceMetric, 'metricKey' | 'sourceCitation'> | null) => {
    if (!item) return;
    const key = normalizeLabel(item.label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    extracted.push(item);
  };

  for (const line of lines) {
    // 1. Markdown table rows
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.slice(1, -1).split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;

      const looksLikeHeader = cells.some((c) =>
        /^(metric|label|name|ratio|kpi|target|benchmark|median|quartile|unit)/i.test(c)
      );
      if (looksLikeHeader && !tableCols) {
        tableCols = detectTableColumns(cells);
        continue;
      }

      if (tableCols) {
        pushUnique(parseDelimitedRow(cells, tableCols));
      } else if (cells.length >= 2) {
        const label = cleanLabel(cells[0] ?? '');
        const parsed = parseAnnotatedBenchmarkValue(cells[1] ?? '');
        if (label && parsed) {
          pushUnique({ label, ...parsed });
        }
      }
      continue;
    }

    tableCols = null;

    // 2. CSV rows (only when line has commas and isn't a key: value annotation line)
    if (line.includes(',') && !line.includes(':')) {
      const cells = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const looksLikeHeader = cells.some((c) =>
        /^(metric|label|name|ratio|kpi|target|benchmark|median|quartile|unit)/i.test(c)
      );
      if (looksLikeHeader && !csvCols) {
        csvCols = detectTableColumns(cells);
        continue;
      }
      if (csvCols) {
        pushUnique(parseDelimitedRow(cells, csvCols));
        continue;
      }
      if (cells.length === 2) {
        const label = cleanLabel(cells[0] ?? '');
        const parsed = parseAnnotatedBenchmarkValue(cells[1] ?? '');
        if (label && parsed) {
          pushUnique({ label, ...parsed });
          continue;
        }
      }
    }

    csvCols = null;

    // 3. Key-value / annotated lines: "Label: value ..." or "Label — target: X, median: Y"
    const kvMatch = line.match(/^(?:[-*•]\s*)?([^:—]+?)\s*(?::|—)\s*(.+)$/);
    if (kvMatch && kvMatch[1] && kvMatch[2]) {
      const label = cleanLabel(kvMatch[1]);
      if (!label || IGNORED_KEYS.has(normalizeLabel(label))) continue;
      const parsed = parseAnnotatedBenchmarkValue(kvMatch[2]);
      if (parsed) {
        pushUnique({ label, ...parsed });
      }
    }
  }

  return extracted.map((item, idx) => ({
    metricKey: `Metric_${idx + 1}`,
    ...item,
    sourceCitation: citation,
  }));
}

function sanitizeTextForCloud(text: string): string {
  if (!text) return '';
  return scrubPII(text).replace(ORG_PATTERN, '[ORG_REDACTED]').trim();
}

function sanitizeUnitForCloud(unit: string): string {
  if (!unit) return '';
  return unit.replace(/[$€£¥]/g, '').trim();
}

function sanitizeLabelForCloud(label: string, fallback: string): string {
  const scrubbed = sanitizeTextForCloud(label);
  const withoutTokens = scrubbed.replace(/\[[A-Z_]+_REDACTED\]/g, '').trim();
  return withoutTokens ? scrubbed : fallback;
}

/**
 * Constructs a zero-PII `BenchmarkTopology` payload safe for Stage 2 cloud evaluation.
 * Strips all raw numerators/denominators, personal/company names, dates, IDs, and currency amounts.
 */
export function buildAnonymizedBenchmarkTopology(
  subjectRatios: SubjectRatio[],
  referenceMetrics: ReferenceMetric[],
  sourceTitle: string | null
): BenchmarkTopology {
  const sanitizedTitle =
    sourceTitle && sourceTitle.trim() ? sanitizeTextForCloud(sourceTitle) : null;

  return {
    schema: 'prism-benchmark-v1',
    userProvidedSourceTitle: sanitizedTitle || null,
    subjectRatios: subjectRatios.map((ratio, idx) => {
      const ratioKey = `Ratio_${idx + 1}`;
      return {
        ratioKey,
        label: ratioKey,
        value: ratio.value,
        unit: sanitizeUnitForCloud(ratio.unit),
      };
    }),
    referenceMetrics: referenceMetrics.map((metric, idx) => {
      const metricKey = `Metric_${idx + 1}`;
      return {
        metricKey,
        label: sanitizeLabelForCloud(metric.label, metricKey),
        targetValue: metric.targetValue,
        ...(metric.peerMedian !== undefined ? { peerMedian: metric.peerMedian } : {}),
        ...(metric.topQuartile !== undefined ? { topQuartile: metric.topQuartile } : {}),
        unit: sanitizeUnitForCloud(metric.unit),
        sourceCitation:
          sanitizeTextForCloud(metric.sourceCitation) || 'User-Supplied Reference',
      };
    }),
  };
}
