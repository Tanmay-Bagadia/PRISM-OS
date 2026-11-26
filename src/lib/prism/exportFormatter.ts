import type { BenchmarkFinding } from '../../types/benchmark';
import type { ExportPrivacyMode, FormattedSharePayload } from '../../types/export';
import type { MetricDelta } from '../../types/longitudinal';
import { buildRedactedDocument } from './redactor';

export interface BuildExportPayloadOptions {
  mode: ExportPrivacyMode;
  title: string;
  hydratedReport: string;
  redactionMap: Record<string, string>;
  benchmarkFindings?: BenchmarkFinding[];
  metricDeltas?: MetricDelta[];
}

const MASK_ALL_CONFIG = {
  maskNames: true,
  maskIds: true,
  maskContact: true,
  maskFinancial: true,
} as const;

const TRUNCATION_NOTICE = '...\n\n[Full report copied to clipboard]';
const MAX_SHARE_URL_LENGTH = 1900;
const MAX_RAW_BODY_CHARS = 1200;

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyRedactionMap(
  input: string,
  sortedEntries: ReadonlyArray<[string, string]>
): { text: string; count: number } {
  if (!input || sortedEntries.length === 0) {
    return { text: input, count: 0 };
  }

  let text = input;
  let count = 0;

  for (const [rawEntity, token] of sortedEntries) {
    const re = new RegExp(escapeRegExp(rawEntity), 'g');
    text = text.replace(re, () => {
      count += 1;
      return token;
    });
  }

  return { text, count };
}

function stripMarkdownToPlainText(input: string): string {
  if (!input) return '';

  const lines = input
    .replace(/```[^\n]*\n?/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .split('\n');

  const cleanedLines: string[] = [];

  for (const rawLine of lines) {
    // Drop markdown table separator lines (e.g. | --- | :---: |)
    if (/^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(rawLine)) {
      continue;
    }

    let line = rawLine
      // Strip ATX headings
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      // Strip bold/italic emphasis without touching underscores in tokens like Organization_A
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/\*\*/g, '')
      .replace(/`/g, '');

    // Convert markdown table pipes to clean plain-text columns
    if (line.includes('|')) {
      line = line
        .replace(/^\s*\|/, '')
        .replace(/\|\s*$/, '')
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join(' | ');
    }

    cleanedLines.push(line.trimEnd());
  }

  return cleanedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatSections(
  header: string,
  title: string,
  report: string,
  benchmarkFindings?: BenchmarkFinding[],
  metricDeltas?: MetricDelta[]
): string {
  const sections: string[] = [header];

  if (title.trim()) {
    sections.push(title.trim());
  }

  if (report.trim()) {
    sections.push(report.trim());
  }

  if (benchmarkFindings && benchmarkFindings.length > 0) {
    const lines = benchmarkFindings.map(
      (f) =>
        `- ${f.label}: ${f.observedDisplay} vs ${f.benchmarkDisplay} (${f.percentileOrStanding}) — ${f.localImpactSummary} (Source: ${f.sourceCitation})`
    );
    sections.push(`BENCHMARK FINDINGS\n${lines.join('\n')}`);
  }

  if (metricDeltas && metricDeltas.length > 0) {
    const lines = metricDeltas.map(
      (d) => `- ${d.metricName}: ${d.previousDisplay} -> ${d.currentDisplay} (${d.percentChange}%)`
    );
    sections.push(`LONGITUDINAL DELTAS\n${lines.join('\n')}`);
  }

  return sections.join('\n\n').trim();
}

