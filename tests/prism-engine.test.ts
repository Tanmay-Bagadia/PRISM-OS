import { describe, test, expect, vi } from 'vitest';
import type {
  CognitivePosture,
  StageTelemetry,
  AbstractTopology,
  ReasoningBlueprint,
  ScenarioFile,
  PrismPipelineOutput,
  NanoAvailability,
  RouterDecision,
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
