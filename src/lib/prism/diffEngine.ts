import type { DiffTopology, ExtractedMetric, MetricDelta } from '../../types/longitudinal';
import { scrubPII } from './scrubber';

const INVERSE_METRIC_TERMS = [
  'cost',
  'burn',
  'latency',
  'risk',
  'debt',
  'error',
  'expense',
  'loss',
  'churn',
  'liability',
  'deficit',
  'spend',
  'delay',
  'overhead',
  'incident',
  'failure',
];

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
  'name',
  'doctor',
]);

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  K: 1_000,
  m: 1_000_000,
  M: 1_000_000,
  b: 1_000_000_000,
  B: 1_000_000_000,
};

function normalizeMetricName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[*_`~]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanMetricName(raw: string): string {
  return raw
    .replace(/^[\s\-*•]+/, '')
    .replace(/[*_`~]/g, '')
    .replace(/:$/, '')
    .trim();
}

interface ParsedValue {
  value: number;
  unit: string;
  rawDisplay: string;
}

function parseMetricValue(rawVal: string): ParsedValue | null {
  const trimmed = rawVal.trim();
  if (!trimmed) return null;

  // Reject dates, SSNs, phone numbers, and multi-segment IDs
  if (
    /^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}$/.test(trimmed) ||
    /^\d{3}[-\s]\d{2}[-\s]\d{4}$/.test(trimmed) ||
    /^(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(trimmed)
  ) {
    return null;
  }

  // Match optional leading currency, signed number with optional commas/decimals, optional k/M/B suffix (not followed by letters like 'ms'), and optional trailing unit
  const match = trimmed.match(
    /^([$€£¥₹])?\s*(-?\d{1,3}(?:,\d{3})+|-?\d+)(?:\.(\d+))?\s*([kKmMbB](?![a-zA-Z]))?(?:\s*(%|USD|EUR|GBP|INR|[a-zA-Z][a-zA-Z0-9/%°µμ.-]*))?(?:\s*\(.*\))?$/
  );
  if (!match) return null;

  const [, currency, intPart, decPart, suffix, trailingUnit] = match;
  if (!intPart) return null;
  const numericStr = `${intPart.replace(/,/g, '')}${decPart ? `.${decPart}` : ''}`;
  const baseNum = Number(numericStr);
  if (!Number.isFinite(baseNum)) return null;

  const multiplier = suffix ? MULTIPLIERS[suffix] ?? 1 : 1;
  const value = Number((baseNum * multiplier).toPrecision(12));
  const unit = (currency || trailingUnit || '').trim();

  // Strip parenthetical notes from rawDisplay if present, keeping the core value expression
  const rawDisplay = trimmed.replace(/\s*\(.*\)$/, '').trim();

  return { value, unit, rawDisplay };
}

function extractCandidatesFromText(text: string): Array<{ name: string; rawValue: string }> {
  if (!text) return [];
  const candidates: Array<{ name: string; rawValue: string }> = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1. Markdown table row: | Key | Value |
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      if (cells.length >= 2 && !cells.every((c) => /^[-:\s]+$/.test(c))) {
        const name = cleanMetricName(cells[0] ?? '');
        const rawValue = cells[1] ?? '';
        if (name && rawValue) {
          candidates.push({ name, rawValue });
        }
      }
      continue;
    }

    // 2. Bold key-value: **Key:** Value or **Key**: Value
    const boldMatch = line.match(/^(?:[-*•]\s*)?\*\*([^*]+?)(?::)?\*\*:?\s+(.+)$/);
    if (boldMatch?.[1] && boldMatch[2]) {
      const name = cleanMetricName(boldMatch[1]);
      const rawValue = boldMatch[2].trim();
      if (name && rawValue) {
        candidates.push({ name, rawValue });
      }
      continue;
    }

    // 3. Standard Key: Value
    const kvMatch = line.match(/^(?:[-*•]\s*)?([^:]{2,60}):\s+(.+)$/);
    if (kvMatch?.[1] && kvMatch[2]) {
      const name = cleanMetricName(kvMatch[1]);
      const rawValue = kvMatch[2].trim();
      if (name && rawValue) {
        candidates.push({ name, rawValue });
      }
    }
  }

  return candidates;
}

