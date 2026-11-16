import React from 'react';
import type {
  ScenarioFile,
  CognitivePosture,
  AbstractTopology,
  ReasoningBlueprint,
  StageTelemetry,
} from '../types/prism';
import {
  FileText,
  Table,
  Plus,
  Sparkles,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import { KeyIndicatorsGrid } from './KeyIndicatorsGrid';
import { ActionableFocusPlan } from './ActionableFocusPlan';
import { FullReportAccordion } from './FullReportAccordion';
import { FloatingVaultBar } from './FloatingVaultBar';
import { FileEditorModal } from './FileEditorModal';

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
  selectedScenarioId: string;
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
  topology,
  blueprint,
  hydratedReport,
  telemetry,
  onFollowUpOffline,
  selectedScenarioId,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [modalFile, setModalFile] = React.useState<ScenarioFile | null>(null);
  const [checkedItemIds, setCheckedItemIds] = React.useState<Record<string, boolean>>({});

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newFile: ScenarioFile = {
        id: `custom_${Date.now()}`,
        name: uploadedFile.name,
        description: `Custom local document: ${(uploadedFile.size / 1024).toFixed(1)} KB`,
        category: 'legal',
        content: content || '',
      };
      onAddCustomFile(newFile);
    };
    reader.readAsText(uploadedFile);
  };

  const handleTogglePlanItem = (id: string) => {
    setCheckedItemIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getFileFormatSize = (content: string, name: string) => {
    if (name.includes('2.4 MB')) return '2.4 MB';
    if (name.includes('418 KB')) return '418 KB';
    const bytes = new TextEncoder().encode(content).length;
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  return (
    <main className="w-full max-w-[880px] mx-auto px-4 sm:px-6 pt-7 flex-1 pb-28">
      {/* CONTEXT & CONTROL STRIP */}
      <section className="bg-white rounded-2xl p-4 border border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] mb-6 transition-all">
        {/* Upper Strip: Attached Files & Mode Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EFEA]">
          {/* Attached Files Stack */}
          <div className="flex items-center flex-wrap gap-2">
            {files.map((file) => {
              const isCsv = file.name.endsWith('.csv');
              return (
                <button
                  key={file.id}
                  onClick={() => {
                    onSelectFile(file.id);
                    setModalFile(file);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F7F7F5] border border-[#E6E5E0] hover:border-zinc-300 text-[#18181B] text-xs transition-colors cursor-pointer"
                  title="Click to view & edit raw confidential document"
                >
                  {isCsv ? (
                    <Table className="w-3.5 h-3.5 text-[#15803D]" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-[#BE123C]" />
                  )}
                  <span className="font-medium max-w-[140px] truncate">{file.name}</span>
                  <span className="text-[#6B7280] font-normal text-[11px]">
                    {getFileFormatSize(file.content, file.name)}
                  </span>
                </button>
              );
            })}

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-[#D4D4D8] text-[#4B5563] hover:text-[#18181B] hover:border-[#A1A1AA] text-xs transition-colors cursor-pointer"
              title="Upload local confidential file into browser memory"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add File</span>
            </button>
          </div>

          {/* Privacy Compute Mode Segmented Control */}
          <div className="inline-flex items-center bg-[#EFEFEA] p-0.5 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => onChangePosture('vault')}
              className={`px-2.5 py-1 rounded-[6px] text-xs transition-all flex items-center gap-1 cursor-pointer ${
                posture === 'vault'
                  ? 'font-medium bg-white text-[#15803D] shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-[#E6E5E0]'
                  : 'text-[#4B5563] hover:text-[#18181B]'
              }`}
            >
              {posture === 'vault' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
              )}
              <span>Local Only</span>
            </button>

            <button
              onClick={() => onChangePosture('balanced')}
              className={`px-2.5 py-1 rounded-[6px] text-xs transition-all flex items-center gap-1 cursor-pointer ${
                posture === 'balanced'
                  ? 'font-medium bg-white text-[#15803D] shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-[#E6E5E0]'
                  : 'text-[#4B5563] hover:text-[#18181B]'
              }`}
            >
              {posture === 'balanced' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
              )}
              <span>Smart Hybrid</span>
            </button>

            <button
              onClick={() => onChangePosture('frontier')}
              className={`px-2.5 py-1 rounded-[6px] text-xs transition-all flex items-center gap-1 cursor-pointer ${
                posture === 'frontier'
                  ? 'font-medium bg-white text-[#15803D] shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-[#E6E5E0]'
                  : 'text-[#4B5563] hover:text-[#18181B]'
              }`}
            >
              {posture === 'frontier' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
              )}
              <span>Deep Analysis</span>
            </button>
          </div>
        </div>

        {/* Lower Strip: Single-Line Conversational Goal Query Bar */}
        <div className="pt-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isRunning) onRunPipeline();
            }}
          >
            <div className="relative flex-1 flex items-center">
              <Sparkles className="w-4 h-4 absolute left-3 text-[#4B5563] pointer-events-none" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => onChangePrompt(e.target.value)}
                placeholder="What should PRISM formulate or extract?"
                className="w-full pl-9 pr-3 py-2 bg-[#F7F7F5] rounded-xl border border-[#E6E5E0] text-xs text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/5 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isRunning || !activeFile?.content.trim()}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-transform whitespace-nowrap shadow-sm cursor-pointer ${
                isRunning
                  ? 'bg-[#E4E4DF] text-[#6B7280] cursor-not-allowed'
                  : 'bg-[#18181B] hover:bg-[#27272A] text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-[#15803D]" />
                  <span>Analyzing Privately...</span>
                </>
              ) : (
                <>
                  <span>Update Brief</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* SECTION: Key Indicators (3 Bento Cards) */}
      <KeyIndicatorsGrid
        scenarioId={selectedScenarioId}
        rawContent={activeFile?.content}
        topology={topology}
        stage3Telemetry={telemetry?.[2]}
        isRunning={isRunning}
      />

      {/* SECTION: Actionable Focus Plan (Things 3 Style Checklist) */}
      <ActionableFocusPlan
        scenarioId={selectedScenarioId}
        blueprint={blueprint}
        checkedItemIds={checkedItemIds}
        onToggleItem={handleTogglePlanItem}
      />

      {/* SECTION: Expandable Detailed Grounded Synthesis & Dual-Grounding */}
      <FullReportAccordion
        hydratedReport={hydratedReport}
        isRunning={isRunning}
      />

      {/* FLOATING BOTTOM VAULT BAR */}
      <FloatingVaultBar
        onFollowUpOffline={onFollowUpOffline}
        isRunning={isRunning}
      />

      {/* File Editor Modal */}
      <FileEditorModal
        isOpen={Boolean(modalFile)}
        file={modalFile}
        onClose={() => setModalFile(null)}
        onSaveContent={(fileId, newContent) => {
          onUpdateFileContent(fileId, newContent);
          setModalFile(null);
        }}
      />
    </main>
  );
};

export default RelayWorkspace;
