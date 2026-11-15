import React from 'react';
import type {
  ScenarioFile,
  CognitivePosture,
  AbstractTopology,
  ReasoningBlueprint,
  StageTelemetry,
} from '../types/prism';
import { LocalVaultLane } from './lanes/LocalVaultLane';
import { WireXRayLane } from './lanes/WireXRayLane';
import { HydratedOutputLane } from './lanes/HydratedOutputLane';
import { Lock, Radio, FileText } from 'lucide-react';

interface RelayWorkspaceProps {
  files: ScenarioFile[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onUpdateFileContent: (fileId: string, newContent: string) => void;
  onAddCustomFile: (file: ScenarioFile) => void;
  posture: CognitivePosture;
  onChangePosture: (posture: CognitivePosture) => void;
  prompt: string;
  onChangePrompt: (newPrompt: string) => void;
  onRunPipeline: () => void;
  isRunning: boolean;
  activeStageIndex: number;
  topology: AbstractTopology | null;
  blueprint: ReasoningBlueprint | null;
  hydratedReport: string;
  telemetry: StageTelemetry[] | null;
  onFollowUpOffline: (customPrompt?: string) => void;
  isOfflineMode: boolean;
  onToggleOffline?: () => void;
}

export const RelayWorkspace: React.FC<RelayWorkspaceProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onUpdateFileContent,
  onAddCustomFile,
  posture,
  onChangePosture,
  prompt,
  onChangePrompt,
  onRunPipeline,
  isRunning,
  activeStageIndex,
  topology,
  blueprint,
  hydratedReport,
  telemetry,
  onFollowUpOffline,
  isOfflineMode,
  onToggleOffline,
}) => {
  // Mobile active lane tab switcher
  const [mobileActiveLane, setMobileActiveLane] = React.useState<1 | 2 | 3>(1);

  // Automatically focus Lane 2 or 3 as pipeline progresses
  React.useEffect(() => {
    if (isRunning) {
      if (activeStageIndex === 1) setMobileActiveLane(2);
      if (activeStageIndex === 2) setMobileActiveLane(3);
    } else if (hydratedReport) {
      setMobileActiveLane(3);
    }
  }, [isRunning, activeStageIndex, hydratedReport]);

  return (
    <main className="flex-1 flex flex-col p-4 max-w-[1720px] mx-auto w-full min-h-0">
      {/* Mobile Tab Switcher */}
      <div className="flex xl:hidden mb-3 p-1 rounded-xl bg-[#0b0f17] border border-white/[0.08] text-xs font-mono">
        <button
          onClick={() => setMobileActiveLane(1)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
            mobileActiveLane === 1
              ? 'bg-[#151c2c] text-emerald-400 font-bold border border-emerald-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lane 1: Vault</span>
        </button>
        <button
          onClick={() => setMobileActiveLane(2)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
            mobileActiveLane === 2
              ? 'bg-[#151c2c] text-sky-400 font-bold border border-sky-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Lane 2: X-Ray</span>
        </button>
        <button
          onClick={() => setMobileActiveLane(3)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
            mobileActiveLane === 3
              ? 'bg-[#151c2c] text-indigo-400 font-bold border border-indigo-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Lane 3: Report</span>
        </button>
      </div>

      {/* 3-Lane Grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-[640px]">
        {/* Lane 1: Local Vault */}
        <div className={`h-full ${mobileActiveLane === 1 ? 'block' : 'hidden xl:block'}`}>
          <LocalVaultLane
            files={files}
            activeFileId={activeFileId}
            onSelectFile={onSelectFile}
            onUpdateFileContent={onUpdateFileContent}
            onAddCustomFile={onAddCustomFile}
            posture={posture}
            onChangePosture={onChangePosture}
            prompt={prompt}
            onChangePrompt={onChangePrompt}
            onRunPipeline={onRunPipeline}
            isRunning={isRunning}
            isOfflineMode={isOfflineMode}
            onToggleOffline={onToggleOffline}
          />
        </div>

        {/* Lane 2: Wire X-Ray */}
        <div className={`h-full ${mobileActiveLane === 2 ? 'block' : 'hidden xl:block'}`}>
          <WireXRayLane
            topology={topology}
            blueprint={blueprint}
            stage1Telemetry={telemetry?.[0]}
            stage2Telemetry={telemetry?.[1]}
            isRunning={isRunning}
            activeStageIndex={activeStageIndex}
          />
        </div>

        {/* Lane 3: Hydrated Output */}
        <div className={`h-full ${mobileActiveLane === 3 ? 'block' : 'hidden xl:block'}`}>
          <HydratedOutputLane
            hydratedReport={hydratedReport}
            stage3Telemetry={telemetry?.[2]}
            isRunning={isRunning}
            activeStageIndex={activeStageIndex}
            onFollowUpOffline={onFollowUpOffline}
            isOfflineMode={isOfflineMode}
          />
        </div>
      </div>
    </main>
  );
};

