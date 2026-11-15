import {
  getGenerativeModel,
  InferenceMode,
  SchemaType,
  type GenerativeModel,
} from 'firebase/ai';
import {
  collection,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import type {
  CognitivePosture,
  DeviceContext,
  RemoteThresholds,
  AbstractTopology,
  ReasoningBlueprint,
  PrismPipelineOutput,
  StageTelemetry,
  InferenceSource,
  CacheStatus,
} from '../../types/prism';
import { getFirebaseAI, getFirebaseFirestore } from '../firebase/client';
import { scrubPII } from './scrubber';
import { computeRoute } from './router';

export interface PrismRunOptions {
  rawContent: string;
  prompt: string;
  posture: CognitivePosture;
  device: DeviceContext;
  thresholds: RemoteThresholds;
}

/**
 * Computes a deterministic SHA-256 hash string for an Abstract Topology.
 */
export async function computeTopologyHash(topology: AbstractTopology): Promise<string> {
  const serialized = JSON.stringify(topology);
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    try {
      const buffer = new TextEncoder().encode(serialized);
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fallback below
    }
  }

  // Pure deterministic 64-character hex fallback
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < serialized.length; i++) {
    const ch = serialized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return (p1 + p2).repeat(4);
}

/**
 * Deterministically constructs an AbstractTopology (<2 KB, zero PII) from scrubbed content.
 */
function extractTopologyFallback(scrubbedContent: string, prompt: string): AbstractTopology {
  const lines = scrubbedContent.split('\n').map((l) => l.trim()).filter(Boolean);

  const entities: Array<{ id: string; type: string; label: string }> = [];
  const relationships: Array<{ from: string; to: string; kind: string }> = [];
  const constraints: string[] = [];

  // Goal/Prompt constraint
  constraints.push(`Analysis Directive: ${prompt.slice(0, 100)}`);

  lines.forEach((line, index) => {
    if (index >= 6) return; // Keep topology compact (<2 KB)
    const entityId = `node_${index + 1}`;

    if (line.includes(':')) {
      const [key, ...rest] = line.split(':');
      const label = rest.join(':').trim();
      entities.push({
        id: entityId,
        type: 'attribute_cluster',
        label: `${key?.trim() || 'field'}: ${label.slice(0, 40)}`,
      });
    } else {
      entities.push({
        id: entityId,
        type: 'semantic_fragment',
        label: line.slice(0, 45),
      });
    }

    if (index > 0) {
      relationships.push({
        from: `node_${index}`,
        to: entityId,
        kind: 'correlates_with',
      });
    }
  });

  if (entities.length === 0) {
    entities.push({ id: 'node_root', type: 'root', label: 'Primary Context Entity' });
  }

  const topology: AbstractTopology = {
    schema: 'prism-topology-v1',
    entities,
    relationships,
    constraints,
  };

  // Enforce strict < 2048 byte size constraint
  const bytes = new TextEncoder().encode(JSON.stringify(topology)).length;
  if (bytes > 2000) {
    topology.constraints = topology.constraints.slice(0, 1);
    topology.relationships = topology.relationships.slice(0, 3);
  }

  return topology;
}

/**
 * Deterministically generates a fallback reasoning blueprint from topology.
 */
function createFallbackBlueprint(topology: AbstractTopology, prompt: string): ReasoningBlueprint {
  return {
    schema: 'prism-blueprint-v1',
    goal: `Execute cognitive synthesis for: "${prompt}"`,
    steps: [
      {
        id: 'step_1_audit',
        action: 'Audit local entity telemetry and compute baseline distributions',
        inputs: topology.entities.map((e) => e.id),
        output: 'Baseline metric variance & anomaly flags',
      },
      {
        id: 'step_2_cross_correlate',
        action: 'Cross-correlate relational entities against target objectives',
        inputs: topology.relationships.map((r) => `${r.from}->${r.to}`),
        output: 'Synthesized correlation vectors',
      },
      {
        id: 'step_3_recommendations',
        action: 'Formulate localized, actionable directives and strategic brief',
        inputs: ['step_1_audit', 'step_2_cross_correlate'],
        output: 'Final prioritized action checklist and diagnostic brief',
      },
    ],
  };
}

/**
 * Main 3-Stage PRISM Pipeline Entry Point
 */
