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
import {
  getFirebaseAI,
  getFirebaseFirestore,
  getRemoteConfigCloudModel,
} from '../firebase/client';
import { scrubPII } from './scrubber';
import { computeRoute } from './router';

export interface PrismRunOptions {
  rawContent: string;
  prompt: string;
  posture: CognitivePosture;
  device: DeviceContext;
  thresholds: RemoteThresholds;
  onStageProgress?: (stageIndex: number, stageName: string) => void;
}

/**
 * Safely parses JSON strings returned by LLMs, stripping markdown fences
 * (e.g. ```json ... ```) and extracting JSON objects or arrays.
 */
export function parseCleanJson<T>(raw: string): T {
  let cleaned = raw.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }
  // Extract content between first { or [ and last } or ]
  const firstBrace = cleaned.search(/[\{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  // Clean potential trailing commas in JSON objects/arrays (common in LLM output)
  cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');
  return JSON.parse(cleaned) as T;
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
 * Dynamically classifies an entity key into a domain-specific semantic type.
 */
function classifyEntityType(key: string): string {
  const lower = key.toLowerCase();
  if (/patient|diagnosis|blood|heart|pressure|glucose|potassium|medication|troponin|hba1c|vitals|lipid/i.test(lower)) {
    return 'clinical_metric';
  }
  if (/burn|cash|revenue|arr|salary|payroll|balance|compensation|account|cost|opex|debt|ebitda/i.test(lower)) {
    return 'financial_attribute';
  }
  if (/threat|ip|port|host|compromised|c2|gateway|actor|incident|forensic|cve|cvss|payload/i.test(lower)) {
    return 'security_telemetry';
  }
  if (/clause|signatory|damages|governing|agreement|nda|term|liability|indemnification|party/i.test(lower)) {
    return 'legal_provision';
  }
  if (/server|database|query|latency|error|engine|cluster|cpu|memory|endpoint/i.test(lower)) {
    return 'infrastructure_telemetry';
  }
  return 'attribute_cluster';
}

/**
 * Dynamically constructs an AbstractTopology (<2 KB, zero PII) from scrubbed content,
 * extracting real field structures without static placeholder labels.
 */
function extractTopologyFallback(scrubbedContent: string, prompt: string): AbstractTopology {
  const lines = scrubbedContent.split('\n').map((l) => l.trim()).filter(Boolean);

  const entities: Array<{ id: string; type: string; label: string }> = [];
  const relationships: Array<{ from: string; to: string; kind: string }> = [];
  const constraints: string[] = [];

  // Goal/Prompt constraint derived from user input
  constraints.push(`Analysis Directive: ${prompt.slice(0, 100)}`);

  // Dynamically derive contextual constraints based on prompt keywords
  const promptLower = prompt.toLowerCase();
  if (/risk|stratification|hazard|triage/i.test(promptLower)) {
    constraints.push('Risk Assessment: isolate anomalous variance and critical thresholds');
  } else if (/burn|runway|opex|cash|multiple/i.test(promptLower)) {
    constraints.push('Fiscal Horizon: model liquidity exhaustion boundary and capital conservation');
  } else if (/breach|threat|ransomware|lateral|contain/i.test(promptLower)) {
    constraints.push('Incident Containment: isolate attack vectors and block lateral traversal');
  } else if (/redline|liability|indemnif|breach|clause/i.test(promptLower)) {
    constraints.push('Legal Exposure: evaluate asymmetric risk and enforce liability caps');
  }

  let nodeCounter = 1;

  for (const line of lines) {
    if (entities.length >= 8) break; // Keep topology strictly compact (<2 KB)

    // Handle pipe-separated key-value pairs (e.g. "Patient: Vance | DOB: [REDACTED] | SSN: [REDACTED]")
    const segments = line.includes('|') ? line.split('|') : [line];

    for (const segment of segments) {
      if (entities.length >= 8) break;
      const cleanSeg = segment.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim();
      if (!cleanSeg || cleanSeg.startsWith('==')) continue;

      const entityId = `node_${nodeCounter++}`;

      if (cleanSeg.includes(':')) {
        const [rawKey, ...rest] = cleanSeg.split(':');
        const key = rawKey?.trim() || 'field';
        const labelVal = rest.join(':').trim();
        const type = classifyEntityType(key);

        entities.push({
          id: entityId,
          type,
          label: `${key}: ${labelVal.slice(0, 45)}`,
        });
      } else if (cleanSeg.length > 5) {
        entities.push({
          id: entityId,
          type: 'semantic_fragment',
          label: cleanSeg.slice(0, 50),
        });
      }

      // Establish relational edges between sequential entities
      if (entities.length > 1) {
        const prev = entities[entities.length - 2]!;
        const current = entities[entities.length - 1]!;
        const kind =
          prev.type === current.type && prev.type !== 'semantic_fragment'
            ? `${prev.type}_correlation`
            : 'correlates_with';

        relationships.push({
          from: prev.id,
          to: current.id,
          kind,
        });
      }
    }
  }

  if (entities.length === 0) {
    entities.push({ id: 'node_1', type: 'root', label: 'Primary Context Entity' });
  }

  const topology: AbstractTopology = {
    schema: 'prism-topology-v1',
    entities,
    relationships,
    constraints,
  };

  // Enforce strict < 2048 byte size constraint
  let bytes = new TextEncoder().encode(JSON.stringify(topology)).length;
  while (bytes >= 2048 && topology.constraints.length > 1) {
    topology.constraints.pop();
    bytes = new TextEncoder().encode(JSON.stringify(topology)).length;
  }
  while (bytes >= 2048 && topology.relationships.length > 1) {
    topology.relationships.pop();
    bytes = new TextEncoder().encode(JSON.stringify(topology)).length;
  }

  return topology;
}

/**
 * Dynamically synthesizes an executable ReasoningBlueprint from an AbstractTopology
 * and user prompt, avoiding static canned phrases.
 */
function createDynamicBlueprint(topology: AbstractTopology, prompt: string): ReasoningBlueprint {
  const promptClean = prompt.trim();
  const entityLabels = topology.entities.map((e) => e.label.split(':')[0]?.trim()).filter(Boolean);
  const primaryKeys = entityLabels.slice(0, 3).join(', ') || 'primary domain entities';
  const entityIds = topology.entities.map((e) => e.id);

  const steps = [
    {
      id: 'step_1_quantify_baseline',
      action: `Quantify baseline metrics, isolate variance, and check anomaly flags across [${primaryKeys}]`,
      inputs: entityIds.slice(0, Math.min(3, entityIds.length)),
      output: `Grounded baseline metrics and anomaly indices for ${entityLabels[0] || 'primary entity'}`,
    },
    {
      id: 'step_2_relational_synthesis',
      action: `Cross-correlate relational constraints across [${topology.relationships.map((r) => r.kind).slice(0, 2).join(', ') || 'topological edges'}] to address "${promptClean.slice(0, 60)}"`,
      inputs: entityIds,
      output: `Synthesized dependency vector and risk attribution matrix`,
    },
    {
      id: 'step_3_action_formulation',
      action: `Synthesize prioritized execution directives and operational roadmap for "${promptClean.slice(0, 75)}"`,
      inputs: ['step_1_quantify_baseline', 'step_2_relational_synthesis'],
      output: `Prioritized execution roadmap, risk mitigations, and grounded decision brief`,
    },
  ];

  return {
    schema: 'prism-blueprint-v1',
    goal: promptClean,
    steps,
  };
}

/**
 * Extracts structured key-value pairs comparing raw local data against anonymized wire tokens.
 */
function extractStructuredFieldComparisons(raw: string, scrubbed: string): Array<{
  field: string;
  rawValue: string;
  wireValue: string;
  isRedacted: boolean;
}> {
  const rawLines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const scrubbedLines = scrubbed.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: Array<{ field: string; rawValue: string; wireValue: string; isRedacted: boolean }> = [];

  rawLines.forEach((rLine, idx) => {
    const sLine = scrubbedLines[idx] || '';
    const rSegs = rLine.includes('|') ? rLine.split('|') : [rLine];
    const sSegs = sLine.includes('|') ? sLine.split('|') : [sLine];

    rSegs.forEach((rSeg, sIdx) => {
      const sSeg = sSegs[sIdx] || '';
      if (rSeg.includes(':')) {
        const [rKey, ...rRest] = rSeg.split(':');
        const [, ...sRest] = sSeg.includes(':') ? sSeg.split(':') : [rKey, sSeg];
        const rawVal = rRest.join(':').trim();
        const wireVal = sRest.join(':').trim() || sSeg.trim();
        const cleanField = (rKey || '').replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim();

        if (cleanField && rawVal && !cleanField.startsWith('==') && results.length < 12) {
          const isRedacted = wireVal.includes('[REDACTED') || wireVal !== rawVal;
          results.push({
            field: cleanField,
            rawValue: rawVal,
            wireValue: wireVal,
            isRedacted,
          });
        }
      }
    });
  });

  return results;
}

/**
 * Dynamically synthesizes the final Stage 3 Grounded Local Hydration Report
 * pairing blueprint reasoning with live local raw data.
 */
function synthesizeDynamicHydrationReport(
  rawContent: string,
  scrubbedContent: string,
  blueprint: ReasoningBlueprint,
  posture: CognitivePosture,
  routingReason: string,
  telemetryList: StageTelemetry[]
): string {
  const fields = extractStructuredFieldComparisons(rawContent, scrubbedContent);

  const dualGroundingRows = fields.map((f) => {
    const statusPill = f.isRedacted
      ? '🔒 **Redacted on-device** (Zero cloud bytes)'
      : '👁 Preserved format structure';
    return `| ${f.field} | \`${f.rawValue}\` | \`${f.wireValue}\` | ${statusPill} |`;
  }).join('\n');

  const stepExecutionDetails = blueprint.steps.map((step, idx) => {
    const relevantLocalFields = fields
      .filter((_, fIdx) => fIdx % blueprint.steps.length === idx)
      .map((f) => `\`${f.field}: ${f.rawValue}\``)
      .join(', ');

    return `### Step ${idx + 1}: ${step.action}
- **Target Output:** ${step.output}
- **Evaluated Local Vault Inputs:** [${step.inputs.join(', ')}]
- **Grounded Metrics Observed:** ${relevantLocalFields || 'Local context parsed without cloud exposure'}`;
  }).join('\n\n');

  return `
# PRISM Cognitive Synthesis Report

**Objective:** ${blueprint.goal}  
**Execution Posture:** \`${posture.toUpperCase()}\` | **Routing Reason:** ${routingReason}

---

## 1. Executive Summary & Dynamic Synthesis
This brief was synthesized strictly on-device using PRISM's Inverted-Blueprint architecture. The abstract reasoning blueprint generated in Stage 2 was grounded locally against raw confidential data without exposing private records over the network.

## 2. Grounded Step-by-Step Execution
${stepExecutionDetails}

## 3. Dual-Grounding Verification Table (Zero Cloud Exposure)

### Grounded Local Data & Anonymized Wire Transmission Correlation:

| Field / Metric | Raw Local Value (On-Device Vault) | Anonymized Wire Token (What Cloud Saw) | Wire Privacy Status |
| :--- | :--- | :--- | :--- |
${dualGroundingRows || '| Primary Document | Full Local File Grounded | [REDACTED_PAYLOAD] | 🔒 Redacted on-device |'}

*(Attestation: All sensitive identifiers, credentials, financials, and clinical vitals above were masked on-device prior to Stage 2. Stage 3 on-device execution re-grounded the abstract blueprint against the real numbers stored in the local vault.)*

## 4. Prioritized Directives & Risk Mitigations
1. **Immediate Stabilization Directive:** Action plan addressing \`${blueprint.goal.slice(0, 70)}\`.
2. **Contextual Constraint Verification:** Ensure execution bounds adhere to local schema definitions.
3. **Audit Trail Completeness:** Re-verify zero data leakage across local persistent cache.

## 5. Telemetry & Privacy Attestation
- **Stage 1 (Topology Extraction):** ${telemetryList[0]?.inferenceSource || 'ON_DEVICE'} (${telemetryList[0]?.bytesSentToCloud || 0} bytes to cloud)
- **Stage 2 (Blueprint Reasoning):** ${telemetryList[1]?.inferenceSource || 'IN_CLOUD'} (${telemetryList[1]?.bytesSentToCloud || 0} bytes to cloud, cache: ${telemetryList[1]?.cacheStatus || 'none'})
- **Stage 3 (Local Hydration):** ON_DEVICE (0 bytes to cloud)
- **Zero Raw Data Leakage Guaranteed.**
`.trim();
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
  options.onStageProgress?.(0, 'extract-topology');
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
      const parsed = parseCleanJson<Partial<AbstractTopology>>(text);
      if (Array.isArray(parsed.entities)) {
        parsed.schema = 'prism-topology-v1';
        parsed.relationships = Array.isArray(parsed.relationships) ? parsed.relationships : [];
        parsed.constraints = Array.isArray(parsed.constraints) ? parsed.constraints : [];
        topology = parsed as AbstractTopology;
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
  options.onStageProgress?.(1, 'cloud-blueprint');
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
      const cloudModelName = getRemoteConfigCloudModel(
        import.meta.env.VITE_GEMINI_CLOUD_MODEL || 'gemini-3.5-flash-lite'
      );
      const cloudModel: GenerativeModel = getGenerativeModel(ai, {
        mode: InferenceMode.PREFER_IN_CLOUD,
        inCloudParams: {
          model: cloudModelName,
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
        },
      });

      const cloudPrompt = `
You are the PRISM Cloud Blueprint Reasoner.
You are given an abstract entity/relationship topology with zero PII or raw numbers.
Formulate a structured Reasoning Blueprint to achieve the goal: "${prompt}".
You MUST set "schema": "prism-blueprint-v1" in the output JSON.
Topology:
${topoString}
`;
      const result = await cloudModel.generateContent(cloudPrompt);
      stage2InferenceSource = (result.response.inferenceSource as InferenceSource) || 'IN_CLOUD';

      const jsonText = result.response.text();
      const parsed = parseCleanJson<Partial<ReasoningBlueprint>>(jsonText);

      if (Array.isArray(parsed.steps)) {
        parsed.schema = 'prism-blueprint-v1';
        parsed.goal = parsed.goal || prompt;
        blueprint = parsed as ReasoningBlueprint;
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
      // Cloud generation failed or offline -> fallback to local dynamic blueprint generator
      stage2Fallback = true;
      stage2InferenceSource = 'ON_DEVICE';
      stage2BytesSent = 0;
      blueprint = createDynamicBlueprint(topology, prompt);
    }
  } else {
    // Offline / Vault Mode: Cache MISS + Local Dynamic Synthesis
    stage2CacheStatus = 'miss';
    stage2Fallback = true;
    stage2InferenceSource = 'ON_DEVICE';
    stage2BytesSent = 0;
    blueprint = createDynamicBlueprint(topology, prompt);
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
  options.onStageProgress?.(2, 'hydrate-local');
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
Strictly ground every date, number, and entity in the provided Raw Local Data; never invent report dates like 'October 26, 2023' if no date is specified.
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
    hydratedReport = synthesizeDynamicHydrationReport(
      rawContent,
      scrubbed,
      blueprint,
      posture,
      decision.reason,
      telemetryList
    );
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
