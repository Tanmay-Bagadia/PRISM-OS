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
        className="fixed inset-0 bg-[#18181B]/20 backdrop-blur-[2px] transition-opacity"
      />

      {/* Slide-Over Drawer */}
      <div className="relative w-full max-w-md bg-white border-l border-[#E6E5E0] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#F0EFEA] bg-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1D4ED8]">
              <Database className="w-3.5 h-3.5 text-[#1D4ED8]" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#18181B]">
                Firestore Blueprint Cache
              </h2>
              <p className="text-[10px] text-[#6B7280]">
                IndexedDB Offline Synchronized Blueprints
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onRefreshFromFirestore}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors"
              title="Refresh from Firestore Cache"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="px-4 py-2 bg-[#F7F7F5] border-b border-[#E6E5E0] text-[11px] font-mono text-[#18181B] flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[#15803D]">
            <FolderSync className="w-3.5 h-3.5 text-[#15803D]" />
            <span>IndexedDB Persistence: Active</span>
          </span>
          <span className="tabular-nums font-semibold text-[#4B5563]">
            {cachedBlueprints.length} {cachedBlueprints.length === 1 ? 'Blueprint' : 'Blueprints'}
          </span>
        </div>

        {/* Blueprint List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cachedBlueprints.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-[#9CA3AF]">
              <Database className="w-8 h-8 text-[#D4D4D8] mb-2" />
              <p className="text-xs text-[#4B5563] font-medium">No Blueprints Synced Yet</p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">
                Run the pipeline in Smart Hybrid or Deep Analysis to cache reasoning blueprints locally.
              </p>
            </div>
          ) : (
            cachedBlueprints.map((record) => {
              const isSelected = selectedRecord?.topologyHash === record.topologyHash;
              return (
                <div
                  key={record.topologyHash}
                  onClick={() => setSelectedRecord(isSelected ? null : record)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#F7F7F5] border-[#18181B] shadow-sm'
                      : 'bg-white border-[#E6E5E0] hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-[#15803D] flex items-center gap-1">
                      <Hash className="w-3 h-3 text-[#15803D]" />
                      <span className="font-semibold">{record.topologyHash.slice(0, 16)}...</span>
                    </span>
                    {record.cachedAt && (
                      <span className="text-[10px] font-mono text-[#6B7280] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(record.cachedAt).toLocaleTimeString()}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-semibold text-[#18181B] line-clamp-2">
                    {record.blueprint.goal}
                  </h3>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[#6B7280] border-t border-[#F0EFEA] pt-2">
                    <span className="text-[#15803D] flex items-center gap-1">
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
                        className="text-[10px] text-[#15803D] hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>Load Blueprint</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-[#E6E5E0] text-[11px] font-mono text-[#18181B] space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold">
                        Reasoning Steps:
                      </div>
                      {record.blueprint.steps.map((s, idx) => (
                        <div key={idx} className="p-2 rounded bg-white border border-[#E6E5E0] text-[10px]">
                          <span className="text-[#18181B] font-bold">{idx + 1}. {s.action}</span>
                          <div className="text-[#6B7280] text-[9px] mt-0.5">Target: {s.output}</div>
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
        <div className="p-3 bg-[#F7F7F5] border-t border-[#E6E5E0] text-center text-[10px] font-mono text-[#6B7280]">
          Firestore: <code className="text-[#18181B]">/blueprints/{'{topologyHash}'}</code>
        </div>
      </div>
    </div>
  );
};

export default MobileBlueprintDrawer;
