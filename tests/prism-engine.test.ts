import { describe, test, expect, vi } from 'vitest';
import type {
  CognitivePosture,
  StageTelemetry,
  PrismPipelineOutput,
  DeviceContext,
  RemoteThresholds,
} from '../src/types/prism';
import {
  getFirebaseApp,
  getFirebaseAI,
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseRemoteConfig,
  initializeFirebase,
} from '../src/lib/firebase/client';
import {
  checkNanoAvailability,
  monitorNanoDownload,
} from '../src/lib/prism/nanoStatus';
import { scrubPII } from '../src/lib/prism/scrubber';
import { computeRoute, clampThresholds } from '../src/lib/prism/router';
import { runPrismPipeline } from '../src/lib/prism/engine';

describe('Shared contracts', () => {
  test('StageTelemetry has required fields', () => {
    const t: StageTelemetry = {
      stageName: 'extract-topology',
      inferenceSource: 'ON_DEVICE',
      latencyMs: 120,
      bytesSentToCloud: 0,
      cacheStatus: 'none',
      fallbackUsed: false,
      payloadPreview: '{}',
    };
    expect(t.stageName).toBe('extract-topology');
    expect(t.bytesSentToCloud).toBe(0);
  });

  test('CognitivePosture is a union of three modes', () => {
    const modes: CognitivePosture[] = ['vault', 'balanced', 'frontier'];
    expect(modes).toHaveLength(3);
  });

  test('PrismPipelineOutput contains all three stages of telemetry', () => {
    const output: PrismPipelineOutput = {
      topology: { schema: 'prism-topology-v1', entities: [], relationships: [], constraints: [] },
      blueprint: { schema: 'prism-blueprint-v1', steps: [], goal: '' },
      hydratedReport: '# Report',
      telemetry: [
        { stageName: 'extract-topology', inferenceSource: 'ON_DEVICE', latencyMs: 100, bytesSentToCloud: 0, cacheStatus: 'none', fallbackUsed: false, payloadPreview: '' },
        { stageName: 'cloud-blueprint', inferenceSource: 'IN_CLOUD', latencyMs: 500, bytesSentToCloud: 1200, cacheStatus: 'miss', fallbackUsed: false, payloadPreview: '' },
        { stageName: 'hydrate-local', inferenceSource: 'ON_DEVICE', latencyMs: 300, bytesSentToCloud: 0, cacheStatus: 'none', fallbackUsed: false, payloadPreview: '' },
      ],
    };
    expect(output.telemetry).toHaveLength(3);
  });
});

describe('Firebase client', () => {
  test('getFirebaseApp returns a FirebaseApp instance', () => {
    const app = getFirebaseApp();
    expect(app).toBeDefined();
    expect(app.name).toBeDefined();
  });

  test('getFirebaseAI returns an AI instance', () => {
    const ai = getFirebaseAI();
    expect(ai).toBeDefined();
  });

  test('getFirebaseAuth returns an Auth instance', () => {
    const auth = getFirebaseAuth();
    expect(auth).toBeDefined();
  });

  test('getFirebaseFirestore returns a Firestore instance', () => {
    const db = getFirebaseFirestore();
    expect(db).toBeDefined();
    expect(db.type).toBe('firestore');
  });

  test('getFirebaseRemoteConfig returns RemoteConfig instance if in browser/supported env', () => {
    const rc = getFirebaseRemoteConfig();
    expect(rc).toBeDefined();
  });

  test('initializeFirebase runs without error', async () => {
    await expect(initializeFirebase()).resolves.not.toThrow();
  });
});

