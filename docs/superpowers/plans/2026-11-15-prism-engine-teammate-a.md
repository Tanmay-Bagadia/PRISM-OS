# PRISM-OS Teammate A Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Teammate A backend: shared TypeScript contracts, Firebase initialization, Gemini Nano monitor, PII scrubber, adaptive router, 3-stage PRISM engine, Firestore security rules, and Vitest unit tests.

**Architecture:** A 3-stage privacy-preserving pipeline. Stage 1 uses on-device Gemini Nano 4 (or a deterministic local scrubber fallback) to extract an anonymized `<2 KB` topology from raw files. Stage 2 sends only that topology to Cloud Gemini for a structured JSON blueprint, cached in Firestore with offline persistence. Stage 3 uses on-device Nano to hydrate the blueprint against raw files into a Markdown report. An Adaptive Utility Router selects execution mode based on a Cognitive Posture Dial, battery, RTT, and Nano availability.

**Tech Stack:** React 19, TypeScript (strict), Vite, Firebase v13+ (`firebase/ai`, `firebase/firestore`, `firebase/auth`, `firebase/app-check`, `firebase/remote-config`), Vitest, Tailwind CSS.

**Spec:** `.antigravity/rules.md`

## Global Constraints

- All generative AI calls go through `firebase/ai` (`getAI` with `GoogleAIBackend`, `getGenerativeModel`). No direct REST calls to `generativelanguage.googleapis.com`.
- Stage 1 & 3 use `InferenceMode.ONLY_ON_DEVICE`; Stage 2 uses `InferenceMode.PREFER_IN_CLOUD` with `inCloudParams: { model: "gemini-3.5-flash-lite" }`.
- Capture `result.response.inferenceSource` (`"ON_DEVICE"` | `"IN_CLOUD"`) on every stage.
- Teammate A MUST NOT create or modify any file owned by Teammate B (components/, data/scenarios.ts, App.tsx, index.css).
- Firebase v13+; `firebase/ai` as the AI Logic SDK.
- TypeScript strict mode. Vitest for tests.
- Pre-completion: `npm run typecheck && npm run build && npm test` must all pass.

## Review Focus

1. **Stage 1 topology exceeds 2 KB** — A large input file could produce a topology > 2 KB if the extraction prompt is loose. The engine should enforce a byte-size cap and truncate/reject oversized topologies. _Test: `engine.test.ts` asserts topology < 2048 bytes._
2. **PII leaking through scrubber gaps** — The deterministic scrubber misses a PII pattern (phone number variant, ID format) and raw data reaches Stage 2. _Test: `engine.test.ts` asserts scrubber output contains zero PII markers from a fixture with known PII._
3. **Offline cache miss with no network** — Firestore cache has no matching blueprint and network is down; Stage 2 must surface a clear "no cached blueprint" error, not hang. _Test: `engine.test.ts` asserts graceful error on cache miss._
4. **Battery/RTT thresholds misconfigured via Remote Config** — Extreme Remote Config values (battery threshold 100%, RTT 0ms) could make the router always choose Vault mode. Router should clamp thresholds to sane ranges. _Test: `router.test.ts` (inside engine test file) asserts clamping._
5. **Nano availability flap** — Nano reports available then immediately fails on `generateContent`. The engine should catch the runtime error and fall back to scrubber. _Test: `engine.test.ts` asserts fallback triggers on Nano runtime failure._

---

### Task 0: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `.env.example`

**Interfaces:**
- Produces: Working `npm run typecheck`, `npm run build`, `npm test` commands; Vite dev server; Vitest runner.

- [ ] **Step 1: Initialize the Vite + React + TypeScript project**

```bash
cd /Users/tanmay1301/PRISM-OS
npm create vite@latest . -- --template react-ts
```

Accept overwrite if prompted. This creates `package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, etc.

- [ ] **Step 2: Install Firebase and test dependencies**

```bash
npm install firebase@latest
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Add scripts to `package.json`**

