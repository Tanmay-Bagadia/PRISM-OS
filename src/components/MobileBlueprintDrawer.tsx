import React from 'react';
import type { ReasoningBlueprint } from '../types/prism';
import {
  X,
  Database,
  Hash,
  Clock,
  ExternalLink,
  RefreshCw,
  Zap,
  FolderSync,
} from 'lucide-react';

export interface CachedBlueprintRecord {
  topologyHash: string;
  blueprint: ReasoningBlueprint;
  cachedAt?: number;
}

interface MobileBlueprintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cachedBlueprints: CachedBlueprintRecord[];
  onSelectBlueprint?: (blueprint: ReasoningBlueprint) => void;
  onRefreshFromFirestore: () => void;
}

export const MobileBlueprintDrawer: React.FC<MobileBlueprintDrawerProps> = ({
  isOpen,
  onClose,
  cachedBlueprints,
  onSelectBlueprint,
  onRefreshFromFirestore,
}) => {
  const [selectedRecord, setSelectedRecord] = React.useState<CachedBlueprintRecord | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-Over Drawer */}
      <div className="relative w-full max-w-md bg-[#0b0f17] border-l border-white/[0.1] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-[#0d121c]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono">
                Firestore Blueprint Vault
              </h2>
              <p className="text-[10px] text-zinc-400">
                Multi-Tab &amp; Offline Synchronized Reasoning Blueprints
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onRefreshFromFirestore}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              title="Refresh from Firestore Cache"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/20 text-[11px] font-mono text-indigo-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FolderSync className="w-3.5 h-3.5 text-indigo-400" />
            <span>Multi-Tab Cache: Active</span>
          </span>
          <span className="tabular-nums font-semibold">
            {cachedBlueprints.length} {cachedBlueprints.length === 1 ? 'Blueprint' : 'Blueprints'} Cached
          </span>
        </div>

        {/* Blueprint List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cachedBlueprints.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-zinc-500">
              <Database className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-400 font-medium">No Blueprints Synced Yet</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                Run the pipeline in Balanced or Frontier posture to populate and sync reasoning blueprints.
              </p>
            </div>
          ) : (
            cachedBlueprints.map((record) => {
              const isSelected = selectedRecord?.topologyHash === record.topologyHash;
              return (
                <div
                  key={record.topologyHash}
                  onClick={() => setSelectedRecord(isSelected ? null : record)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#141b2c] border-indigo-500/50 shadow-md'
                      : 'bg-[#0d121c] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#111726]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-indigo-400" />
                      <span className="font-semibold">{record.topologyHash.slice(0, 16)}...</span>
                    </span>
                    {record.cachedAt && (
                      <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(record.cachedAt).toLocaleTimeString()}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-semibold text-zinc-200 line-clamp-2">
                    {record.blueprint.goal}
                  </h3>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400 border-t border-white/[0.04] pt-2">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{record.blueprint.steps.length} Steps</span>
                    </span>

                    {onSelectBlueprint && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBlueprint(record.blueprint);
                          onClose();
                        }}
                        className="text-[10px] text-indigo-300 hover:text-indigo-200 font-semibold uppercase flex items-center gap-1"
                      >
                        <span>Load Blueprint</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-white/[0.08] text-[11px] font-mono text-zinc-300 space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                        Reasoning Steps:
                      </div>
                      {record.blueprint.steps.map((s, idx) => (
                        <div key={idx} className="p-1.5 rounded bg-black/40 text-[10px]">
                          <span className="text-sky-400 font-bold">{idx + 1}. {s.action}</span>
                          <div className="text-zinc-500 text-[9px] mt-0.5">Output: {s.output}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-[#0d121c] border-t border-white/[0.08] text-center text-[10px] font-mono text-zinc-500">
          Firestore Collection: <code className="text-zinc-400">/blueprints/{'{topologyHash}'}</code>
        </div>
      </div>
    </div>
  );
};
