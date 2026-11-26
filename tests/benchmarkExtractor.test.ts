import { describe, expect, it } from 'vitest';
import {
  buildAnonymizedBenchmarkTopology,
  extractSubjectRatios,
  parseUserReferenceData,
} from '../src/lib/prism/benchmarkExtractor';
import { containsPotentialPII } from '../src/lib/prism/scrubber';

describe('benchmarkExtractor', () => {
  it('dynamically extracts percentages, rates, multipliers, and paired numerator/denominator ratios', () => {
    const hydratedReport = [
      'Patient: Alice Mercer',
      'Date: 2026-04-12',
      'Conversion Rate: 32%',
      'Buffer Duration: 10.25 months',
      'Coverage Multiple: 1.8x',
      '| Indicator | Reading |',
      '| --- | --- |',
      '| Electrolyte Concentration | 3.3 mEq/L |',
      '| Allocation Split | 45 / 150 |',
    ].join('\n');

    const rawContent = [
      'conversion rate: 99%', // duplicate normalized label -> hydratedReport wins
      'Reserve Numerator: $450,000',
      'Reserve Denominator: $45,000',
      'Inline Efficiency — Numerator: $120,000, Denominator: $400,000',
      'Standalone Cash: $980,000', // raw currency should not be emitted as a ratio
      'SSN: 123-45-6789',
    ].join('\n');

    const ratios = extractSubjectRatios(rawContent, hydratedReport);

    expect(ratios).toEqual([
      {
        ratioKey: 'Ratio_1',
        label: 'Conversion Rate',
        value: 32,
        unit: '%',
      },
      {
        ratioKey: 'Ratio_2',
        label: 'Buffer Duration',
        value: 10.25,
        unit: 'months',
      },
      {
        ratioKey: 'Ratio_3',
        label: 'Coverage Multiple',
        value: 1.8,
        unit: 'x',
      },
      {
        ratioKey: 'Ratio_4',
        label: 'Electrolyte Concentration',
        value: 3.3,
        unit: 'mEq/L',
      },
      {
        ratioKey: 'Ratio_5',
        label: 'Allocation Split',
        value: 0.3,
        unit: 'ratio',
        rawNumerator: 45,
        rawDenominator: 150,
      },
      {
        ratioKey: 'Ratio_6',
        label: 'Reserve Ratio',
        value: 10,
        unit: 'ratio',
        rawNumerator: 450000,
        rawDenominator: 45000,
      },
      {
        ratioKey: 'Ratio_7',
        label: 'Inline Efficiency',
        value: 0.3,
        unit: 'ratio',
        rawNumerator: 120000,
        rawDenominator: 400000,
      },
    ]);
  });

  it('parses user reference data across key-value, markdown table, CSV, and JSON formats with sourceCitation', () => {
    const kvAndTable = [
      'Conversion Rate: 28% (median: 22%, top quartile: 35%)',
      'Buffer Duration: 9 - 15 months',
      '',
      '| Metric | Target | Peer Median | Top Quartile | Unit |',
      '| --- | --- | --- | --- | --- |',
      '| Coverage Multiple | 2.0 | 1.5 | 2.8 | x |',
    ].join('\n');

    const parsedWithTitle = parseUserReferenceData(kvAndTable, 'Q1 Cross-Industry Study');
    expect(parsedWithTitle).toEqual([
      {
        metricKey: 'Metric_1',
        label: 'Conversion Rate',
        targetValue: 28,
        peerMedian: 22,
        topQuartile: 35,
        unit: '%',
        sourceCitation: 'Q1 Cross-Industry Study',
      },
      {
        metricKey: 'Metric_2',
        label: 'Buffer Duration',
        targetValue: 12,
        unit: 'months',
        sourceCitation: 'Q1 Cross-Industry Study',
      },
      {
        metricKey: 'Metric_3',
        label: 'Coverage Multiple',
        targetValue: 2,
        peerMedian: 1.5,
        topQuartile: 2.8,
        unit: 'x',
        sourceCitation: 'Q1 Cross-Industry Study',
      },
    ]);

    const csvInput = [
      'Metric,Target,Median,Top Quartile,Unit',
      'Throughput Index,85,72,94,pts',
    ].join('\n');

    const parsedUntitledCsv = parseUserReferenceData(csvInput, '   ');
    expect(parsedUntitledCsv).toEqual([
      {
        metricKey: 'Metric_1',
        label: 'Throughput Index',
        targetValue: 85,
        peerMedian: 72,
        topQuartile: 94,
        unit: 'pts',
        sourceCitation: 'User-Supplied Reference',
      },
    ]);

    const jsonInput = JSON.stringify([
      { label: 'Utilization Rate', target: '75%', median: '65%', topQuartile: '88%' },
    ]);
    const parsedJson = parseUserReferenceData(jsonInput, 'Internal Ops Guide');
    expect(parsedJson).toEqual([
      {
        metricKey: 'Metric_1',
        label: 'Utilization Rate',
        targetValue: 75,
        peerMedian: 65,
        topQuartile: 88,
        unit: '%',
        sourceCitation: 'Internal Ops Guide',
      },
    ]);
  });

  it('builds a zero-PII BenchmarkTopology stripping names, emails, SSNs, orgs, and raw dollar amounts', () => {
    const rawContent = [
      'Client: Jordan Vance',
      'Email: jordan.vance@northstar-labs.io',
      'SSN: 987-65-4321',
      'Reserve Numerator: $450,000',
      'Reserve Denominator: $45,000',
    ].join('\n');

    const hydratedReport = [
      'Organization: Northstar Systems Inc.',
      'Conversion Rate: 32%',
    ].join('\n');

    const ratios = extractSubjectRatios(rawContent, hydratedReport);
    const refs = parseUserReferenceData(
      'Northstar Systems Inc. Target Ratio: 12x\nPatient: Jordan Vance Benchmark: 25%',
      'Report for jordan.vance@northstar-labs.io ($500,000)'
    );

    const topology = buildAnonymizedBenchmarkTopology(
      ratios,
      refs,
      'Northstar Systems Inc. 2026-04-12 Benchmark ($500,000)'
    );

    expect(topology.schema).toBe('prism-benchmark-v1');
    expect(topology.subjectRatios).toEqual([
      { ratioKey: 'Ratio_1', label: 'Ratio_1', value: 32, unit: '%' },
      { ratioKey: 'Ratio_2', label: 'Ratio_2', value: 10, unit: 'ratio' },
    ]);

    const serialized = JSON.stringify(topology);
    expect(containsPotentialPII(serialized)).toBe(false);
    expect(serialized).not.toContain('Jordan Vance');
    expect(serialized).not.toContain('jordan.vance@northstar-labs.io');
    expect(serialized).not.toContain('987-65-4321');
    expect(serialized).not.toContain('450000');
    expect(serialized).not.toContain('45,000');
    expect(serialized).not.toContain('$500,000');
    expect(serialized).not.toContain('Northstar Systems Inc.');
    expect(serialized).not.toContain('rawNumerator');
    expect(serialized).not.toContain('rawDenominator');
  });
});
