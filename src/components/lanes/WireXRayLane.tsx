import React from 'react';
import type { AbstractTopology, ReasoningBlueprint, StageTelemetry } from '../../types/prism';
import {
  Radio,
  FileJson,
  Copy,
  Share2,
  Workflow,
  Zap,
  Check,
  X,
} from 'lucide-react';

interface WireXRayLaneProps {
  topology: AbstractTopology | null;
  blueprint: ReasoningBlueprint | null;
  stage1Telemetry?: StageTelemetry;
  stage2Telemetry?: StageTelemetry;
  isRunning: boolean;
  activeStageIndex: number;
  onClose?: () => void;
}

export const WireXRayLane: React.FC<WireXRayLaneProps> = ({
  topology,
  blueprint,
  stage1Telemetry,
  stage2Telemetry,
  isRunning,
  activeStageIndex,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState<'split' | 'topology' | 'blueprint'>('split');
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
    <div className="flex flex-col h-full bg-[#11141c] text-zinc-100 overflow-hidden">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#141824] border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Privacy Wire Inspector
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono">
                0B Raw PII Sent
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Inspect the exact sanitized payload transmitted across the network boundary.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-lg border border-white/[0.06] text-xs font-mono">
            <button
              onClick={() => setActiveTab('split')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'split' ? 'bg-[#1b2233] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setActiveTab('topology')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'topology' ? 'bg-[#1b2233] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Topology
            </button>
            <button
              onClick={() => setActiveTab('blueprint')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'blueprint' ? 'bg-[#1b2233] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Blueprint
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Close Privacy Wire Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/[0.06] overflow-y-auto">
        {/* Stage 1: Abstract Topology */}
        {(activeTab === 'split' || activeTab === 'topology') && (
          <div className="flex-1 flex flex-col p-5 space-y-3 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-200 font-mono">
                  Stage 1: Abstract Topology
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                {topology && (
                  <>
                    <span className="text-zinc-400 tabular-nums">
                      <strong className={isCeilingRespected ? 'text-emerald-400' : 'text-amber-400'}>
                        {topoBytes}
                      </strong>{' '}
                      / 2048 B
                    </span>
                    {stage1Telemetry && (
                      <span className="text-zinc-500 tabular-nums">
                        ({stage1Telemetry.latencyMs}ms)
                      </span>
                    )}
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

            {topology ? (
              <div className="flex-1 flex flex-col space-y-2 min-h-0">
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 pb-2 border-b border-white/[0.05]">
                  <span className="px-2 py-0.5 rounded bg-white/[0.03] text-zinc-300 font-semibold">
                    {topology.entities.length} Entities
                  </span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.03] text-zinc-300 font-semibold">
                    {topology.relationships.length} Relationships
                  </span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.03] text-zinc-300 font-semibold">
                    {topology.constraints.length} Constraints
                  </span>
                </div>
                <pre className="flex-1 p-3.5 rounded-xl border border-white/[0.07] bg-[#0c0e14] text-[11px] font-mono text-emerald-300/90 leading-relaxed overflow-auto selection:bg-emerald-500/30">
                  {topoJson}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 rounded-xl border border-dashed border-white/[0.06]">
                {isRunning && activeStageIndex === 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-mono text-emerald-400">Distilling Topology on-device...</p>
                  </div>
                ) : (
                  <>
                    <FileJson className="w-8 h-8 text-zinc-600 mb-2" />
                    <p className="text-xs font-medium text-zinc-400">Awaiting Analysis</p>
                    <p className="text-xs text-zinc-600 max-w-xs mt-1">
                      Once Step 1 executes, Gemini Nano distills an anonymized topology &lt;2 KB.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stage 2: Reasoning Blueprint */}
        {(activeTab === 'split' || activeTab === 'blueprint') && (
          <div className="flex-1 flex flex-col p-5 space-y-3 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-zinc-200 font-mono">
                  Stage 2: Reasoning Blueprint
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                {stage2Telemetry && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      stage2Telemetry.cacheStatus === 'hit'
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-950/60 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>
                      {stage2Telemetry.cacheStatus === 'hit'
                        ? 'Firestore Cache HIT'
                        : (import.meta.env.VITE_GEMINI_CLOUD_MODEL || 'Cloud Gemini')}
                    </span>
                  </span>
                )}
                {blueprint && (
                  <button
                    onClick={() => handleCopy('blueprint')}
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                    title="Copy Blueprint JSON"
                  >
                    {copiedBp ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {blueprint ? (
              <div className="flex-1 flex flex-col space-y-2 min-h-0">
                <div className="p-2.5 rounded-lg bg-[#0c0e14] border border-white/[0.06] text-xs font-mono">
                  <span className="text-zinc-500 font-semibold mr-1.5 uppercase text-[10px]">GOAL:</span>
                  <span className="text-sky-300">{blueprint.goal}</span>
                </div>
                <div className="space-y-2 overflow-y-auto max-h-56 pr-1">
                  {blueprint.steps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className="p-2.5 rounded-lg bg-[#0c0e14] border border-white/[0.05] text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between text-zinc-200 font-semibold">
                        <span className="text-sky-400">Step {idx + 1}: {step.action}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        <span className="text-zinc-500">Target Output:</span> {step.output}
                      </div>
                    </div>
                  ))}
                </div>
                <details className="mt-2 text-xs text-zinc-500 font-mono cursor-pointer">
                  <summary className="hover:text-zinc-300">View Raw Blueprint JSON</summary>
                  <pre className="mt-2 p-3 rounded-lg bg-[#0c0e14] border border-white/[0.06] text-[11px] text-sky-300/90 overflow-x-auto whitespace-pre">
                    {bpJson}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 rounded-xl border border-dashed border-white/[0.06]">
                {isRunning && activeStageIndex === 1 ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-mono text-sky-400">Synthesizing Cloud Blueprint...</p>
                  </div>
                ) : (
                  <>
                    <Workflow className="w-8 h-8 text-zinc-600 mb-2" />
                    <p className="text-xs font-medium text-zinc-400">Awaiting Blueprint</p>
                    <p className="text-xs text-zinc-600 max-w-xs mt-1">
                      Cloud Gemini synthesizes this executable reasoning structure over the anonymized graph.
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
export default WireXRayLane;