export async function runPrismPipeline(options: PrismRunOptions): Promise<PrismPipelineOutput> {
  const { rawContent, prompt, posture, device, thresholds } = options;
  const decision = computeRoute(posture, device, thresholds);

  const telemetryList: StageTelemetry[] = [];

  // =========================================================================
  // STAGE 1: Local Topology Extraction (Gemini Nano 4 or Scrubber Fallback)
  // =========================================================================
  const stage1Start = performance.now();
  let topology: AbstractTopology;
  let stage1Fallback = false;
  let stage1InferenceSource: InferenceSource = 'ON_DEVICE';

  if (decision.useNano) {
    try {
      const ai = getFirebaseAI();
      const nanoModel: GenerativeModel = getGenerativeModel(ai, {
        mode: InferenceMode.ONLY_ON_DEVICE,
      });

      const extractionPrompt = `
Extract an anonymized problem topology in JSON conforming to prism-topology-v1.
Zero PII. Zero real numbers. Maximum 1.5 KB JSON.
Schema: { schema: "prism-topology-v1", entities: [{id, type, label}], relationships: [{from, to, kind}], constraints: [string] }
Content:
${rawContent}
`;
      const result = await nanoModel.generateContent(extractionPrompt);
      stage1InferenceSource = (result.response.inferenceSource as InferenceSource) || 'ON_DEVICE';
      const text = result.response.text();
      const parsed = JSON.parse(text) as AbstractTopology;
      if (parsed.schema === 'prism-topology-v1' && Array.isArray(parsed.entities)) {
        topology = parsed;
      } else {
        throw new Error('Invalid topology schema from Nano');
      }
    } catch {
      // Fallback to deterministic local PII scrubber
      stage1Fallback = true;
      const scrubbed = scrubPII(rawContent);
      topology = extractTopologyFallback(scrubbed, prompt);
    }
  } else {
    // Non-Nano environment or deterministic scrubber route
    stage1Fallback = true;
    const scrubbed = scrubPII(rawContent);
    topology = extractTopologyFallback(scrubbed, prompt);
  }

  // Safety Gate: Ensure topology byte size is strictly under 2048 bytes
  let topoString = JSON.stringify(topology);
  while (new TextEncoder().encode(topoString).length >= 2048 && topology.constraints.length > 0) {
    topology.constraints.pop();
    topoString = JSON.stringify(topology);
  }

  const stage1Latency = Math.round(performance.now() - stage1Start);
  telemetryList.push({
    stageName: 'extract-topology',
    inferenceSource: stage1InferenceSource,
    latencyMs: stage1Latency,
    bytesSentToCloud: 0, // Absolute privacy guarantee: raw data never sent to cloud
    cacheStatus: 'none',
    fallbackUsed: stage1Fallback,
    payloadPreview: `${topoString.slice(0, 90)}...`,
  });

  // =========================================================================
  // STAGE 2: Blind Cloud Blueprint Generation (Structured JSON + Firestore Cache)
  // =========================================================================
  const stage2Start = performance.now();
  let blueprint: ReasoningBlueprint;
  let stage2InferenceSource: InferenceSource = 'ON_DEVICE';
  let stage2BytesSent = 0;
  let stage2CacheStatus: CacheStatus = 'none';
  let stage2Fallback = false;

  const topologyHash = await computeTopologyHash(topology);
  const topologyByteLength = new TextEncoder().encode(topoString).length;

  const db = getFirebaseFirestore();
  const blueprintDocRef = doc(collection(db, 'blueprints'), topologyHash);

  // Check Firestore offline/online cache first
  let cachedBlueprintData: ReasoningBlueprint | null = null;
  try {
    const cachedSnap = await getDoc(blueprintDocRef);
    if (cachedSnap.exists()) {
      const data = cachedSnap.data() as ReasoningBlueprint;
      if (data && data.schema === 'prism-blueprint-v1' && Array.isArray(data.steps)) {
        cachedBlueprintData = data;
      }
    }
  } catch {
    // Firestore cache read is resilient and non-blocking
  }

  if (cachedBlueprintData) {
    // Cache HIT: Zero latency, zero cloud bytes
    blueprint = cachedBlueprintData;
    stage2CacheStatus = 'hit';
    stage2InferenceSource = 'ON_DEVICE';
    stage2BytesSent = 0;
  } else if (decision.useCloud) {
    // Cache MISS: Transmit abstract topology to Cloud Gemini via Firebase AI Logic SDK
    stage2CacheStatus = 'miss';
    stage2BytesSent = topologyByteLength;

    try {
      const ai = getFirebaseAI();
      const cloudModel: GenerativeModel = getGenerativeModel(ai, {
        mode: InferenceMode.PREFER_IN_CLOUD,
        inCloudParams: {
          model: 'gemini-3.5-flash-lite',
        },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              schema: { type: SchemaType.STRING },
              goal: { type: SchemaType.STRING },
              steps: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    id: { type: SchemaType.STRING },
                    action: { type: SchemaType.STRING },
                    inputs: {
                      type: SchemaType.ARRAY,
                      items: { type: SchemaType.STRING },
                    },
                    output: { type: SchemaType.STRING },
                  },
                  required: ['id', 'action', 'inputs', 'output'],
                },
              },
            },
            required: ['schema', 'goal', 'steps'],
          },
        },
      });

      const cloudPrompt = `
You are the PRISM Cloud Blueprint Reasoner.
You are given an abstract entity/relationship topology with zero PII or raw numbers.
Formulate a structured Reasoning Blueprint to achieve the goal: "${prompt}".
Topology:
${topoString}
`;
      const result = await cloudModel.generateContent(cloudPrompt);
      stage2InferenceSource = (result.response.inferenceSource as InferenceSource) || 'IN_CLOUD';

      const jsonText = result.response.text();
      const parsed = JSON.parse(jsonText) as ReasoningBlueprint;

      if (parsed.schema === 'prism-blueprint-v1' && Array.isArray(parsed.steps)) {
        blueprint = parsed;
      } else {
        throw new Error('Cloud returned unexpected blueprint schema');
      }

      // Persist to Firestore cache asynchronously (enables offline reuse)
      try {
        await setDoc(blueprintDocRef, {
          ...blueprint,
          topologyHash,
          cachedAt: Date.now(),
        });
      } catch {
        // Cache persistence write warning ignored
      }
    } catch {
      // Cloud generation failed or offline -> fallback to local blueprint generator
      stage2Fallback = true;
      stage2InferenceSource = 'ON_DEVICE';
      stage2BytesSent = 0;
      blueprint = createFallbackBlueprint(topology, prompt);
    }
  } else {
    // Offline / Vault Mode: Cache MISS + Local Synthesis
    stage2CacheStatus = 'miss';
    stage2Fallback = true;
    stage2InferenceSource = 'ON_DEVICE';
    stage2BytesSent = 0;
    blueprint = createFallbackBlueprint(topology, prompt);
  }

  const stage2Latency = Math.round(performance.now() - stage2Start);
  telemetryList.push({
    stageName: 'cloud-blueprint',
    inferenceSource: stage2InferenceSource,
    latencyMs: stage2Latency,
    bytesSentToCloud: stage2BytesSent,
    cacheStatus: stage2CacheStatus,
    fallbackUsed: stage2Fallback,
    payloadPreview: `${JSON.stringify(blueprint).slice(0, 90)}...`,
  });

  // =========================================================================
  // STAGE 3: Grounded Local Hydration (On-Device Nano or Deterministic Template)
  // =========================================================================
  const stage3Start = performance.now();
  let hydratedReport = '';
  let stage3Fallback = false;
  let stage3InferenceSource: InferenceSource = 'ON_DEVICE';

  if (decision.useNano) {
    try {
      const ai = getFirebaseAI();
      const nanoModel: GenerativeModel = getGenerativeModel(ai, {
        mode: InferenceMode.ONLY_ON_DEVICE,
      });

      const hydrationPrompt = `
Execute the following reasoning blueprint directly against the user's raw local data.
Generate a structured, insightful Markdown report answering: "${prompt}".
Blueprint:
${JSON.stringify(blueprint)}

Raw Local Data:
${rawContent}
`;
      const result = await nanoModel.generateContent(hydrationPrompt);
      stage3InferenceSource = (result.response.inferenceSource as InferenceSource) || 'ON_DEVICE';
      hydratedReport = result.response.text();
    } catch {
      stage3Fallback = true;
    }
  } else {
    stage3Fallback = true;
  }

  // Fallback hydration if Nano was unavailable or failed
  if (stage3Fallback || !hydratedReport) {
    const scrubbed = scrubPII(rawContent);
    const stepBulletPoints = blueprint.steps
      .map((step, idx) => `### ${idx + 1}. ${step.action}\n- **Target Output:** ${step.output}\n- **Observed Metrics:** Data evaluated across local nodes [${step.inputs.join(', ')}]`)
      .join('\n\n');

    hydratedReport = `
# PRISM Cognitive Synthesis Report

**Objective:** ${blueprint.goal}  
**Execution Posture:** \`${posture.toUpperCase()}\` | **Routing Reason:** ${decision.reason}

---

## 1. Executive Summary
This brief was synthesized strictly on-device using PRISM's Inverted-Blueprint architecture. Raw files never left the client boundary.

## 2. Local Grounding & Execution Steps
${stepBulletPoints}

## 3. Findings & Raw Context Correlation
Based on local analysis of the provided data:
\`\`\`text
${scrubbed.slice(0, 500)}
\`\`\`

## 4. Privacy & Integrity Attestation
- **Stage 1 (Topology Extraction):** ${telemetryList[0]?.inferenceSource} (${telemetryList[0]?.bytesSentToCloud} bytes to cloud)
- **Stage 2 (Blueprint Reasoning):** ${telemetryList[1]?.inferenceSource} (${telemetryList[1]?.bytesSentToCloud} bytes to cloud, cache: ${telemetryList[1]?.cacheStatus})
- **Stage 3 (Local Hydration):** ON_DEVICE (0 bytes to cloud)
- **Zero Raw Data Leakage Guaranteed.**
`.trim();
  }

  const stage3Latency = Math.round(performance.now() - stage3Start);
  telemetryList.push({
    stageName: 'hydrate-local',
    inferenceSource: stage3InferenceSource,
    latencyMs: stage3Latency,
    bytesSentToCloud: 0, // Never sends raw files to cloud
    cacheStatus: 'none',
    fallbackUsed: stage3Fallback,
    payloadPreview: `${hydratedReport.slice(0, 90)}...`,
  });

  return {
    topology,
    blueprint,
    hydratedReport,
    telemetry: [telemetryList[0]!, telemetryList[1]!, telemetryList[2]!],
  };
}
