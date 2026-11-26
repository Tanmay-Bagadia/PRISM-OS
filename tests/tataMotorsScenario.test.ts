import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearVaultSessions,
  createVaultFolder,
  deleteVaultFolder,
  listVaultFolders,
  listVaultSessions,
  moveSessionToFolder,
  saveVaultSession,
} from '../src/lib/storage/localHistoryVault.ts';
import {
  buildAnonymizedDiffTopology,
  computeMetricDeltas,
  extractMetricsFromReport,
} from '../src/lib/prism/diffEngine.ts';
import {
  buildAnonymizedBenchmarkTopology,
  extractSubjectRatios,
  parseUserReferenceData,
} from '../src/lib/prism/benchmarkExtractor.ts';
import { hydrateBenchmarkFindings } from '../src/lib/prism/benchmarkHydrator.ts';
import type { VaultSession } from '../src/types/longitudinal.ts';

const Q4_FY26_BRIEF = [
  'Tata Motors Ltd — Q4 FY26 Internal Review',
  'Prepared by: GV Ramanan | Approved by: Girish Wagh',
  'Treasury Account: HDFC-CORP-99201482 | Doc ID: TML-FIN-Q4FY26-4410',
  'Standalone Revenue: ₹24,500 Crore',
  'Standalone EBITDA Margin: 13.9%',
  'Consolidated Net Cash Balance: ₹13,700 Crore',
].join('\n');

const Q2_FY27_BRIEF = [
  'Tata Motors Ltd — Q2 FY27 Internal Review',
  'Prepared by: GV Ramanan | Approved by: Girish Wagh',
  'Treasury Account: HDFC-CORP-99201482 | Doc ID: TML-FIN-Q2FY27-8841',
  'Standalone Revenue: ₹26,100 Crore',
  'Standalone EBITDA Margin: 11.7%',
  'Consolidated EBITDA Margin: 12.1%',
  'Free Cash Flow Conversion: 9.8%',
  'Consolidated Net Cash Balance: ₹15,900 Crore',
].join('\n');

const REFERENCE_SOURCE_TITLE = 'Tata Motors FY26 Annual Report & Mid-Term Guidance Targets';
const REFERENCE_TEXT = [
  'Target Standalone EBITDA Margin: 13.9%',
  'Target Consolidated EBITDA Margin: 13.1%',
  'Target Free Cash Flow Conversion: 12.0%',
].join('\n');