Add to `"scripts"`:
```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create `.env.example`**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_APPCHECK_DEBUG_TOKEN=
```

- [ ] **Step 6: Enable strict mode in `tsconfig.json`**

Ensure `"strict": true` is set in compiler options. Add `"skipLibCheck": true` for Firebase compatibility.

- [ ] **Step 7: Verify scaffolding**

Run: `npm run typecheck && npm run build`
Expected: Both exit 0 with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Firebase + Vitest"
```

---

### Task 1: Shared TypeScript Contracts (`src/types/prism.ts`)

**Files:**
- Create: `src/types/prism.ts`

**Interfaces:**
- Produces: All types consumed by every subsequent task: `CognitivePosture`, `StageTelemetry`, `AbstractTopology`, `ReasoningBlueprint`, `ScenarioFile`, `PrismPipelineOutput`, `NanoAvailability`, `RouterDecision`, `PostureDial`, `DeviceContext`, `RemoteThresholds`.

- [ ] **Step 1: Write the failing test**

Create `tests/prism-engine.test.ts` with an import-only test:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: FAIL — cannot resolve `../src/types/prism`

- [ ] **Step 3: Implement `src/types/prism.ts`**

Define these exact types:

```ts
export type CognitivePosture = 'vault' | 'balanced' | 'frontier';

export type InferenceSource = 'ON_DEVICE' | 'IN_CLOUD';

export type CacheStatus = 'hit' | 'miss' | 'none';

export interface StageTelemetry {
  stageName: 'extract-topology' | 'cloud-blueprint' | 'hydrate-local';
  inferenceSource: InferenceSource;
  latencyMs: number;
  bytesSentToCloud: number;
  cacheStatus: CacheStatus;
  fallbackUsed: boolean;
  payloadPreview: string;
}

export interface AbstractTopology {
  schema: 'prism-topology-v1';
  entities: Array<{ id: string; type: string; label: string }>;
  relationships: Array<{ from: string; to: string; kind: string }>;
  constraints: string[];
}

export interface ReasoningBlueprint {
  schema: 'prism-blueprint-v1';
  goal: string;
  steps: Array<{ id: string; action: string; inputs: string[]; output: string }>;
}

export interface ScenarioFile {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'health' | 'finance' | 'legal';
}

export interface PrismPipelineOutput {
  topology: AbstractTopology;
  blueprint: ReasoningBlueprint;
  hydratedReport: string;
  telemetry: [StageTelemetry, StageTelemetry, StageTelemetry];
}

export type NanoDownloadStatus = 'unavailable' | 'downloading' | 'available' | 'error';

export interface NanoAvailability {
  supported: boolean;
  status: NanoDownloadStatus;
  downloadProgress: number; // 0–1
  error?: string;
}

export interface DeviceContext {
  batteryLevel: number;   // 0–1
  networkRttMs: number;   // round-trip time in ms
  nanoAvailable: boolean;
  online: boolean;
}

export interface RemoteThresholds {
  minBatteryForCloud: number;   // 0–1
  maxRttForCloud: number;       // ms
  vaultForceLocal: boolean;
  frontierForceCloud: boolean;
}

