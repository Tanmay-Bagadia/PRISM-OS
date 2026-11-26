import { describe, expect, it } from 'vitest';
import { buildExportPayload } from '../src/lib/prism/exportFormatter';
import type { BenchmarkFinding } from '../src/types/benchmark';
import type { MetricDelta } from '../src/types/longitudinal';

const SAMPLE_REDACTION_MAP: Record<string, string> = {
  'Acme BioLabs Inc.': 'Organization_A',
  'Dr. Elena Vance': 'Person_A',
  'Johnathan Mercer': 'Person_B',
  'Project Helios': '[REDACTED]',
};

const SAMPLE_REPORT = `# Executive Assessment — Acme BioLabs Inc.
Prepared for **Johnathan Mercer** and \`Dr. Elena Vance\` regarding **Project Helios**.

| Metric | Value | Status |
| --- | --- | --- |
| Net Burn | $142,500.00 | Elevated |
| Contact | elena.vance@acmebiolabs.com | Verified |

Residual identifiers: SSN 123-45-6789, Card 4532-1190-8821-4401, Phone (415) 555-0192.`;

const SAMPLE_FINDINGS: BenchmarkFinding[] = [
  {
    ratioKey: 'burn_multiple',
    label: 'Net Burn Multiple for Acme BioLabs Inc.',
    observedDisplay: '$142,500.00 / mo',
    benchmarkDisplay: '$95,000.00 / mo',
    percentileOrStanding: 'Bottom Quartile',
    localImpactSummary: 'Johnathan Mercer should review Project Helios runway.',
    sourceCitation: 'Bessemer Cloud Index 2025',
    sourceType: 'STANDARD_BASELINE',
  },
];

const SAMPLE_DELTAS: MetricDelta[] = [
  {
    metricName: 'Acme BioLabs Inc. Monthly Burn',
    previousDisplay: '$120,000.00',
    currentDisplay: '$142,500.00',
    absoluteChange: 22500,
    percentChange: 18.75,
    direction: 'WORSENED',
  },
];

describe('buildExportPayload', () => {
  it('strips all redactionMap PII and residual raw tokens in MASKED_SAFE mode', () => {
    const payload = buildExportPayload({
      mode: 'MASKED_SAFE',
      title: '# Acme BioLabs Inc. — Project Helios Brief',
      hydratedReport: SAMPLE_REPORT,
      redactionMap: SAMPLE_REDACTION_MAP,
      benchmarkFindings: SAMPLE_FINDINGS,
      metricDeltas: SAMPLE_DELTAS,
    });

    expect(payload.mode).toBe('MASKED_SAFE');
    expect(payload.bodyText).toContain('[PRISM-OS • ZERO-PII MASKED BRIEF]');
    expect(payload.maskedEntityCount).toBeGreaterThan(0);
    expect(payload.characterCount).toBe(payload.bodyText.length);

    // Zero raw PII from redactionMap
    for (const rawPii of Object.keys(SAMPLE_REDACTION_MAP)) {
      expect(payload.subject).not.toContain(rawPii);
      expect(payload.bodyText).not.toContain(rawPii);
    }

    // Clean Stage 1 tokens preserved
    expect(payload.bodyText).toContain('Organization_A');
    expect(payload.bodyText).toContain('Person_A');
    expect(payload.bodyText).toContain('Person_B');
    expect(payload.bodyText).toContain('[REDACTED]');

    // Zero residual currency, SSN, email, card, or phone tokens
    expect(payload.bodyText).not.toContain('$142,500.00');
    expect(payload.bodyText).not.toContain('$120,000.00');
    expect(payload.bodyText).not.toContain('$95,000.00');
    expect(payload.bodyText).not.toContain('123-45-6789');
    expect(payload.bodyText).not.toContain('elena.vance@acmebiolabs.com');
    expect(payload.bodyText).not.toContain('4532-1190-8821-4401');
    expect(payload.bodyText).not.toContain('(415) 555-0192');

    // Noisy markdown syntax stripped
    expect(payload.bodyText).not.toContain('**');
    expect(payload.bodyText).not.toContain('`');
    expect(payload.bodyText).not.toMatch(/^#\s/m);
    expect(payload.bodyText).not.toContain('---');
  });

  it('preserves full local details, citations, and deltas in UNMASKED_LOCAL mode', () => {
    const payload = buildExportPayload({
      mode: 'UNMASKED_LOCAL',
      title: 'Acme BioLabs Inc. — Project Helios Brief',
      hydratedReport: SAMPLE_REPORT,
      redactionMap: SAMPLE_REDACTION_MAP,
      benchmarkFindings: SAMPLE_FINDINGS,
      metricDeltas: SAMPLE_DELTAS,
    });

    expect(payload.mode).toBe('UNMASKED_LOCAL');
    expect(payload.maskedEntityCount).toBe(0);
    expect(payload.bodyText).toContain('[PRISM-OS • CONFIDENTIAL UNMASKED BRIEF]');
    expect(payload.bodyText).toContain('Acme BioLabs Inc.');
    expect(payload.bodyText).toContain('Johnathan Mercer');
    expect(payload.bodyText).toContain('$142,500.00');
    expect(payload.bodyText).toContain('Source: Bessemer Cloud Index 2025');
    expect(payload.bodyText).toContain(
      'Acme BioLabs Inc. Monthly Burn: $120,000.00 -> $142,500.00 (18.75%)'
    );
  });

  it('generates properly encoded Gmail and WhatsApp URLs within safe browser limits', () => {
    const longReport = Array.from(
      { length: 60 },
      (_, idx) => `Finding ${idx + 1}: Organization_A operating ratio remained stable during review.`
    ).join('\n');

    const payload = buildExportPayload({
      mode: 'MASKED_SAFE',
      title: 'Long Brief & Summary',
      hydratedReport: longReport,
      redactionMap: SAMPLE_REDACTION_MAP,
    });

    expect(payload.gmailComposeUrl.startsWith('https://mail.google.com/mail/?view=cm&fs=1&su=')).toBe(
      true
    );
    expect(payload.whatsappShareUrl.startsWith('https://api.whatsapp.com/send?text=')).toBe(true);

    expect(payload.gmailComposeUrl.length).toBeLessThanOrEqual(1900);
    expect(payload.whatsappShareUrl.length).toBeLessThanOrEqual(1900);

    const decodedGmail = decodeURIComponent(payload.gmailComposeUrl.split('&body=')[1] ?? '');
    const decodedWa = decodeURIComponent(payload.whatsappShareUrl.split('text=')[1] ?? '');
    expect(decodedGmail).toContain('[Full report copied to clipboard]');
    expect(decodedWa).toContain('[Full report copied to clipboard]');
  });
});
