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
  Radio,
  ArrowRight,
} from 'lucide-react';

interface HydratedOutputLaneProps {
  hydratedReport: string;
  stage3Telemetry?: StageTelemetry;
  stage2Telemetry?: StageTelemetry;
  isRunning: boolean;
  activeStageIndex: number;
  onFollowUpOffline: (customPrompt?: string) => void;
  isOfflineMode: boolean;
  onOpenWireDrawer?: () => void;
}

export const HydratedOutputLane: React.FC<HydratedOutputLaneProps> = ({
  hydratedReport,
  stage3Telemetry,
  stage2Telemetry,
  isRunning,
  activeStageIndex,
  onFollowUpOffline,
  isOfflineMode,
  onOpenWireDrawer,
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
    link.download = `prism-brief-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Helper to format inline markdown spans (bold, inline code)
   */
  const formatInlineText = (text: string): React.ReactNode => {
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

  /**
   * High-craft typographic Markdown renderer with native table and fence support
   */
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';

    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const flushTable = (keyIdx: number) => {
      if (tableHeaders.length > 0) {
        elements.push(
          <div
            key={`tbl-${keyIdx}`}
            className="my-5 overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0c0e14]"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.02] text-zinc-400 font-mono text-[11px]">
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="py-2.5 px-3.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-zinc-300 text-xs">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.015] transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3.5">
                        {formatInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    };

    lines.forEach((line, index) => {
      // Table handling
      const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
      if (isTableRow) {
        const cells = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        // Check if separator row (e.g. |---|---|)
        const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
        if (isSeparator) {
          return;
        }

        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        return;
      } else if (inTable) {
        flushTable(index);
      }

      // Code fences
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div
              key={`code-${index}`}
              className="my-4 rounded-xl border border-white/[0.07] bg-[#0c0e14] overflow-hidden"
            >
              {codeBlockLang && (
                <div className="px-3.5 py-1.5 bg-white/[0.02] border-b border-white/[0.05] text-[10px] font-mono text-zinc-400 uppercase">
                  {codeBlockLang}
                </div>
              )}
              <pre className="p-4 font-mono text-xs leading-relaxed text-zinc-300 overflow-x-auto selection:bg-emerald-500/25">
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
            className="text-xl font-bold text-white tracking-tight mt-3 mb-4 pb-2 border-b border-white/[0.07] flex items-center gap-2"
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
            className="text-base font-semibold text-zinc-100 tracking-tight mt-6 mb-3 pb-1 border-b border-white/[0.05]"
          >
            {line.replace('## ', '')}
          </h2>
        );
        return;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-xs font-semibold text-emerald-400 font-mono mt-4 mb-1.5">
            {line.replace('### ', '')}
          </h3>
        );
        return;
      }

      // Horizontal rule
      if (line.trim() === '---') {
        elements.push(<hr key={`hr-${index}`} className="my-5 border-white/[0.06]" />);
        return;
      }

      // Bullet points
      if (line.trim().startsWith('- ')) {
        const itemText = line.trim().slice(2);
        elements.push(
          <li key={`li-${index}`} className="text-xs text-zinc-300 leading-relaxed ml-4 list-disc my-1">
            {formatInlineText(itemText)}
          </li>
        );
        return;
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={`sp-${index}`} className="h-2" />);
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${index}`} className="text-xs text-zinc-300 leading-[1.65] my-1.5">
          {formatInlineText(line)}
        </p>
      );
    });

    if (inTable) {
      flushTable(lines.length);
    }

    return elements;
  };

  return (
    <div className="flex flex-col bg-[#141720] border border-white/[0.07] rounded-2xl p-6 md:p-8 shadow-xl shadow-black/30 space-y-6">
      {/* Step 2 Header & Action Toolbar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-xs font-mono font-semibold text-sky-400 tracking-wider uppercase">
              Step 2
            </span>
            <span className="text-zinc-600">•</span>
            <h2 className="text-sm font-semibold tracking-tight text-white">
              Grounded Local Brief
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Personalized cognitive synthesis grounded locally with zero raw cloud exposure.
          </p>
        </div>

        {/* Export & Copy buttons */}
        {hydratedReport && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] transition-all"
              title="Copy markdown brief"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] transition-all"
              title="Export as markdown file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Body */}
      {hydratedReport ? (
        <div className="space-y-6">
          {/* Subtle Trust Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0c0e14] border border-emerald-500/20 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2 text-zinc-300">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Cloud Bytes</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">
                Local Distill (Nano) <ArrowRight className="inline w-3 h-3 text-zinc-600 mx-0.5" /> Blind Blueprint <ArrowRight className="inline w-3 h-3 text-zinc-600 mx-0.5" /> Local Grounding
              </span>
            </div>

            {onOpenWireDrawer && (
              <button
                onClick={onOpenWireDrawer}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-sky-300 bg-sky-950/40 hover:bg-sky-950/70 border border-sky-500/30 transition-all shrink-0 self-start sm:self-auto"
                title="Inspect sanitized JSON graph & blueprint steps"
              >
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>Inspect Privacy Wire</span>
              </button>
            )}
          </div>

          {/* Rendered Brief */}
          <div className="prose prose-invert max-w-none text-zinc-200">
            {renderMarkdown(hydratedReport)}
          </div>

          {/* Inline Offline Follow-Up Query Bar */}
          <div className="pt-4 border-t border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline Follow-Up Query</span>
              </span>
              <span className="text-[11px] text-zinc-500">
                {stage2Telemetry?.cacheStatus === 'hit'
                  ? `⚡ ${stage2Telemetry.latencyMs}ms Firestore Cache Hit`
                  : stage3Telemetry?.latencyMs
                  ? `⚡ ${stage3Telemetry.latencyMs}ms Local Hydration`
                  : 'Instant Local Hydration'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
                placeholder="Ask an instant follow-up query in offline air-gap mode..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#0c0e14] border border-white/[0.08] text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRunning) {
                    onFollowUpOffline(followUpQuestion);
                  }
                }}
              />
              <button
                onClick={() => onFollowUpOffline(followUpQuestion)}
                disabled={isRunning}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  isOfflineMode
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 glow-amber'
                    : 'bg-white/[0.04] hover:bg-amber-950/50 text-amber-300 border border-amber-500/30'
                }`}
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Submit Offline</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Welcome State */
        <div className="py-16 px-6 rounded-xl border border-dashed border-white/[0.07] bg-[#0c0e14]/50 flex flex-col items-center justify-center text-center space-y-3">
          {isRunning ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-xs font-mono text-emerald-400">
                {activeStageIndex === 0
                  ? 'Stage 1: Extracting <2 KB Abstract Topology on-device...'
                  : activeStageIndex === 1
                  ? 'Stage 2: Synthesizing cloud blueprint without raw data...'
                  : 'Stage 3: Grounding localized brief on-device...'}
              </div>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <FileText className="w-5 h-5 text-zinc-500" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">
                Awaiting Private Analysis
              </h3>
              <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                Review your confidential file and directives in Step 1, then click{' '}
                <strong className="text-zinc-300">Analyze Privately</strong>. PRISM will distill an anonymized topology, formulate a blind blueprint, and hydrate the answer locally.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
export default HydratedOutputLane;
