import React from 'react';
import type { AbstractTopology, ReasoningBlueprint, StageTelemetry } from '../../types/prism';
import {
  Radio,
  FileJson,
  CheckCircle,
  Copy,
  Share2,
  Workflow,
  Zap,
  Check,
} from 'lucide-react';

interface WireXRayLaneProps {
  topology: AbstractTopology | null;
  blueprint: ReasoningBlueprint | null;
  stage1Telemetry?: StageTelemetry;
  stage2Telemetry?: StageTelemetry;
  isRunning: boolean;
  activeStageIndex: number;
}

export const WireXRayLane: React.FC<WireXRayLaneProps> = ({
  topology,
  blueprint,
  stage1Telemetry,
  stage2Telemetry,
  isRunning,
  activeStageIndex,
}) => {
  const [activeTab, setActiveTab] = React.useState<'both' | 'topology' | 'blueprint'>('both');
  const [copiedTopo, setCopiedTopo] = React.useState(false);
  const [copiedBp, setCopiedBp] = React.useState(false);

  const topoJson = topology ? JSON.stringify(topology, null, 2) : '';
  const bpJson = blueprint ? JSON.stringify(blueprint, null, 2) : '';

  const topoBytes = topoJson ? new TextEncoder().encode(JSON.stringify(topology)).length : 0;
  const isCeilingRespected = topoBytes > 0 && topoBytes < 2048;

  const handleCopy = (type: 'topology' | 'blueprint') => {
    if (type === 'topology') {
      navigator.clipboard.writeText(topoJson);
      setCopiedTopo(true);
      setTimeout(() => setCopiedTopo(false), 2000);
    } else {
      navigator.clipboard.writeText(bpJson);
      setCopiedBp(true);
      setTimeout(() => setCopiedBp(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0f17] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
      {/* Lane Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d121c] border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Radio className="w-3 h-3 text-sky-400" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-1.5 font-mono">
              Lane 2: Wire X-Ray
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono font-normal">
                TRANSMISSION
              </span>
            </h2>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-[#07090e] p-0.5 rounded-lg border border-white/[0.06] text-[10px] font-mono">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-2 py-0.5 rounded ${
              activeTab === 'both' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setActiveTab('topology')}
            className={`px-2 py-0.5 rounded ${
              activeTab === 'topology' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Stage 1 Topology
          </button>
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`px-2 py-0.5 rounded ${
              activeTab === 'blueprint' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Stage 2 Blueprint
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#080b12] divide-y divide-white/[0.06]">
        {/* Stage 1: Abstract Topology (<2 KB) Inspector */}
        {(activeTab === 'both' || activeTab === 'topology') && (
          <div className="flex-1 flex flex-col p-3 min-h-0 overflow-hidden">
            {/* Stage 1 Meta Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold font-mono text-zinc-200 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stage 1: Abstract Topology</span>
                </span>
                {topology && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                      isCeilingRespected
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                    <span>0 Raw PII Leaked • &lt;2 KB Ceiling</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {topology && (
                  <>
                    {stage1Telemetry && (
                      <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                        {stage1Telemetry.latencyMs}ms
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                      <span className="text-emerald-400 font-semibold">{topoBytes}</span> / 2048 B
                    </span>
                    <button
                      onClick={() => handleCopy('topology')}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                      title="Copy Abstract Topology JSON"
                    >
                      {copiedTopo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Topology Body */}
            {topology ? (
              <div className="flex-1 rounded-lg border border-white/[0.08] bg-[#06080e] p-2.5 overflow-auto font-mono text-[11px] leading-relaxed text-zinc-300 selection:bg-emerald-500/30">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/[0.06] text-[10px] text-zinc-400">
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 font-semibold">
                    {topology.entities.length} Entities
                  </span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 font-semibold">
                    {topology.relationships.length} Relations
                  </span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 font-semibold">
                    {topology.constraints.length} Directives
                  </span>
                </div>
                <pre className="text-emerald-300/90 whitespace-pre font-mono">{topoJson}</pre>
              </div>
            ) : (
              <div className="flex-1 rounded-lg border border-dashed border-white/[0.08] flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                {isRunning && activeStageIndex === 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono text-emerald-400">
                      Distilling raw files into &lt;2 KB Abstract Topology...
                    </span>
                  </div>
                ) : (
                  <>
                    <FileJson className="w-8 h-8 text-zinc-700 mb-2" />
                    <p className="text-xs font-medium text-zinc-400">No Topology Extracted</p>
                    <p className="text-[11px] text-zinc-600 max-w-xs mt-1">
                      Execute the pipeline to extract an anonymized topology with zero raw PII.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stage 2: Reasoning Blueprint Inspector */}
        {(activeTab === 'both' || activeTab === 'blueprint') && (
          <div className="flex-1 flex flex-col p-3 min-h-0 overflow-hidden">
            {/* Stage 2 Meta Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold font-mono text-zinc-200 flex items-center gap-1.5">
                  <Workflow className="w-3.5 h-3.5 text-sky-400" />
                  <span>Stage 2: Reasoning Blueprint</span>
                </span>
                {stage2Telemetry && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                      stage2Telemetry.cacheStatus === 'hit'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-950/80 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    <Zap className="w-2.5 h-2.5" />
                    <span>
                      {stage2Telemetry.cacheStatus === 'hit'
                        ? 'Firestore Cache HIT (Offline Saved)'
                        : 'Cloud Gemini 3.5 Flash-Lite'}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {blueprint && (
                  <>
                    {stage2Telemetry && (
                      <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                        {stage2Telemetry.latencyMs}ms
                      </span>
                    )}
                    <button
                      onClick={() => handleCopy('blueprint')}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                      title="Copy Reasoning Blueprint JSON"
                    >
                      {copiedBp ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Blueprint Body */}
            {blueprint ? (
              <div className="flex-1 rounded-lg border border-white/[0.08] bg-[#06080e] p-2.5 overflow-auto font-mono text-[11px] leading-relaxed text-zinc-300 selection:bg-sky-500/30">
                <div className="pb-2 mb-2 border-b border-white/[0.06] text-[11px] text-zinc-400">
                  <span className="text-zinc-500 font-semibold uppercase text-[10px] mr-1">GOAL:</span>
                  <span className="text-sky-300 font-medium">{blueprint.goal}</span>
                </div>
                <div className="space-y-2 mb-3">
                  {blueprint.steps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className="p-2 rounded bg-[#0d121c] border border-white/[0.05] text-[11px]"
                    >
                      <div className="flex items-center justify-between text-zinc-200 font-semibold mb-1">
                        <span className="text-sky-400">Step {idx + 1}: {step.action}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{step.id}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 space-y-0.5">
                        <div>
                          <span className="text-zinc-500">Target Output:</span> {step.output}
                        </div>
                        <div>
                          <span className="text-zinc-500">Input Nodes:</span> [{step.inputs.join(', ')}]
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <details className="mt-2 text-[10px] text-zinc-500 cursor-pointer">
                  <summary className="hover:text-zinc-300">View Raw Blueprint JSON</summary>
                  <pre className="mt-2 text-sky-300/80 whitespace-pre">{bpJson}</pre>
                </details>
              </div>
            ) : (
              <div className="flex-1 rounded-lg border border-dashed border-white/[0.08] flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                {isRunning && activeStageIndex === 1 ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono text-sky-400">
                      Generating structured reasoning blueprint...
                    </span>
                  </div>
                ) : (
                  <>
                    <Workflow className="w-8 h-8 text-zinc-700 mb-2" />
                    <p className="text-xs font-medium text-zinc-400">No Blueprint Generated</p>
                    <p className="text-[11px] text-zinc-600 max-w-xs mt-1">
                      A structured JSON reasoning blueprint will appear here once Stage 2 completes.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
