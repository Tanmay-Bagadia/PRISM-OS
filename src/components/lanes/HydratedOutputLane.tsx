import React from 'react';
import type { StageTelemetry } from '../../types/prism';
import {
  FileText,
  Copy,
  Check,
  Download,
  WifiOff,
  Zap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface HydratedOutputLaneProps {
  hydratedReport: string;
  stage3Telemetry?: StageTelemetry;
  stage2Telemetry?: StageTelemetry;
  isRunning: boolean;
  activeStageIndex: number;
  onFollowUpOffline: (customPrompt?: string) => void;
  isOfflineMode: boolean;
}

export const HydratedOutputLane: React.FC<HydratedOutputLaneProps> = ({
  hydratedReport,
  stage3Telemetry,
  stage2Telemetry,
  isRunning,
  activeStageIndex,
  onFollowUpOffline,
  isOfflineMode,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [followUpQuestion, setFollowUpQuestion] = React.useState('');

  const handleCopy = () => {
    if (!hydratedReport) return;
    navigator.clipboard.writeText(hydratedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!hydratedReport) return;
    const blob = new Blob([hydratedReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prism-cognitive-report-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Typographic Markdown parser that turns PRISM reports into high-contrast obsidian UI
   */
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';

    lines.forEach((line, index) => {
      // Code fence toggling
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Flush code block
          elements.push(
            <div
              key={`code-${index}`}
              className="my-3 rounded-lg border border-white/[0.08] bg-[#05070c] overflow-hidden"
            >
              {codeBlockLang && (
                <div className="px-3 py-1 bg-white/[0.03] border-b border-white/[0.06] text-[10px] font-mono text-zinc-400 uppercase">
                  {codeBlockLang}
                </div>
              )}
              <pre className="p-3 font-mono text-[11px] leading-relaxed text-zinc-300 overflow-x-auto selection:bg-emerald-500/30">
                {codeBlockContent.join('\n')}
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeBlockContent = [];
          codeBlockLang = '';
        } else {
          inCodeBlock = true;
          codeBlockLang = line.trim().replace(/^```/, '').trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1
            key={`h1-${index}`}
            className="text-lg font-bold text-white tracking-tight mt-2 mb-3 pb-2 border-b border-white/[0.08] flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{line.replace('# ', '')}</span>
          </h1>
        );
        return;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h2
            key={`h2-${index}`}
            className="text-sm font-bold text-zinc-100 tracking-tight mt-4 mb-2 pb-1 border-b border-white/[0.05]"
          >
            {line.replace('## ', '')}
          </h2>
        );
        return;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-xs font-semibold text-emerald-400 font-mono mt-3 mb-1">
            {line.replace('### ', '')}
          </h3>
        );
        return;
      }

      // Horizontal rule
      if (line.trim() === '---') {
        elements.push(<hr key={`hr-${index}`} className="my-3 border-white/[0.06]" />);
        return;
      }

      // Bullet points
      if (line.trim().startsWith('- ')) {
        const itemText = line.trim().slice(2);
        elements.push(
          <li key={`li-${index}`} className="text-xs text-zinc-300 leading-relaxed ml-4 list-disc my-0.5">
            {formatInlineText(itemText)}
          </li>
        );
        return;
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={`sp-${index}`} className="h-1.5" />);
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${index}`} className="text-xs text-zinc-300 leading-relaxed my-1">
          {formatInlineText(line)}
        </p>
      );
    });

    return elements;
  };

  /**
   * Helper to format inline markdown (bold, code spans)
   */
  const formatInlineText = (text: string): React.ReactNode => {
    // Regex for inline code: `code` and bold: **bold**
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-white/[0.06] text-emerald-300 font-mono text-[11px] border border-white/[0.08]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0f17] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
      {/* Lane Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d121c] border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <FileText className="w-3 h-3 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-1.5 font-mono">
              Lane 3: Hydrated Output
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-normal">
                GROUNDED LOCAL
              </span>
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        {hydratedReport && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
              title="Copy Report to Clipboard"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
              title="Download Markdown File"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Report Body */}
      <div className="flex-1 p-4 bg-[#080b12] overflow-y-auto">
        {hydratedReport ? (
          <div>
            {/* Stage 3 Telemetry Pill */}
            {stage3Telemetry && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#0d1320] border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-semibold">Local Grounding Complete</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                  <span>Source: <strong className="text-zinc-200">ON_DEVICE</strong></span>
                  <span>•</span>
                  <span>Latency: <strong className="text-zinc-200 tabular-nums">{stage3Telemetry.latencyMs}ms</strong></span>
                  <span>•</span>
                  <span>Cloud Exposure: <strong className="text-emerald-400">0 Bytes</strong></span>
                </div>
              </div>
            )}

            {/* Markdown Elements */}
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(hydratedReport)}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
            {isRunning && activeStageIndex === 2 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-emerald-400">
                  Hydrating reasoning blueprint against confidential raw data...
                </span>
              </div>
            ) : (
              <>
                <FileText className="w-8 h-8 text-zinc-700 mb-2" />
                <p className="text-xs font-medium text-zinc-400">Awaiting Pipeline Execution</p>
                <p className="text-[11px] text-zinc-600 max-w-xs mt-1">
                  Once Stage 2 finishes, Stage 3 will ground the abstract blueprint with your local confidential files.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Offline Follow-Up Action Footer */}
      {hydratedReport && (
        <div className="p-3 bg-[#0d121c] border-t border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Offline Follow-Up Query{' '}
                {stage2Telemetry?.cacheStatus === 'hit'
                  ? `(${stage2Telemetry.latencyMs}ms Firestore Cache Hit)`
                  : '(Instant Firestore Offline Cache)'}
              </span>
            </span>
            <span className="text-[10px] text-zinc-500">Air-Gapped • Local Hydration</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              placeholder="Ask an offline follow-up query (e.g. 'Audit projected runway with 20% OPEX cut')..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#07090e] border border-white/[0.1] text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60 font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRunning) {
                  onFollowUpOffline(followUpQuestion);
                }
              }}
            />
            <button
              onClick={() => onFollowUpOffline(followUpQuestion)}
              disabled={isRunning}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border shrink-0 ${
                isOfflineMode
                  ? 'bg-amber-950/90 text-amber-300 border-amber-500/50 glow-amber'
                  : 'bg-white/[0.05] hover:bg-amber-950/60 text-amber-400 border-amber-500/30'
              }`}
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Submit Offline Query
                {stage2Telemetry?.cacheStatus === 'hit' ? ` (${stage2Telemetry.latencyMs}ms)` : ''}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
