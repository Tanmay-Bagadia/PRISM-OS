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
  ArrowRight,
  RotateCw,
  UploadCloud,
  X,
  Lock,
  Zap,
  Shield,
  FileCode,
  ChevronDown,
} from 'lucide-react';
import { KeyIndicatorsGrid } from './KeyIndicatorsGrid';
import { ActionableFocusPlan } from './ActionableFocusPlan';
import { FullReportAccordion } from './FullReportAccordion';
import { FloatingVaultBar } from './FloatingVaultBar';
import { FileEditorModal } from './FileEditorModal';
import { STARTER_PROMPT_SUGGESTIONS } from '../data/scenarios';

interface RelayWorkspaceProps {
  files: ScenarioFile[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onUpdateFileContent: (fileId: string, newContent: string) => void;
  onAddCustomFile: (file: ScenarioFile) => void;
  onRemoveFile: (fileId: string) => void;
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

/**
 * Extracts plain text from user-uploaded files natively in browser memory.
 * Zero-dependency parser supporting .txt, .md, .csv, .json, .log, and .pdf streams.
 */
async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      let rawString = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        rawString += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + chunkSize)));
      }
      // Extract text from standard PDF text blocks: (text string) Tj
      const matches = rawString.match(/\(([^()]+)\)\s*Tj/g);
      if (matches && matches.length > 0) {
        const extracted = matches
          .map((m) => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim())
          .filter((s) => s.length > 0)
          .join(' ');
        if (extracted.trim().length > 20) {
          return extracted;
        }
      }
      // Fallback: extract printable ASCII/UTF-8 strings
      const printable = rawString.match(/[\x20-\x7E\r\n\t]{4,}/g);
      if (printable && printable.length > 0) {
        return printable.join('\n');
      }
    } catch (err) {
      console.warn('[PRISM] PDF text extraction fallback:', err);
    }
  }

  // Standard text reader for .txt, .md, .csv, .json, .log
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export const RelayWorkspace: React.FC<RelayWorkspaceProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onUpdateFileContent,
  onAddCustomFile,
  onRemoveFile,
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
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [modalFile, setModalFile] = React.useState<ScenarioFile | null>(null);
  const [checkedItemIds, setCheckedItemIds] = React.useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = React.useState(false);
  const [isNotesBoxOpen, setIsNotesBoxOpen] = React.useState(false);
  const [pastedNotes, setPastedNotes] = React.useState('');

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const hasResults = Boolean(topology || blueprint || hydratedReport);

  const combinedRawContent = React.useMemo(() => {
    return files
      .map((f) => (files.length > 1 ? `=== FILE: ${f.name} ===\n${f.content.trim()}` : f.content.trim()))
      .join('\n\n');
  }, [files]);

  // Process a selected or dropped file into local memory
  const processAndAddFile = async (rawFile: File) => {
    try {
      const content = await extractTextFromFile(rawFile);
      const isCsv = rawFile.name.endsWith('.csv');
      const isJson = rawFile.name.endsWith('.json');
      const category = isCsv || isJson ? 'finance' : 'legal';

      const bytes = new TextEncoder().encode(content).length;
      const formattedSize =
        bytes > 1024 * 1024
          ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(bytes / 1024))} KB`;

      const newFile: ScenarioFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: rawFile.name,
        description: `Local document (${formattedSize})`,
        category,
        content: content || '',
      };

      onAddCustomFile(newFile);
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  };

  const handleNativeFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      if (file) await processAndAddFile(file);
    }
    // Reset file input so re-selecting same file triggers change
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file) await processAndAddFile(file);
      }
    }
  };

  // Add typed notes as a local file chip
  const handleSaveNotesAsFile = () => {
    if (!pastedNotes.trim()) return;
    const noteId = `note_${Date.now()}`;
    const newFile: ScenarioFile = {
      id: noteId,
      name: `Private_Notes_${files.filter((f) => f.name.startsWith('Private_Notes')).length + 1}.txt`,
      description: 'Direct in-memory private notes',
      category: 'legal',
      content: pastedNotes.trim(),
    };
    onAddCustomFile(newFile);
    setPastedNotes('');
    setIsNotesBoxOpen(false);
  };

  const handleTogglePlanItem = (id: string) => {
    setCheckedItemIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getFileFormatSize = (content: string) => {
    const bytes = new TextEncoder().encode(content).length;
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.csv')) return <Table className="w-3.5 h-3.5 text-[#15803D]" />;
    if (name.endsWith('.json')) return <FileCode className="w-3.5 h-3.5 text-[#1D4ED8]" />;
    return <FileText className="w-3.5 h-3.5 text-[#BE123C]" />;
  };

  // Submit form handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRunning) return;

    // If user has unsaved notes typed in the notes box, convert to file automatically
    if (pastedNotes.trim() && !files.some((f) => f.content === pastedNotes.trim())) {
      const noteFile: ScenarioFile = {
        id: `note_${Date.now()}`,
        name: 'Pasted_Notes.txt',
        description: 'Direct in-memory private notes',
        category: 'legal',
        content: pastedNotes.trim(),
      };
      onAddCustomFile(noteFile);
      setPastedNotes('');
    }

    onRunPipeline();
  };

  return (
    <main className="w-full max-w-[880px] mx-auto px-4 sm:px-6 pt-7 flex-1 pb-28 sm:pb-36">
      {/* ─── PRIMARY WORKSPACE CONTROL CARD ─────────────────────────────────── */}
      <section
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all ${
          isDragging
            ? 'border-[#15803D] ring-2 ring-[#15803D]/10 bg-[#FAFBF9]'
            : 'border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)]'
        } mb-6`}
      >
        {/* Upper Strip: File Management Chips & Privacy Posture Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EFEA]">
          {/* File Chips & Upload Trigger */}
          <div className="flex items-center flex-wrap gap-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F7F7F5] border border-[#E6E5E0] hover:border-zinc-300 text-[#18181B] text-xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectFile(file.id);
                    setModalFile(file);
                  }}
                  className="flex items-center gap-1.5 cursor-pointer"
                  title="Click to view & edit raw confidential document in browser memory"
                >
                  {getFileIcon(file.name)}
                  <span className="font-medium max-w-[130px] truncate">{file.name}</span>
                  <span className="text-[#6B7280] font-normal text-[11px]">
                    {getFileFormatSize(file.content)}
                  </span>
                </button>

                {/* Remove File Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  className="text-[#9CA3AF] hover:text-[#BE123C] p-0.5 rounded transition-colors cursor-pointer"
                  title="Remove this file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleNativeFileInput}
              multiple
              accept=".txt,.md,.csv,.json,.log,.pdf"
              className="hidden"
            />

            {/* Add File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-[#D4D4D8] text-[#4B5563] hover:text-[#18181B] hover:border-[#A1A1AA] text-xs transition-colors cursor-pointer"
              title="Upload local files (.txt, .md, .csv, .json, .log, .pdf)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add File</span>
            </button>

            {/* Toggle Direct Notes Textarea */}
            <button
              type="button"
              onClick={() => setIsNotesBoxOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                isNotesBoxOpen
                  ? 'bg-[#EFEFEA] text-[#18181B] border border-[#E6E5E0] font-medium'
                  : 'text-[#4B5563] hover:text-[#18181B] border border-transparent'
              }`}
              title="Type or paste confidential text directly without saving a file"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Notes</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isNotesBoxOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Privacy Compute Posture Segmented Control */}
          <div className="inline-flex items-center bg-[#EFEFEA] p-0.5 rounded-lg self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => onChangePosture('vault')}
              className={`px-2.5 py-1 rounded-[6px] text-xs transition-all flex items-center gap-1 cursor-pointer ${
                posture === 'vault'
                  ? 'font-medium bg-white text-[#15803D] shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-[#E6E5E0]'
                  : 'text-[#4B5563] hover:text-[#18181B]'
              }`}
              title="Stage 1 & 2 & 3 run entirely on-device (Zero network calls)"
            >
              {posture === 'vault' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
              )}
              <span>Local Only</span>
            </button>

            <button
              type="button"
              onClick={() => onChangePosture('balanced')}
              className={`px-2.5 py-1 rounded-[6px] text-xs transition-all flex items-center gap-1 cursor-pointer ${
                posture === 'balanced'
                  ? 'font-medium bg-white text-[#15803D] shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-[#E6E5E0]'
                  : 'text-[#4B5563] hover:text-[#18181B]'
              }`}
              title="Blind cloud blueprint generation with automatic offline cache fallback"
            >
              {posture === 'balanced' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
              )}
              <span>Smart Hybrid</span>
            </button>

            <button
              type="button"
              onClick={() => onChangePosture('frontier')}
              className={`px-2.5 py-1 rounded-[6px] text-xs transition-all flex items-center gap-1 cursor-pointer ${
                posture === 'frontier'
                  ? 'font-medium bg-white text-[#15803D] shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-[#E6E5E0]'
                  : 'text-[#4B5563] hover:text-[#18181B]'
              }`}
              title="Frontier Cloud reasoning over abstract topology"
            >
              {posture === 'frontier' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
              )}
              <span>Deep Analysis</span>
            </button>
          </div>
        </div>

        {/* Expandable Direct Notes Box */}
        {isNotesBoxOpen && (
          <div className="pt-3 pb-1 border-b border-[#F0EFEA] animate-in fade-in duration-150">
            <div className="relative">
              <textarea
                value={pastedNotes}
                onChange={(e) => setPastedNotes(e.target.value)}
                placeholder="Paste confidential notes, raw logs, medical values, contracts, or financial numbers here..."
                rows={4}
                className="w-full p-3 bg-[#F7F7F5] rounded-xl border border-[#E6E5E0] text-xs text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/5 transition-all font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-[#6B7280]">
                  {pastedNotes.trim().length > 0
                    ? `${pastedNotes.trim().length} characters in local memory`
                    : 'Notes remain strictly in browser RAM.'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPastedNotes('');
                      setIsNotesBoxOpen(false);
                    }}
                    className="px-2.5 py-1 text-xs text-[#71717A] hover:text-[#18181B] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!pastedNotes.trim()}
                    onClick={handleSaveNotesAsFile}
                    className="px-3 py-1 rounded-lg bg-[#18181B] text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#27272A] transition-colors cursor-pointer"
                  >
                    Save as File Chip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lower Strip: Modern AI Prompt Bar */}
        <div className="pt-3">
          <form className="flex items-center gap-2" onSubmit={handleFormSubmit}>
            <div className="relative flex-1 flex items-center">
              {/* Attachment Icon Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-2.5 text-[#71717A] hover:text-[#18181B] transition-colors p-1 rounded-md hover:bg-[#EFEFEA] cursor-pointer"
                title="Attach files (.txt, .md, .csv, .json, .log, .pdf)"
              >
                <Plus className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={prompt}
                onChange={(e) => onChangePrompt(e.target.value)}
                placeholder="What should PRISM formulate or extract from your private data?"
                className="w-full pl-10 pr-3 py-2.5 bg-[#F7F7F5] rounded-xl border border-[#E6E5E0] text-xs text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/5 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isRunning || (files.length === 0 && !pastedNotes.trim())}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-transform whitespace-nowrap shadow-sm cursor-pointer ${
                isRunning
                  ? 'bg-[#E4E4DF] text-[#6B7280] cursor-not-allowed'
                  : files.length === 0 && !pastedNotes.trim()
                  ? 'bg-[#E4E4DF] text-[#A1A1AA] cursor-not-allowed'
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
                  <span>Analyze Privately</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Starter Suggestions (Shown when prompt is empty) */}
          {!prompt && (
            <div className="mt-2.5 flex items-center flex-wrap gap-1.5 animate-in fade-in duration-200">
              <span className="text-[11px] text-[#71717A] mr-1">Inspirations:</span>
              {STARTER_PROMPT_SUGGESTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangePrompt(item.prompt)}
                  className="px-2 py-0.5 rounded-md bg-[#F7F7F5] hover:bg-[#EFEFEA] border border-[#E6E5E0] text-[11px] text-[#4B5563] hover:text-[#18181B] transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── INITIAL CALM EMPTY STATE (When no analysis has been executed yet) ──── */}
      {!hasResults && !isRunning && (
        <div className="bg-white rounded-2xl p-8 sm:p-10 border border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-[#E6E5E0] flex items-center justify-center text-[#15803D] mx-auto mb-4">
            <UploadCloud className="w-6 h-6" />
          </div>

          <h2 className="text-base font-semibold text-[#18181B] tracking-tight">
            {files.length === 0
              ? 'Add your confidential files or notes to begin'
              : `${files.length} ${files.length === 1 ? 'file' : 'files'} loaded in private memory`}
          </h2>

          <p className="text-xs text-[#6B7280] max-w-md mx-auto mt-1.5 leading-relaxed">
            {files.length === 0
              ? 'Drag & drop local files (.pdf, .csv, .txt, .json, .log) or paste raw text above. Documents are parsed purely in browser memory with zero network upload.'
              : 'Type a question or select an inspiration prompt above, then click Analyze Privately to execute on-device Stage 1 extraction.'}
          </p>

          {/* 3 Privacy Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto mt-7 text-left">
            <div className="p-3 rounded-xl bg-[#F7F7F5] border border-[#E6E5E0]">
              <div className="flex items-center gap-1.5 text-[#15803D] font-semibold text-xs mb-1">
                <Lock className="w-3.5 h-3.5" />
                <span>0 Bytes Raw Leak</span>
              </div>
              <p className="text-[11px] text-[#6B7280] leading-snug">
                Raw PII, names, and numbers never leave local device memory.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F7F5] border border-[#E6E5E0]">
              <div className="flex items-center gap-1.5 text-[#1D4ED8] font-semibold text-xs mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Gemini Nano 4</span>
              </div>
              <p className="text-[11px] text-[#6B7280] leading-snug">
                Chrome on-device AI extracts &lt;2 KB anonymized abstract topology.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F7F5] border border-[#E6E5E0]">
              <div className="flex items-center gap-1.5 text-[#B45309] font-semibold text-xs mb-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Air-Gap Ready</span>
              </div>
              <p className="text-[11px] text-[#6B7280] leading-snug">
                Cached reasoning blueprints execute completely offline in &lt;100ms.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── DYNAMIC OUTPUT RENDERING (Only rendered after analysis or when running) ─ */}
      {(hasResults || isRunning) && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-7">
          {/* Section: Key Indicators Bento Cards */}
          <KeyIndicatorsGrid
            rawContent={combinedRawContent || activeFile?.content}
            hydratedReport={hydratedReport}
            topology={topology}
            stage3Telemetry={telemetry?.[2]}
            isRunning={isRunning}
          />

          {/* Section: Actionable Focus Plan (Things 3 Checklist) */}
          <ActionableFocusPlan
            blueprint={blueprint}
            hydratedReport={hydratedReport}
            checkedItemIds={checkedItemIds}
            onToggleItem={handleTogglePlanItem}
            isRunning={isRunning}
          />

          {/* Section: Expandable Detailed Grounded Synthesis */}
          <FullReportAccordion
            hydratedReport={hydratedReport}
            isRunning={isRunning}
          />

          {/* Floating Bottom Vault Bar for Offline Follow-Ups */}
          <FloatingVaultBar
            onFollowUpOffline={onFollowUpOffline}
            isRunning={isRunning}
          />
        </div>
      )}

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
