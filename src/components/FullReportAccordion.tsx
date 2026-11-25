import React from 'react';
import {
  FileText,
  ChevronDown,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  FileLock2,
} from 'lucide-react';
import { cleanMarkdownFences } from '../lib/prism/engine';

interface FullReportAccordionProps {
  hydratedReport: string;
  isRunning: boolean;
  onOpenSafeExport?: () => void;
}

export const FullReportAccordion: React.FC<FullReportAccordionProps> = ({
  hydratedReport,
  isRunning,
  onOpenSafeExport,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!hydratedReport && !isRunning) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hydratedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([hydratedReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prism-hydrated-brief-${Date.now()}.md`;
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
            className="px-1.5 py-0.5 rounded bg-[#F4F4F5] text-[#15803D] font-mono text-[11px] border border-[#E6E5E0]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-[#18181B]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  /**
   * Minimalist markdown renderer with native table and fence support
   */
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const flushTable = (keyIdx: number) => {
      if (tableHeaders.length > 0) {
        elements.push(
          <div
            key={`tbl-${keyIdx}`}
            className="my-5 overflow-x-auto rounded-xl border border-[#E6E5E0] bg-[#FAFAF9]"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E6E5E0] bg-[#F7F7F5] text-[#4B5563] font-mono text-[11px]">
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="py-2.5 px-3.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEA] text-[#18181B] text-xs">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white transition-colors">
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
        if (isSeparator) return;

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
              className="my-4 rounded-xl border border-[#E6E5E0] bg-[#18181B] text-[#A7F3D0] overflow-hidden"
            >
              <pre className="p-4 font-mono text-xs leading-relaxed overflow-x-auto">
                {codeBlockContent.join('\n')}
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeBlockContent = [];
        } else {
          inCodeBlock = true;
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
            className="text-lg font-bold text-[#18181B] tracking-tight mt-3 mb-3 pb-2 border-b border-[#F0EFEA] flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#15803D]" />
            <span>{line.replace('# ', '')}</span>
          </h1>
        );
        return;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h2
            key={`h2-${index}`}
            className="text-sm font-semibold text-[#18181B] tracking-tight mt-5 mb-2 pb-1 border-b border-[#F0EFEA]"
          >
            {line.replace('## ', '')}
          </h2>
        );
        return;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-xs font-semibold text-[#15803D] font-mono mt-3 mb-1">
            {line.replace('### ', '')}
          </h3>
        );
        return;
      }

      // Horizontal rule
      if (line.trim() === '---') {
        elements.push(<hr key={`hr-${index}`} className="my-4 border-[#F0EFEA]" />);
        return;
      }

      // Bullet points
      if (line.trim().startsWith('- ')) {
        elements.push(
          <li key={`li-${index}`} className="text-xs text-[#4B5563] leading-relaxed ml-4 list-disc my-1">
            {formatInlineText(line.trim().slice(2))}
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
        <p key={`p-${index}`} className="text-xs text-[#4B5563] leading-[1.65] my-1">
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
    <section className="bg-white rounded-2xl border border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] mb-12 overflow-hidden transition-all">
      <details className="group">
        <summary className="p-5 flex items-center justify-between cursor-pointer list-none select-none hover:bg-[#FAFAF9] transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#15803D] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#15803D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#18181B]">
                  Detailed Grounded Synthesis &amp; Dual-Grounding Table
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono bg-[#ECFDF5] text-[#15803D] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Zero Cloud Bytes</span>
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Inspect complete Stage 3 markdown output and on-device token correlation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg border border-[#E6E5E0] bg-white hover:bg-[#F4F4F5] text-[#6B7280] hover:text-[#18181B] transition-colors text-xs flex items-center gap-1"
              title="Copy markdown report"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg border border-[#E6E5E0] bg-white hover:bg-[#F4F4F5] text-[#6B7280] hover:text-[#18181B] transition-colors text-xs flex items-center gap-1"
              title="Download report (.md)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            {onOpenSafeExport && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSafeExport();
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#15803D] transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
                title="Redact PII & Draft Local Action Letter"
              >
                <FileLock2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Safe Export</span>
              </button>
            )}
            <ChevronDown className="w-4 h-4 text-[#6B7280] group-open:rotate-180 transition-transform ml-1" />
          </div>
        </summary>

        <div className="p-6 pt-2 border-t border-[#F0EFEA] bg-white">
          {renderMarkdown(cleanMarkdownFences(hydratedReport))}
        </div>
      </details>
    </section>
  );
};

export default FullReportAccordion;
