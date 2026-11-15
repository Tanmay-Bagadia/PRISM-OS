import React from 'react';
import type { ScenarioFile, CognitivePosture } from '../../types/prism';
import {
  Lock,
  FileText,
  Play,
  RotateCw,
  Shield,
  Eye,
  Plus,
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
        description: `Uploaded document: ${(uploadedFile.size / 1024).toFixed(1)} KB`,
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
        description: `Dropped document: ${(droppedFile.size / 1024).toFixed(1)} KB`,
        category: 'legal',
        content: content || '',
      };
      onAddCustomFile(newFile);
    };
    reader.readAsText(droppedFile);
  };

  const fileSizeKB = (
    new TextEncoder().encode(activeFile?.content || '').length / 1024
  ).toFixed(1);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex flex-col bg-[#141720] border border-white/[0.07] rounded-2xl p-6 md:p-7 shadow-xl shadow-black/30 transition-all space-y-6"
    >
      {/* Step 1 Header & File Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono font-semibold text-emerald-400 tracking-wider uppercase">
              Step 1
            </span>
            <span className="text-zinc-600">•</span>
            <h2 className="text-sm font-semibold tracking-tight text-white">
              Confidential Local Context
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Private files remain encrypted in local memory. Zero bytes leave your browser.
          </p>
        </div>

        {/* File Tabs & Add File */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {files.map((file) => {
            const isSelected = file.id === activeFileId;
            return (
              <button
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-[#1a1f2c] text-white border-white/15 shadow-sm'
                    : 'bg-white/[0.02] text-zinc-400 border-white/[0.05] hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span className="max-w-[130px] truncate">{file.name}</span>
              </button>
            );
          })}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-dashed border-white/[0.1] transition-all shrink-0"
            title="Upload confidential local file"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Editor Surface */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            <span>{activeFile?.name || 'Local Document'}</span>
          </span>
          <span className="text-zinc-500 tabular-nums">
            {activeFile?.content.length || 0} chars • {fileSizeKB} KB
          </span>
        </div>

        <div className="relative rounded-xl border border-white/[0.07] bg-[#0c0e14] overflow-hidden focus-within:border-emerald-500/40 transition-colors">
          <textarea
            value={activeFile?.content || ''}
            onChange={(e) => activeFile && onUpdateFileContent(activeFile.id, e.target.value)}
            placeholder="Paste or edit confidential local document..."
            className="w-full h-44 sm:h-52 p-4 font-mono text-xs leading-relaxed text-zinc-200 bg-transparent resize-y outline-none selection:bg-emerald-500/25"
            spellCheck={false}
          />
          <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.07] text-[10px] font-mono text-emerald-400">
            <Lock className="w-3 h-3" />
            <span>Local Vault Lock</span>
          </div>
        </div>
      </div>

      {/* Cognitive Posture Dial & Objective Input */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
        {/* Posture Segmented Control (5 cols) */}
        <div className="md:col-span-5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cognitive Posture</span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0c0e14] border border-white/[0.07]">
            <button
              type="button"
              onClick={() => onChangePosture('vault')}
              className={`py-2 px-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                posture === 'vault'
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="100% on-device Gemini Nano reasoning (Zero cloud calls)"
            >
              Vault
            </button>
            <button
              type="button"
              onClick={() => onChangePosture('balanced')}
              className={`py-2 px-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                posture === 'balanced'
                  ? 'bg-sky-950/70 text-sky-300 border border-sky-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Hybrid Inverted Blueprint: Anonymized topology sent to Cloud, local re-hydration"
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => onChangePosture('frontier')}
              className={`py-2 px-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                posture === 'frontier'
                  ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Maximum cloud reasoning depth over anonymized topology"
            >
              Frontier
            </button>
          </div>
        </div>

        {/* Objective & Run CTA (7 cols) */}
        <div className="md:col-span-7 space-y-2">
          <label className="text-xs font-semibold text-zinc-300 block">
            Analysis Directive
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => onChangePrompt(e.target.value)}
              placeholder="What should PRISM formulate or extract?"
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#0c0e14] border border-white/[0.08] text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRunning) {
                  onRunPipeline();
                }
              }}
            />
            <button
              onClick={onRunPipeline}
              disabled={isRunning || !activeFile?.content.trim()}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isRunning
                  ? 'bg-sky-950/50 text-sky-400 border border-sky-500/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg glow-emerald border border-emerald-400/20 active:scale-[0.98]'
              }`}
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Analyze Privately</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LocalVaultLane;