export interface RouterDecision {
  effectivePosture: CognitivePosture;
  useNano: boolean;
  useCloud: boolean;
  reason: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/types/prism.ts tests/prism-engine.test.ts
git commit -m "feat: add shared TypeScript contracts (prism.ts)"
```

---

### Task 2: Firebase Core & Security (`src/lib/firebase/client.ts` & `firestore.rules`)

**Files:**
- Create: `src/lib/firebase/client.ts`
- Create: `firestore.rules`

**Interfaces:**
- Consumes: Firebase v13+ SDK APIs.
- Produces: `getFirebaseApp(): FirebaseApp`, `getFirebaseAI(): AI`, `getFirebaseAuth(): Auth`, `getFirebaseFirestore(): Firestore`, `getFirebaseRemoteConfig(): RemoteConfig`, `initializeFirebase(): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Append to `tests/prism-engine.test.ts`:

```ts
import { getFirebaseApp, getFirebaseAI, getFirebaseAuth, getFirebaseFirestore } from '../src/lib/firebase/client';

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: FAIL — cannot resolve `../src/lib/firebase/client`

- [ ] **Step 3: Implement `src/lib/firebase/client.ts`**

Initialize Firebase with lazy singleton pattern:
- `initializeApp` with config from `import.meta.env.VITE_*` variables.
- `getAI(app, { backend: new GoogleAIBackend() })` for the AI Logic SDK.
- `initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true })` using `ReCaptchaEnterpriseProvider` in prod or debug token in dev.
- `getAuth(app)` + `signInAnonymously(auth)` for frictionless judge testing.
- `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` for multi-tab offline persistence.
- `getRemoteConfig(app)` with defaults.
- All getters return lazy-initialized singletons.

- [ ] **Step 4: Create `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /blueprints/{blueprintId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.keys().hasAll(['schema', 'goal', 'steps', 'topologyHash'])
        && request.resource.data.schema == 'prism-blueprint-v1';
      allow update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: PASS (Firebase initializes in test env with empty/mock config).

- [ ] **Step 6: Commit**

```bash
git add src/lib/firebase/client.ts firestore.rules
git commit -m "feat: Firebase init with AI Logic, App Check, Anonymous Auth, Firestore offline"
```

---

### Task 3: Gemini Nano Monitor (`src/lib/prism/nanoStatus.ts`)

**Files:**
- Create: `src/lib/prism/nanoStatus.ts`

**Interfaces:**
- Consumes: `NanoAvailability`, `NanoDownloadStatus` from `src/types/prism.ts`.
- Produces: `checkNanoAvailability(): Promise<NanoAvailability>`, `monitorNanoDownload(onProgress: (status: NanoAvailability) => void): () => void`.

- [ ] **Step 1: Write the failing test**

Append to `tests/prism-engine.test.ts`:

```ts
import { checkNanoAvailability } from '../src/lib/prism/nanoStatus';

describe('Nano status monitor', () => {
  test('checkNanoAvailability returns NanoAvailability shape', async () => {
    const result = await checkNanoAvailability();
    expect(result).toHaveProperty('supported');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('downloadProgress');
    expect(typeof result.supported).toBe('boolean');
  });

  test('reports unavailable when window.LanguageModel is missing', async () => {
    const result = await checkNanoAvailability();
    // In test env (jsdom), LanguageModel is never present
    expect(result.supported).toBe(false);
    expect(result.status).toBe('unavailable');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: FAIL — cannot resolve `../src/lib/prism/nanoStatus`

- [ ] **Step 3: Implement `src/lib/prism/nanoStatus.ts`**

Use the Chrome Built-in AI APIs: check `self.ai?.languageModel?.availability()` to detect Nano 4. Monitor download progress via polling `availability()` while status is `'after-download'`. Return `NanoAvailability` with appropriate `status` and `downloadProgress`. Wrap in try-catch; any error produces `{ supported: false, status: 'error', downloadProgress: 0, error: message }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/prism/nanoStatus.ts
git commit -m "feat: Gemini Nano 4 availability checker and download monitor"
```

---

### Task 4: Deterministic PII Scrubber (`src/lib/prism/scrubber.ts`)

**Files:**
- Create: `src/lib/prism/scrubber.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `scrubPII(raw: string): string` — deterministic local function, zero network, replaces all PII patterns with placeholders.

- [ ] **Step 1: Write the failing test**

Append to `tests/prism-engine.test.ts`:

```ts
import { scrubPII } from '../src/lib/prism/scrubber';

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

  test('preserves non-PII text', () => {
    const scrubbed = scrubPII('The quick brown fox');
    expect(scrubbed).toBe('The quick brown fox');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: FAIL — cannot resolve `../src/lib/prism/scrubber`

- [ ] **Step 3: Implement `scrubPII(raw: string): string` in `src/lib/prism/scrubber.ts`**

Apply regex replacements in a fixed order (deterministic):
1. SSN: `/\b\d{3}-\d{2}-\d{4}\b/g` → `[SSN_REDACTED]`
2. Credit card: `/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g` → `[CC_REDACTED]`
3. Email: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g` → `[EMAIL_REDACTED]`
4. Phone: `/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g` → `[PHONE_REDACTED]`
5. IP: `/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g` → `[IP_REDACTED]`
6. Dollar amounts: `/\$[\d,]+(\.\d{2})?/g` → `[AMOUNT_REDACTED]`
7. Dates (MM/DD/YYYY, DD-MM-YYYY, etc.): `/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g` → `[DATE_REDACTED]`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: PASS — all 9 scrubber tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prism/scrubber.ts
git commit -m "feat: deterministic PII scrubber with 7 pattern categories"
```

---

### Task 5: Adaptive Router (`src/lib/prism/router.ts`)

**Files:**
- Create: `src/lib/prism/router.ts`

**Interfaces:**
- Consumes: `CognitivePosture`, `DeviceContext`, `RemoteThresholds`, `RouterDecision` from `src/types/prism.ts`.
- Produces: `computeRoute(posture: CognitivePosture, device: DeviceContext, thresholds: RemoteThresholds): RouterDecision`, `clampThresholds(raw: RemoteThresholds): RemoteThresholds`.

- [ ] **Step 1: Write the failing test**

Append to `tests/prism-engine.test.ts`:

```ts
import { computeRoute, clampThresholds } from '../src/lib/prism/router';
import type { DeviceContext, RemoteThresholds } from '../src/types/prism';

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
    expect(clamped.minBatteryForCloud).toBeLessThanOrEqual(1);
    expect(clamped.minBatteryForCloud).toBeGreaterThanOrEqual(0.05);
    expect(clamped.maxRttForCloud).toBeGreaterThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: FAIL — cannot resolve `../src/lib/prism/router`

- [ ] **Step 3: Implement `src/lib/prism/router.ts`**

Pure functions, no side effects:
- `clampThresholds(raw)`: clamp `minBatteryForCloud` to [0.05, 0.95], `maxRttForCloud` to [100, 30000].
- `computeRoute(posture, device, thresholds)`: Deterministic routing logic:
  - Vault → always local-only, `useCloud: false`.
  - Frontier → check battery >= threshold, RTT <= threshold, online; downgrade to balanced if any fail.
  - Balanced → use cloud for Stage 2 if online + battery ok + RTT ok, otherwise local-only.
  - `useNano` = `device.nanoAvailable` (when false, engine uses scrubber fallback).
  - Return `RouterDecision` with human-readable `reason`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: PASS — all 8 router tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prism/router.ts
git commit -m "feat: adaptive utility router with posture/battery/RTT/nano logic"
```

---

### Task 6: 3-Stage PRISM Engine (`src/lib/prism/engine.ts`)

**Files:**
- Create: `src/lib/prism/engine.ts`

**Interfaces:**
- Consumes: All types from `src/types/prism.ts`; `getFirebaseAI()`, `getFirebaseFirestore()` from `src/lib/firebase/client.ts`; `scrubPII()` from `src/lib/prism/scrubber.ts`; `computeRoute()` from `src/lib/prism/router.ts`; `checkNanoAvailability()` from `src/lib/prism/nanoStatus.ts`.
- Produces: `runPrismPipeline(input: { rawContent: string; prompt: string; posture: CognitivePosture; device: DeviceContext; thresholds: RemoteThresholds }): Promise<PrismPipelineOutput>`.

- [ ] **Step 1: Write the failing test**

Append to `tests/prism-engine.test.ts`:

```ts
import { runPrismPipeline } from '../src/lib/prism/engine';
import type { DeviceContext, RemoteThresholds } from '../src/types/prism';

describe('PRISM 3-Stage Engine', () => {
  // In test env, Nano is unavailable → scrubber fallback is used
  const DEVICE: DeviceContext = {
    batteryLevel: 0.9,
    networkRttMs: 50,
    nanoAvailable: false, // forces scrubber fallback in tests
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
      prompt: 'Analyze this patient data',
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
      rawContent: 'Simple test data with no PII',
      prompt: 'Summarize',
      posture: 'vault',
      device: DEVICE,
      thresholds: THRESHOLDS,
    });

    expect(result.telemetry).toHaveLength(3);
    expect(result.telemetry[0].stageName).toBe('extract-topology');
    expect(result.telemetry[1].stageName).toBe('cloud-blueprint');
    expect(result.telemetry[2].stageName).toBe('hydrate-local');

    // Vault + offline → zero bytes sent to cloud on any stage
    for (const t of result.telemetry) {
      expect(t.bytesSentToCloud).toBe(0);
      expect(typeof t.latencyMs).toBe('number');
      expect(t.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  test('Stage 2 reports cache status when offline', async () => {
    const result = await runPrismPipeline({
      rawContent: 'test data',
      prompt: 'Analyze',
      posture: 'balanced',
      device: { ...DEVICE, online: false },
      thresholds: THRESHOLDS,
    });

    // Offline → must report cache attempt
    expect(['hit', 'miss']).toContain(result.telemetry[1].cacheStatus);
  });

  test('output contains a non-empty hydrated markdown report', async () => {
    const result = await runPrismPipeline({
      rawContent: 'Some data to analyze',
      prompt: 'Provide insights',
      posture: 'vault',
      device: DEVICE,
      thresholds: THRESHOLDS,
    });

    expect(result.hydratedReport.length).toBeGreaterThan(0);
    expect(typeof result.hydratedReport).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: FAIL — cannot resolve `../src/lib/prism/engine`

- [ ] **Step 3: Implement `runPrismPipeline` in `src/lib/prism/engine.ts`**

The function:
1. Calls `computeRoute()` to get a `RouterDecision`.
2. **Stage 1 (Extract Topology):**
   - If `decision.useNano`: use `getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE })` to extract topology. Wrap in try-catch; on Nano runtime failure, fall back to scrubber.
   - If `!decision.useNano` (fallback): call `scrubPII(rawContent)`, then parse into `AbstractTopology` structure locally (regex-based entity/relationship extraction from scrubbed text).
   - Enforce 2048-byte cap on serialized topology (truncate `constraints` array if needed).
   - Record `StageTelemetry` with `bytesSentToCloud: 0`.
3. **Stage 2 (Cloud Blueprint):**
   - If `decision.useCloud`: use `getGenerativeModel(ai, { mode: InferenceMode.PREFER_IN_CLOUD, inCloudParams: { model: 'gemini-3.5-flash-lite' } })` with `responseSchema` for structured JSON. Send only the topology. Record `bytesSentToCloud` = serialized topology byte length. Cache result in Firestore doc keyed by SHA-256 hash of topology JSON.
   - If `!decision.useCloud`: attempt to fetch a cached blueprint from Firestore by topology hash. Record `cacheStatus: 'hit'` or `'miss'`. On miss, generate a minimal local blueprint from topology structure.
   - Record telemetry.
4. **Stage 3 (Hydrate Locally):**
   - If `decision.useNano`: use on-device model to hydrate blueprint against raw content into Markdown.
   - If `!decision.useNano` (fallback): template-based hydration that combines blueprint steps with scrubbed content into a Markdown report.
   - Record `bytesSentToCloud: 0` telemetry.
5. Return `PrismPipelineOutput`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prism-engine.test.ts`
Expected: PASS — all 5 engine tests green.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass (contracts + firebase + nano + scrubber + router + engine).

- [ ] **Step 6: Commit**

```bash
git add src/lib/prism/engine.ts
git commit -m "feat: 3-stage PRISM pipeline with telemetry and offline fallback"
```

---

### Task 7: Final Verification

**Files:**
- No new files. Verify everything.

**Interfaces:**
- Consumes: All previous tasks.

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: Exit 0, no errors.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Exit 0, no errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: final verification — typecheck, tests, build all green"
```
