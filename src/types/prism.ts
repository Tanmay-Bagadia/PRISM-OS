// ─── Cognitive Posture ───────────────────────────────────────────────
export type CognitivePosture = 'vault' | 'balanced' | 'frontier';

// ─── Inference Source (from Firebase AI Logic SDK) ───────────────────
export type InferenceSource = 'ON_DEVICE' | 'IN_CLOUD';

// ─── Cache Status ────────────────────────────────────────────────────
export type CacheStatus = 'hit' | 'miss' | 'none';

// ─── Per-Stage Telemetry ─────────────────────────────────────────────
export interface StageTelemetry {
  stageName: 'extract-topology' | 'cloud-blueprint' | 'hydrate-local';
  inferenceSource: InferenceSource;
  latencyMs: number;
  bytesSentToCloud: number;
  cacheStatus: CacheStatus;
  fallbackUsed: boolean;
  payloadPreview: string;
}

// ─── Abstract Topology (<2 KB, zero PII) ─────────────────────────────
export interface AbstractTopology {
  schema: 'prism-topology-v1';
  entities: Array<{ id: string; type: string; label: string }>;
  relationships: Array<{ from: string; to: string; kind: string }>;
  constraints: string[];
}

// ─── Reasoning Blueprint (returned by Cloud Gemini) ──────────────────
export interface ReasoningBlueprint {
  schema: 'prism-blueprint-v1';
  goal: string;
  steps: Array<{ id: string; action: string; inputs: string[]; output: string }>;
}

// ─── Pre-loaded Scenario File ────────────────────────────────────────
export interface ScenarioFile {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'health' | 'finance' | 'legal';
}

// ─── Pipeline Output ─────────────────────────────────────────────────
export interface PrismPipelineOutput {
  topology: AbstractTopology;
  blueprint: ReasoningBlueprint;
  hydratedReport: string;
  telemetry: [StageTelemetry, StageTelemetry, StageTelemetry];
}

// ─── Nano Availability ───────────────────────────────────────────────
export type NanoDownloadStatus = 'unavailable' | 'downloading' | 'available' | 'error';

export interface NanoAvailability {
  supported: boolean;
  status: NanoDownloadStatus;
  downloadProgress: number; // 0–1
  error?: string;
}

// ─── Device Context (for Router) ─────────────────────────────────────
export interface DeviceContext {
  batteryLevel: number;   // 0–1
  networkRttMs: number;   // round-trip time in ms
  nanoAvailable: boolean;
  online: boolean;
}

// ─── Remote Config Thresholds ────────────────────────────────────────
export interface RemoteThresholds {
  minBatteryForCloud: number;   // 0–1
  maxRttForCloud: number;       // ms
  vaultForceLocal: boolean;
  frontierForceCloud: boolean;
}

// ─── Router Decision ─────────────────────────────────────────────────
export interface RouterDecision {
  effectivePosture: CognitivePosture;
  useNano: boolean;
  useCloud: boolean;
  reason: string;
}