/**
 * Dynamically extracts numeric metrics, currency values (including k/M/B shorthand),
 * and units from hydrated reports and raw content, deduplicated by normalized name.
 */
export function extractMetricsFromReport(
  hydratedReport: string,
  rawContent: string
): ExtractedMetric[] {
  const seen = new Set<string>();
  const metrics: ExtractedMetric[] = [];

  const allCandidates = [
    ...extractCandidatesFromText(hydratedReport),
    ...extractCandidatesFromText(rawContent),
  ];

  for (const { name, rawValue } of allCandidates) {
    const normalized = normalizeMetricName(name);
    if (!normalized || IGNORED_KEYS.has(normalized) || seen.has(normalized)) {
      continue;
    }

    const parsed = parseMetricValue(rawValue);
    if (!parsed) continue;

    seen.add(normalized);
    metrics.push({
      name,
      value: parsed.value,
      unit: parsed.unit,
      rawDisplay: parsed.rawDisplay,
    });
  }

  return metrics;
}

function isInverseMetric(metricName: string): boolean {
  const normalized = normalizeMetricName(metricName);
  return INVERSE_METRIC_TERMS.some((term) => normalized.includes(term));
}

/**
 * Matches metrics between previous and current snapshots by normalized name
 * and computes absolute/percent deltas and improvement direction.
 */
export function computeMetricDeltas(
  previous: ExtractedMetric[],
  current: ExtractedMetric[]
): MetricDelta[] {
  const prevByNorm = new Map<string, ExtractedMetric>();
  for (const metric of previous) {
    const norm = normalizeMetricName(metric.name);
    if (norm && !prevByNorm.has(norm)) {
      prevByNorm.set(norm, metric);
    }
  }

  const deltas: MetricDelta[] = [];
  for (const curr of current) {
    const norm = normalizeMetricName(curr.name);
    const prev = prevByNorm.get(norm);
    if (!prev) continue;

    const absoluteChange = Number((curr.value - prev.value).toPrecision(12));
    let percentChange = 0;
    if (prev.value === 0) {
      percentChange = absoluteChange === 0 ? 0 : absoluteChange > 0 ? 100 : -100;
    } else {
      percentChange = Number(
        (((curr.value - prev.value) / Math.abs(prev.value)) * 100).toFixed(1)
      );
    }

    let direction: MetricDelta['direction'] = 'UNCHANGED';
    if (absoluteChange !== 0) {
      const inverse = isInverseMetric(curr.name);
      if (inverse) {
        direction = absoluteChange < 0 ? 'IMPROVED' : 'WORSENED';
      } else {
        direction = absoluteChange > 0 ? 'IMPROVED' : 'WORSENED';
      }
    }

    deltas.push({
      metricName: curr.name,
      previousDisplay: prev.rawDisplay,
      currentDisplay: curr.rawDisplay,
      absoluteChange,
      percentChange,
      direction,
    });
  }

  return deltas;
}

function scrubTimeframeNote(note?: string): string {
  if (!note || !note.trim()) {
    return 'Session comparison';
  }

  let sanitized = scrubPII(note.trim());
  // Scrub month-based dates (e.g., "Jan 15, 2025", "March 2024")
  sanitized = sanitized.replace(
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{2,4})?\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/gi,
    '[DATE_REDACTED]'
  );
  // Scrub 4+ digit numbers (years, account IDs, etc.)
  sanitized = sanitized.replace(/\b\d{4,}\b/g, '[NUM_REDACTED]');
  // Scrub capitalized multi-word proper names (e.g., "John Smith", "Acme Corp")
  sanitized = sanitized.replace(/\b[A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})+\b/g, '[NAME_REDACTED]');

  return sanitized;
}

/**
 * Maps local metric deltas into a zero-PII prism-diff-v1 topology safe for cloud reasoning.
 */
export function buildAnonymizedDiffTopology(
  deltas: MetricDelta[],
  timeframeNote?: string
): DiffTopology {
  return {
    schema: 'prism-diff-v1',
    timeframeNote: scrubTimeframeNote(timeframeNote),
    deltas: deltas.map((delta, index) => ({
      metricId: `Metric_${index + 1}`,
      percentChange: delta.percentChange,
      direction: delta.direction,
    })),
  };
}
