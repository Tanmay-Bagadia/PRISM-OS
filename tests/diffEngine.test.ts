import { describe, expect, it } from 'vitest';
import {
  buildAnonymizedDiffTopology,
  computeMetricDeltas,
  extractMetricsFromReport,
} from '../src/lib/prism/diffEngine';
import { containsPotentialPII } from '../src/lib/prism/scrubber';

describe('diffEngine', () => {
  it('dynamically extracts numeric metrics, k/M currency shorthand, and units across formats and deduplicates', () => {
    const hydratedReport = [
      'Patient: Jane Doe',
      'Date: 2025-01-15',
      'Ferritin: 14 ng/mL',
      '**Net Monthly Burn:** $135k',
      '| Metric | Value |',
      '| --- | --- |',
      '| ARR | $3.6M |',
      '| Latency P95 | 240 ms |',
    ].join('\n');

    const rawContent = [
      'ferritin: 99 ng/mL', // duplicate normalized name -> hydratedReport wins
      '- Cash Reserve: $450,000',
      'SSN: 123-45-6789',
    ].join('\n');

    const metrics = extractMetricsFromReport(hydratedReport, rawContent);

    expect(metrics).toEqual([
      { name: 'Ferritin', value: 14, unit: 'ng/mL', rawDisplay: '14 ng/mL' },
      { name: 'Net Monthly Burn', value: 135000, unit: '$', rawDisplay: '$135k' },
      { name: 'ARR', value: 3600000, unit: '$', rawDisplay: '$3.6M' },
      { name: 'Latency P95', value: 240, unit: 'ms', rawDisplay: '240 ms' },
      { name: 'Cash Reserve', value: 450000, unit: '$', rawDisplay: '$450,000' },
    ]);
  });

  it('computes accurate metric deltas and classifies IMPROVED, WORSENED, and UNCHANGED', () => {
    const prev = extractMetricsFromReport(
      [
        'Ferritin: 14 ng/mL',
        'Net Monthly Burn: $135k',
        'Error Rate: 1.5%',
        'Active Seats: 100',
      ].join('\n'),
      ''
    );

    const curr = extractMetricsFromReport(
      [
        'Ferritin: 22 ng/mL',
        'Net Monthly Burn: $120k',
        'Error Rate: 2.1%',
        'Active Seats: 100',
      ].join('\n'),
      ''
    );

    const deltas = computeMetricDeltas(prev, curr);

    expect(deltas).toEqual([
      {
        metricName: 'Ferritin',
        previousDisplay: '14 ng/mL',
        currentDisplay: '22 ng/mL',
        absoluteChange: 8,
        percentChange: 57.1,
        direction: 'IMPROVED',
      },
      {
        metricName: 'Net Monthly Burn',
        previousDisplay: '$135k',
        currentDisplay: '$120k',
        absoluteChange: -15000,
        percentChange: -11.1,
        direction: 'IMPROVED',
      },
      {
        metricName: 'Error Rate',
        previousDisplay: '1.5%',
        currentDisplay: '2.1%',
        absoluteChange: 0.6,
        percentChange: 40,
        direction: 'WORSENED',
      },
      {
        metricName: 'Active Seats',
        previousDisplay: '100',
        currentDisplay: '100',
        absoluteChange: 0,
        percentChange: 0,
        direction: 'UNCHANGED',
      },
    ]);
  });

  it('builds a zero-PII DiffTopology with abstract Metric_N IDs and scrubbed timeframeNote', () => {
    const prev = extractMetricsFromReport(
      [
        'Ferritin: 14 ng/mL',
        'Net Monthly Burn: $135k',
      ].join('\n'),
      ''
    );
    const curr = extractMetricsFromReport(
      [
        'Ferritin: 22 ng/mL',
        'Net Monthly Burn: $120k',
      ].join('\n'),
      ''
    );

    const deltas = computeMetricDeltas(prev, curr);
    const topology = buildAnonymizedDiffTopology(
      deltas,
      'Comparison for John Smith (SSN 123-45-6789, john@acme.com, card 4111-2222-3333-4444) on 2025-02-14'
    );

    expect(topology.schema).toBe('prism-diff-v1');
    expect(topology.deltas).toEqual([
      { metricId: 'Metric_1', percentChange: 57.1, direction: 'IMPROVED' },
      { metricId: 'Metric_2', percentChange: -11.1, direction: 'IMPROVED' },
    ]);

    const serialized = JSON.stringify(topology);
    expect(containsPotentialPII(serialized)).toBe(false);
    expect(serialized).not.toContain('John Smith');
    expect(serialized).not.toContain('123-45-6789');
    expect(serialized).not.toContain('john@acme.com');
    expect(serialized).not.toContain('4111-2222-3333-4444');
    expect(serialized).not.toContain('2025-02-14');
    expect(serialized).not.toContain('Ferritin');
    expect(serialized).not.toContain('Net Monthly Burn');
    expect(serialized).not.toContain('135000');
    expect(serialized).not.toContain('120000');
    expect(serialized).not.toContain('14 ng/mL');
    expect(serialized).not.toContain('22 ng/mL');
  });
});