function buildTruncatedEncodedUrl(
  urlPrefix: string,
  rawText: string,
  maxRawChars: number,
  maxTotalUrlLength: number
): string {
  const fullEncoded = urlPrefix + encodeURIComponent(rawText);
  if (rawText.length <= maxRawChars && fullEncoded.length <= maxTotalUrlLength) {
    return fullEncoded;
  }

  let high = Math.min(rawText.length, Math.max(0, maxRawChars - TRUNCATION_NOTICE.length));
  let low = 0;
  let best = urlPrefix + encodeURIComponent(TRUNCATION_NOTICE);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${rawText.slice(0, mid).trimEnd()}${TRUNCATION_NOTICE}`;
    const encoded = urlPrefix + encodeURIComponent(candidate);
    if (encoded.length <= maxTotalUrlLength) {
      best = encoded;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

/**
 * Formats a locally hydrated PRISM-OS report into either a zero-PII masked brief
 * or a full unmasked local brief, along with URL-safe browser share links.
 */
export function buildExportPayload(options: BuildExportPayloadOptions): FormattedSharePayload {
  const {
    mode,
    title,
    hydratedReport,
    redactionMap,
    benchmarkFindings = [],
    metricDeltas = [],
  } = options;

  let subject = stripMarkdownToPlainText(title) || 'PRISM-OS Brief';
  let bodyText: string;
  let maskedEntityCount = 0;

  if (mode === 'MASKED_SAFE') {
    const sortedEntries = Object.entries(redactionMap)
      .filter(([key]) => key.length > 0)
      .sort(([a], [b]) => b.length - a.length);

    const scrub = (value: string): string => {
      const res = applyRedactionMap(value, sortedEntries);
      maskedEntityCount += res.count;
      return res.text;
    };

    const scrubbedTitle = scrub(subject);
    const scrubbedReport = scrub(stripMarkdownToPlainText(hydratedReport));
    const scrubbedFindings: BenchmarkFinding[] = benchmarkFindings.map((f) => ({
      ...f,
      label: scrub(stripMarkdownToPlainText(f.label)),
      observedDisplay: scrub(f.observedDisplay),
      benchmarkDisplay: scrub(f.benchmarkDisplay),
      percentileOrStanding: scrub(f.percentileOrStanding),
      localImpactSummary: scrub(stripMarkdownToPlainText(f.localImpactSummary)),
      sourceCitation: scrub(f.sourceCitation),
    }));
    const scrubbedDeltas: MetricDelta[] = metricDeltas.map((d) => ({
      ...d,
      metricName: scrub(stripMarkdownToPlainText(d.metricName)),
      previousDisplay: scrub(d.previousDisplay),
      currentDisplay: scrub(d.currentDisplay),
    }));

    const assembledBody = formatSections(
      '[PRISM-OS • ZERO-PII MASKED BRIEF]',
      scrubbedTitle,
      scrubbedReport,
      scrubbedFindings,
      scrubbedDeltas
    );

    const subjectRedaction = buildRedactedDocument(scrubbedTitle, null, MASK_ALL_CONFIG);
    const bodyRedaction = buildRedactedDocument(assembledBody, null, MASK_ALL_CONFIG);

    maskedEntityCount += subjectRedaction.counts.total + bodyRedaction.counts.total;
    subject = subjectRedaction.redactedText;
    bodyText = bodyRedaction.redactedText;
  } else {
    const cleanReport = stripMarkdownToPlainText(hydratedReport);
    const cleanFindings: BenchmarkFinding[] = benchmarkFindings.map((f) => ({
      ...f,
      label: stripMarkdownToPlainText(f.label),
      localImpactSummary: stripMarkdownToPlainText(f.localImpactSummary),
    }));
    const cleanDeltas: MetricDelta[] = metricDeltas.map((d) => ({
      ...d,
      metricName: stripMarkdownToPlainText(d.metricName),
    }));

    bodyText = formatSections(
      '[PRISM-OS • CONFIDENTIAL UNMASKED BRIEF]',
      subject,
      cleanReport,
      cleanFindings,
      cleanDeltas
    );
  }

  const gmailPrefix = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=`;
  const gmailComposeUrl = buildTruncatedEncodedUrl(
    gmailPrefix,
    bodyText,
    MAX_RAW_BODY_CHARS,
    MAX_SHARE_URL_LENGTH
  );

  const waPrefix = 'https://api.whatsapp.com/send?text=';
  const waRawText = `${subject}\n\n${bodyText}`;
  const whatsappShareUrl = buildTruncatedEncodedUrl(
    waPrefix,
    waRawText,
    MAX_RAW_BODY_CHARS + subject.length + 2,
    MAX_SHARE_URL_LENGTH
  );

  return {
    mode,
    subject,
    bodyText,
    maskedEntityCount,
    characterCount: bodyText.length,
    gmailComposeUrl,
    whatsappShareUrl,
  };
}
