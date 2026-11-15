import React from 'react';
import type { ScenarioFile, CognitivePosture } from '../../types/prism';
import {
  Lock,
  FileCode,
  Upload,
  Play,
  RotateCw,
  Shield,
  Eye,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface LocalVaultLaneProps {
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
  isOfflineMode?: boolean;
  onToggleOffline?: () => void;
}

export const LocalVaultLane: React.FC<LocalVaultLaneProps> = ({
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
  isOfflineMode,
  onToggleOffline,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
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
        description: `Uploaded file: ${(uploadedFile.size / 1024).toFixed(1)} KB`,
        category: 'legal',
        content: content || '',
      };
      onAddCustomFile(newFile);
    };
    reader.readAsText(uploadedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newFile: ScenarioFile = {
        id: `custom_${Date.now()}`,
        name: droppedFile.name,
        description: `Dropped file: ${(droppedFile.size / 1024).toFixed(1)} KB`,
        category: 'legal',
        content: content || '',
      };
      onAddCustomFile(newFile);
    };
    reader.readAsText(droppedFile);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex flex-col h-full bg-[#0b0f17] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl"
    >
      {/* Lane Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d121c] border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Lock className="w-3 h-3 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-1.5 font-mono">
              Lane 1: Local Vault
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-normal">
                ON-DEVICE
              </span>
            </h2>
          </div>
        </div>

        {/* Upload Trigger */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".txt,.csv,.json,.log,.md"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
            title="Upload raw local file"
          >
            <Upload className="w-3 h-3" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* File Tab Switcher */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#090d14] border-b border-white/[0.06] overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">FILES:</span>
        {files.map((file) => {
          const isSelected = file.id === activeFile?.id;
          return (
            <button
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all shrink-0 border ${
                isSelected
                  ? 'bg-[#151c2c] text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-white/[0.02] text-zinc-400 border-transparent hover:bg-white/[0.05] hover:text-zinc-300'
              }`}
            >
              <FileCode className="w-3 h-3 text-emerald-400/70" />
              <span className="truncate max-w-[140px]">{file.name}</span>
            </button>
          );
        })}
      </div>

      {/* File Editor Workspace */}
      <div className="flex-1 flex flex-col p-3 min-h-0 bg-[#080b12]">
        <div className="flex items-center justify-between mb-1.5 text-[11px] text-zinc-400 font-mono">
          <span className="flex items-center gap-1 text-zinc-400">
            <Eye className="w-3 h-3 text-zinc-500" />
            <span>{activeFile?.description || 'Active Document'}</span>
          </span>
          <span className="text-zinc-500 tabular-nums">
            {activeFile?.content.length || 0} chars | {((new TextEncoder().encode(activeFile?.content || '').length) / 1024).toFixed(1)} KB
          </span>
        </div>

        <div className="flex-1 relative rounded-lg border border-white/[0.08] overflow-hidden bg-[#06080e] focus-within:border-emerald-500/50 transition-colors">
          <textarea
            value={activeFile?.content || ''}
            onChange={(e) => activeFile && onUpdateFileContent(activeFile.id, e.target.value)}
            placeholder="Confidential local file content..."
            className="w-full h-full p-3 font-mono text-xs leading-relaxed text-zinc-200 bg-transparent resize-none outline-none selection:bg-emerald-500/30"
            spellCheck={false}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/[0.08] text-[10px] font-mono text-emerald-400/90">
            <Lock className="w-2.5 h-2.5" />
            <span>Guaranteed Local Air-Gap</span>
          </div>
        </div>
      </div>

      {/* Cognitive Posture Dial & Prompt Directive Controls */}
      <div className="p-3 bg-[#0d121c] border-t border-white/[0.08] space-y-3">
        {/* Posture Segmented Dial & Offline Basement Simulator */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span>Cognitive Posture</span>
            </span>

            {onToggleOffline && (
              <button
                onClick={onToggleOffline}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                  isOfflineMode
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                    : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-zinc-200'
                }`}
                title="Toggle simulated hospital basement / offline environment"
              >
                {isOfflineMode ? (
                  <>
                    <WifiOff className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                    <span>Basement (Offline)</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Online</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#07090e] border border-white/[0.08]">
            <button
              onClick={() => onChangePosture('vault')}
              className={`py-1.5 px-2 rounded-md text-xs font-mono font-medium transition-all ${
                posture === 'vault'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              Vault (Local)
            </button>
            <button
              onClick={() => onChangePosture('balanced')}
              className={`py-1.5 px-2 rounded-md text-xs font-mono font-medium transition-all ${
                posture === 'balanced'
                  ? 'bg-sky-950/80 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              Balanced (Auto)
            </button>
            <button
              onClick={() => onChangePosture('frontier')}
              className={`py-1.5 px-2 rounded-md text-xs font-mono font-medium transition-all ${
                posture === 'frontier'
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              Frontier (Cloud)
            </button>
          </div>
        </div>

        {/* Prompt Directive Input */}
        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">
            Analysis Directive (What should PRISM extract & synthesize?):
          </label>
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => onChangePrompt(e.target.value)}
              placeholder="Enter analysis directive..."
              className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-[#07090e] border border-white/[0.1] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60 transition-colors"
            />
          </div>
        </div>

        {/* Run CTA */}
        <button
          onClick={onRunPipeline}
          disabled={isRunning || !activeFile?.content.trim()}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
            isRunning
              ? 'bg-sky-950/50 text-sky-400 border border-sky-500/30 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-semibold border border-white/20 hover:shadow-emerald-500/20'
          }`}
        >
          {isRunning ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin text-sky-400" />
              <span>Running Inverted-Blueprint Relay...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Execute 3-Stage PRISM Pipeline</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
