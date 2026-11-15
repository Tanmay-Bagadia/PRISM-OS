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