describe('Tata Motors End-to-End Multi-Run Workflow', () => {
  beforeEach(async () => {
    await clearVaultSessions();
    const existingFolders = await listVaultFolders();
    for (const folder of existingFolders) {
      await deleteVaultFolder(folder.id);
    }
  });

  it('persists Q4 FY26 and Q2 FY27 in Tata Motors folder, grounds cited benchmarks with zero PII, and computes accurate longitudinal deltas', async () => {
    // 1. Baseline Session (Q4 FY26) & Folder Organization
    const q4Metrics = extractMetricsFromReport('', Q4_FY26_BRIEF);
    expect(q4Metrics.length).toBeGreaterThanOrEqual(3);

    const q4Session: VaultSession = {
      id: 'tml_q4_fy26',
      timestamp: '2026-05-15T10:00:00.000Z',
      title: 'Q4 FY26',
      domainTag: 'financial',
      folderId: null,
      metrics: q4Metrics,
      rawSnippet: Q4_FY26_BRIEF.slice(0, 120),
      hydratedReport: Q4_FY26_BRIEF,
    };

    await saveVaultSession(q4Session);
    const tmlFolder = await createVaultFolder('Tata Motors');
    await moveSessionToFolder(q4Session.id, tmlFolder.id);

    // Simulate "New Session" workspace reset (without calling clearVaultSessions())
    const foldersAfterReset = await listVaultFolders();
    const sessionsAfterReset = await listVaultSessions();
    expect(foldersAfterReset).toHaveLength(1);
    expect(foldersAfterReset[0]?.name).toBe('Tata Motors');
    expect(sessionsAfterReset).toHaveLength(1);
    expect(sessionsAfterReset[0]?.id).toBe('tml_q4_fy26');
    expect(sessionsAfterReset[0]?.folderId).toBe(tmlFolder.id);

    // 2. Target Session (Q2 FY27) & Cited Benchmark Grounding
    const subjectRatios = extractSubjectRatios(Q2_FY27_BRIEF, '');
    const referenceMetrics = parseUserReferenceData(REFERENCE_TEXT, REFERENCE_SOURCE_TITLE);
    expect(referenceMetrics).toHaveLength(3);
    expect(referenceMetrics.every((m) => m.sourceCitation === REFERENCE_SOURCE_TITLE)).toBe(true);

    const topology = buildAnonymizedBenchmarkTopology(
      subjectRatios,
      referenceMetrics,
      REFERENCE_SOURCE_TITLE,
    );
    const serializedTopology = JSON.stringify(topology);

    // Assert zero PII or raw ₹ Crore amounts in BenchmarkTopology
    expect(serializedTopology).not.toContain('GV Ramanan');
    expect(serializedTopology).not.toContain('Girish Wagh');
    expect(serializedTopology).not.toContain('HDFC-CORP-99201482');
    expect(serializedTopology).not.toContain('TML-FIN-Q2FY27-8841');
    expect(serializedTopology).not.toContain('24,500');
    expect(serializedTopology).not.toContain('26,100');
    expect(serializedTopology).not.toContain('13,700');
    expect(serializedTopology).not.toContain('15,900');
    expect(serializedTopology).not.toContain('₹');

    const findings = hydrateBenchmarkFindings(topology, subjectRatios, []);
    expect(findings.length).toBeGreaterThanOrEqual(3);
    for (const finding of findings) {
      expect(finding.sourceCitation).toBe(REFERENCE_SOURCE_TITLE);
      expect(finding.sourceType).toBe('USER_SUPPLIED');
    }

    // 3. 2-Run Longitudinal Diff (Q4 FY26 -> Q2 FY27)
    const q2Metrics = extractMetricsFromReport('', Q2_FY27_BRIEF);
    const q2Session: VaultSession = {
      id: 'tml_q2_fy27',
      timestamp: '2026-11-26T10:00:00.000Z',
      title: 'Q2 FY27',
      domainTag: 'financial',
      folderId: tmlFolder.id,
      metrics: q2Metrics,
      rawSnippet: Q2_FY27_BRIEF.slice(0, 120),
      hydratedReport: Q2_FY27_BRIEF,
    };
    await saveVaultSession(q2Session);

    const savedSessions = await listVaultSessions();
    const retrievedQ4 = savedSessions.find((s) => s.id === 'tml_q4_fy26');
    const retrievedQ2 = savedSessions.find((s) => s.id === 'tml_q2_fy27');
    expect(retrievedQ4).toBeDefined();
    expect(retrievedQ2).toBeDefined();

    const deltas = computeMetricDeltas(retrievedQ4!.metrics, retrievedQ2!.metrics);

    const ebitdaDelta = deltas.find((d) => d.metricName === 'Standalone EBITDA Margin');
    expect(ebitdaDelta).toBeDefined();
    expect(ebitdaDelta?.previousDisplay).toBe('13.9%');
    expect(ebitdaDelta?.currentDisplay).toBe('11.7%');
    expect(ebitdaDelta?.direction).toBe('WORSENED');

    const cashDelta = deltas.find((d) => d.metricName === 'Consolidated Net Cash Balance');
    expect(cashDelta).toBeDefined();
    expect(cashDelta?.absoluteChange).toBe(2200);
    expect(cashDelta?.percentChange).toBeCloseTo(16.1, 1);
    expect(cashDelta?.direction).toBe('IMPROVED');

    const diffTopology = buildAnonymizedDiffTopology(deltas, 'Q4 FY26 vs Q2 FY27');
    const serializedDiff = JSON.stringify(diffTopology);
    expect(serializedDiff).not.toContain('GV Ramanan');
    expect(serializedDiff).not.toContain('Girish Wagh');
    expect(serializedDiff).not.toContain('HDFC-CORP-99201482');
    expect(serializedDiff).not.toContain('TML-FIN-Q2FY27-8841');
    expect(serializedDiff).not.toContain('13,700');
    expect(serializedDiff).not.toContain('15,900');
    expect(serializedDiff).not.toContain('₹');
  });
});