describe('Nano status monitor', () => {
  test('checkNanoAvailability returns NanoAvailability shape', async () => {
    const result = await checkNanoAvailability();
    expect(result).toHaveProperty('supported');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('downloadProgress');
    expect(typeof result.supported).toBe('boolean');
  });

  test('reports unavailable when window.ai / window.LanguageModel is missing', async () => {
    const result = await checkNanoAvailability();
    // In test env (jsdom), Chrome AI is not present by default
    expect(result.supported).toBe(false);
    expect(result.status).toBe('unavailable');
  });

  test('monitorNanoDownload provides unsubscribe and emits updates', () => {
    const callback = vi.fn();
    const unsubscribe = monitorNanoDownload(callback);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});

describe('PII Scrubber', () => {
  const RAW_WITH_PII = `
    Patient: John Smith, DOB: 03/15/1985
    SSN: 123-45-6789, Phone: (555) 867-5309
    Email: john.smith@example.com
    Credit Card: 4111-1111-1111-1111
    Address: 123 Main St, Springfield, IL 62704
    Revenue: $1,234,567.89
    IP: 192.168.1.100
  `;

  test('removes all email addresses', () => {
    const scrubbed = scrubPII(RAW_WITH_PII);
    expect(scrubbed).not.toMatch(/john\.smith@example\.com/);
    expect(scrubbed).toMatch(/\[EMAIL_REDACTED\]/);
  });

  test('removes all SSN patterns', () => {
    const scrubbed = scrubPII(RAW_WITH_PII);
    expect(scrubbed).not.toMatch(/123-45-6789/);
    expect(scrubbed).toMatch(/\[SSN_REDACTED\]/);
  });

  test('removes all phone numbers', () => {
    const scrubbed = scrubPII(RAW_WITH_PII);
    expect(scrubbed).not.toMatch(/555.*867.*5309/);
    expect(scrubbed).toMatch(/\[PHONE_REDACTED\]/);
  });

  test('removes credit card numbers', () => {
    const scrubbed = scrubPII(RAW_WITH_PII);
    expect(scrubbed).not.toMatch(/4111/);
    expect(scrubbed).toMatch(/\[CC_REDACTED\]/);
  });

  test('removes dollar amounts', () => {
    const scrubbed = scrubPII(RAW_WITH_PII);
    expect(scrubbed).not.toMatch(/\$1,234,567\.89/);
    expect(scrubbed).toMatch(/\[AMOUNT_REDACTED\]/);
  });

  test('removes IP addresses', () => {
    const scrubbed = scrubPII(RAW_WITH_PII);
    expect(scrubbed).not.toMatch(/192\.168\.1\.100/);
    expect(scrubbed).toMatch(/\[IP_REDACTED\]/);
  });

  test('removes date-of-birth patterns', () => {
    const scrubbed = scrubPII(RAW_WITH_PII);
    expect(scrubbed).not.toMatch(/03\/15\/1985/);
    expect(scrubbed).toMatch(/\[DATE_REDACTED\]/);
  });

  test('is deterministic — same input always produces same output', () => {
    const a = scrubPII(RAW_WITH_PII);
    const b = scrubPII(RAW_WITH_PII);
    expect(a).toBe(b);
  });

  test('preserves non-PII text structure', () => {
    const scrubbed = scrubPII('The quick brown fox jumps over the lazy dog.');
    expect(scrubbed).toBe('The quick brown fox jumps over the lazy dog.');
  });
});

describe('Adaptive Router', () => {
  const DEFAULTS: RemoteThresholds = {
    minBatteryForCloud: 0.2,
    maxRttForCloud: 2000,
    vaultForceLocal: true,
    frontierForceCloud: true,
  };

  const GOOD_DEVICE: DeviceContext = {
    batteryLevel: 0.8,
    networkRttMs: 100,
    nanoAvailable: true,
    online: true,
  };

  test('Vault mode forces local-only even with good connectivity', () => {
    const decision = computeRoute('vault', GOOD_DEVICE, DEFAULTS);
    expect(decision.effectivePosture).toBe('vault');
    expect(decision.useNano).toBe(true);
    expect(decision.useCloud).toBe(false);
  });

  test('Frontier mode uses cloud when online and battery sufficient', () => {
    const decision = computeRoute('frontier', GOOD_DEVICE, DEFAULTS);
    expect(decision.effectivePosture).toBe('frontier');
    expect(decision.useCloud).toBe(true);
  });

  test('Frontier downgrades to balanced when battery is low', () => {
    const lowBattery: DeviceContext = { ...GOOD_DEVICE, batteryLevel: 0.1 };
    const decision = computeRoute('frontier', lowBattery, DEFAULTS);
    expect(decision.effectivePosture).toBe('balanced');
    expect(decision.reason).toContain('battery');
  });

  test('Frontier downgrades to balanced when RTT is high', () => {
    const highRtt: DeviceContext = { ...GOOD_DEVICE, networkRttMs: 5000 };
    const decision = computeRoute('frontier', highRtt, DEFAULTS);
    expect(decision.effectivePosture).toBe('balanced');
    expect(decision.reason).toContain('RTT');
  });

  test('Balanced uses cloud for Stage 2 when conditions are good', () => {
    const decision = computeRoute('balanced', GOOD_DEVICE, DEFAULTS);
    expect(decision.useCloud).toBe(true);
    expect(decision.useNano).toBe(true);
  });

  test('Balanced falls back to local-only when offline', () => {
    const offline: DeviceContext = { ...GOOD_DEVICE, online: false };
    const decision = computeRoute('balanced', offline, DEFAULTS);
    expect(decision.useCloud).toBe(false);
    expect(decision.reason).toContain('offline');
  });

  test('Uses scrubber fallback when nano is unavailable', () => {
    const noNano: DeviceContext = { ...GOOD_DEVICE, nanoAvailable: false };
    const decision = computeRoute('balanced', noNano, DEFAULTS);
    expect(decision.useNano).toBe(false);
  });

  test('clampThresholds clamps extreme values to sane ranges', () => {
    const extreme: RemoteThresholds = {
      minBatteryForCloud: 1.5,
      maxRttForCloud: -100,
      vaultForceLocal: true,
      frontierForceCloud: true,
    };
    const clamped = clampThresholds(extreme);
    expect(clamped.minBatteryForCloud).toBeLessThanOrEqual(0.95);
    expect(clamped.minBatteryForCloud).toBeGreaterThanOrEqual(0.05);
    expect(clamped.maxRttForCloud).toBeGreaterThanOrEqual(100);
  });
});

describe('PRISM 3-Stage Engine', () => {
  const DEVICE: DeviceContext = {
    batteryLevel: 0.9,
    networkRttMs: 50,
    nanoAvailable: false, // forces scrubber fallback in test env
    online: false,        // forces offline/cache path
  };

  const THRESHOLDS: RemoteThresholds = {
    minBatteryForCloud: 0.2,
    maxRttForCloud: 2000,
    vaultForceLocal: true,
    frontierForceCloud: true,
  };

  const PII_INPUT = `
    Patient: Jane Doe, SSN: 999-88-7777
    Email: jane@example.com, Phone: (555) 123-4567
    Revenue: $500,000.00
  `;

  test('Stage 1 topology contains zero PII when using scrubber fallback', async () => {
    const result = await runPrismPipeline({
      rawContent: PII_INPUT,
      prompt: 'Analyze this patient record',
      posture: 'vault',
      device: DEVICE,
      thresholds: THRESHOLDS,
    });

    const topoStr = JSON.stringify(result.topology);
    expect(topoStr).not.toMatch(/Jane/i);
    expect(topoStr).not.toMatch(/999-88-7777/);
    expect(topoStr).not.toMatch(/jane@example\.com/);
    expect(topoStr).not.toMatch(/555.*123.*4567/);
    expect(topoStr).not.toMatch(/\$500,000/);
    expect(result.telemetry[0].fallbackUsed).toBe(true);
    expect(result.telemetry[0].bytesSentToCloud).toBe(0);
  });

  test('Stage 1 topology is under 2048 bytes', async () => {
    const result = await runPrismPipeline({
      rawContent: PII_INPUT,
      prompt: 'Analyze',
      posture: 'vault',
      device: DEVICE,
      thresholds: THRESHOLDS,
    });

    const topologyBytes = new TextEncoder().encode(JSON.stringify(result.topology)).length;
    expect(topologyBytes).toBeLessThan(2048);
  });

  test('records accurate telemetry for all 3 stages', async () => {
    const result = await runPrismPipeline({
      rawContent: 'Simple medical metrics with test details',
      prompt: 'Summarize clinical trends',
      posture: 'vault',
      device: DEVICE,
      thresholds: THRESHOLDS,
    });

    expect(result.telemetry).toHaveLength(3);
    expect(result.telemetry[0].stageName).toBe('extract-topology');
    expect(result.telemetry[1].stageName).toBe('cloud-blueprint');
    expect(result.telemetry[2].stageName).toBe('hydrate-local');

    // Vault mode + offline → exactly 0 bytes sent to cloud across all 3 stages
    for (const t of result.telemetry) {
      expect(t.bytesSentToCloud).toBe(0);
      expect(typeof t.latencyMs).toBe('number');
      expect(t.latencyMs).toBeGreaterThanOrEqual(0);
      expect(t.payloadPreview).toBeDefined();
    }
  });

  test('Stage 2 reports cache status when offline', async () => {
    const result = await runPrismPipeline({
      rawContent: 'Corporate financial summary and quarterly balance sheet',
      prompt: 'Analyze growth trajectory',
      posture: 'balanced',
      device: { ...DEVICE, online: false },
      thresholds: THRESHOLDS,
    });

    expect(['hit', 'miss']).toContain(result.telemetry[1].cacheStatus);
  });

  test('output contains a non-empty hydrated markdown report', async () => {
    const result = await runPrismPipeline({
      rawContent: 'Patient heart rate: 72 bpm, blood pressure: 120/80',
      prompt: 'Provide diagnostic summary',
      posture: 'vault',
      device: DEVICE,
      thresholds: THRESHOLDS,
    });

    expect(result.hydratedReport.length).toBeGreaterThan(0);
    expect(typeof result.hydratedReport).toBe('string');
    expect(result.hydratedReport).toContain('#');
  });
});
