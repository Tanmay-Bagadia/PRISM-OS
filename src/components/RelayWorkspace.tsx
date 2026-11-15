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
  isWireDrawerOpen?: boolean;
  onOpenWireDrawer?: () => void;
  onCloseWireDrawer?: () => void;
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
  isWireDrawerOpen = false,
  onOpenWireDrawer,
  onCloseWireDrawer,
}) => {
  // Close drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWireDrawerOpen && onCloseWireDrawer) {
        onCloseWireDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWireDrawerOpen, onCloseWireDrawer]);

  return (
    <main className="flex-1 w-full bg-[#0e1015]">
      {/* Calm, Flowy 2-Step Workspace Canvas */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Step 1: Confidential Local Context */}
        <section aria-label="Step 1: Confidential Local Context">
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
        </section>

        {/* Step 2: Grounded Local Brief */}
        <section aria-label="Step 2: Grounded Local Brief">
          <HydratedOutputLane
            hydratedReport={hydratedReport}
            stage3Telemetry={telemetry?.[2]}
            stage2Telemetry={telemetry?.[1]}
            isRunning={isRunning}
            activeStageIndex={activeStageIndex}
            onFollowUpOffline={onFollowUpOffline}
            isOfflineMode={isOfflineMode}
            onOpenWireDrawer={onOpenWireDrawer}
          />
        </section>
      </div>

      {/* Progressive Disclosure: Privacy Wire Slide-Over Drawer */}
      {isWireDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={onCloseWireDrawer}
            aria-hidden="true"
          />

          {/* Slide-over panel */}
          <div className="fixed inset-y-0 right-0 max-w-2xl w-full flex pl-6 sm:pl-10">
            <div className="w-full h-full bg-[#11141c] border-l border-white/[0.08] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ease-out">
              <WireXRayLane
                topology={topology}
                blueprint={blueprint}
                stage1Telemetry={telemetry?.[0]}
                stage2Telemetry={telemetry?.[1]}
                isRunning={isRunning}
                activeStageIndex={activeStageIndex}
                onClose={onCloseWireDrawer}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default RelayWorkspace;
