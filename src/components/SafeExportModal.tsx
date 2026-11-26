import React from 'react';
import type { AbstractTopology } from '../types/prism';
import type { BenchmarkFinding } from '../types/benchmark';
import type { MetricDelta } from '../types/longitudinal';
import type { ExportPrivacyMode } from '../types/export';
import { buildExportPayload } from '../lib/prism/exportFormatter';
import {
  ShieldCheck,
  Lock,
  AlertTriangle,
  X,
  Copy,
  Check,
  Download,
  Mail,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';

export interface SafeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawContent?: string;
  hydratedReport: string;
  topology?: AbstractTopology | null;
  documentTitle?: string;
  redactionMap?: Record<string, string>;
  benchmarkFindings?: BenchmarkFinding[];
  metricDeltas?: MetricDelta[];
}

const ORG_LABEL_RE =
  /\b(?:Company|Organization|Org|Disclosing Party|Receiving Party|Employer|Provider|Hospital|Clinic|Vendor|Institution)[ \t]*:[ \t]*([A-Z][A-Za-z0-9&.,'’-]+(?:[ \t]+[A-Z0-9][A-Za-z0-9&.,'’-]*){0,5})/g;

const PERSON_LABEL_RE =
  /\b(?:Patient(?:[ \t]+Name)?|Client|Customer|Employee(?:[ \t]+Name)?|Doctor|Physician|Attending(?:[ \t]+Physician)?|Signatory|Subject|Target|CFO|CEO|CTO|Name|Filed[ \t]+By|Inventor)[ \t]*:[ \t]*([A-Z][a-zA-Z.'-]+(?:[ \t]+[A-Z][a-zA-Z.'-]+){1,3})/g;

const TITLE_PERSON_RE = /\b(?:Dr|Mr|Mrs|Ms|Prof)\.[ \t]+[A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,2}\b/g;

const ORG_SUFFIX_RE =
  /\b[A-Z][A-Za-z0-9&.'-]*(?:[ \t]+[A-Z][A-Za-z0-9&.'-]*){0,4}[ \t]+(?:Pvt\.?[ \t]*Ltd\.?|Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|LLP|LP|Therapeutics|Technologies|Robotics|Hospital|Clinic|Labs)\b/g;

function indexToTag(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < letters.length) return letters[index]!;
  return `${letters[index % letters.length]}${Math.floor(index / letters.length)}`;
}

function deriveFallbackRedactionMap(
  rawContent?: string,
  topology?: AbstractTopology | null
): Record<string, string> {
  if (!rawContent?.trim()) return {};

  const map: Record<string, string> = {};
  let personIdx = 0;
  let orgIdx = 0;

  // Offset indices if topology already defines abstract Person/Organization entities
  if (topology?.entities) {
    for (const entity of topology.entities) {
      if (entity.type === 'person') personIdx = Math.max(personIdx, 1);
      if (entity.type === 'organization') orgIdx = Math.max(orgIdx, 1);
    }
  }

  const addOrg = (raw: string) => {
    const clean = raw.trim();
    if (clean.length > 1 && !map[clean]) {
      map[clean] = `[ORGANIZATION_${indexToTag(orgIdx++)}]`;
    }
  };

  const addPerson = (raw: string) => {
    const clean = raw.trim();
    if (clean.length > 1 && !map[clean]) {
      map[clean] = `[PERSON_${indexToTag(personIdx++)}]`;
    }
  };

  for (const m of rawContent.matchAll(ORG_LABEL_RE)) {
    if (m[1]) addOrg(m[1]);
  }
  for (const m of rawContent.matchAll(ORG_SUFFIX_RE)) {
    if (m[0]) addOrg(m[0]);
  }
  for (const m of rawContent.matchAll(PERSON_LABEL_RE)) {
    if (m[1]) addPerson(m[1]);
  }
  for (const m of rawContent.matchAll(TITLE_PERSON_RE)) {
    if (m[0]) addPerson(m[0]);
  }

  return map;
}

export const SafeExportModal: React.FC<SafeExportModalProps> = ({
  isOpen,
  onClose,
  rawContent = '',
  hydratedReport,
  topology = null,
  documentTitle = 'prism-safe-export',
  redactionMap,
  benchmarkFindings = [],
  metricDeltas = [],
}) => {
  const [mode, setMode] = React.useState<ExportPrivacyMode>('MASKED_SAFE');
  const [unmaskedConfirmed, setUnmaskedConfirmed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (isOpen) {
      setMode('MASKED_SAFE');
      setUnmaskedConfirmed(false);
      setCopied(false);
    }
  }, [isOpen]);

  const effectiveRedactionMap = React.useMemo(() => {
    if (redactionMap && Object.keys(redactionMap).length > 0) {
      return redactionMap;
    }
    return deriveFallbackRedactionMap(rawContent, topology);
  }, [redactionMap, rawContent, topology]);

  const payload = React.useMemo(
    () =>
      buildExportPayload({
        mode,
        title: documentTitle,
        hydratedReport,
        redactionMap: effectiveRedactionMap,
        benchmarkFindings,
        metricDeltas,
      }),
    [mode, documentTitle, hydratedReport, effectiveRedactionMap, benchmarkFindings, metricDeltas]
  );

  if (!isOpen) return null;

  const fullClipboardText = `${payload.subject}\n\n${payload.bodyText}`;
  const isMasked = mode === 'MASKED_SAFE';
  const canOpenExternalShare = isMasked || unmaskedConfirmed;

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  const handleCopyText = () => {
    copyToClipboard(fullClipboardText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExternalShare = (url: string) => {
    if (!canOpenExternalShare) return;
    copyToClipboard(fullClipboardText);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = (ext: 'md' | 'txt') => {
    const baseName = (documentTitle || 'prism-export')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .toLowerCase();
    const suffix = isMasked ? 'masked' : 'unmasked';
    const content = ext === 'md' ? `# ${payload.subject}\n\n${payload.bodyText}` : fullClipboardText;
    const mime = ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}-${suffix}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#18181B]/30 backdrop-blur-[2px] transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-[#FFFFFF] rounded-2xl border border-[#E6E5E0] shadow-[0_20px_50px_rgba(24,24,27,0.14)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E6E5E0] flex items-center justify-between gap-3 bg-[#FFFFFF]">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                isMasked
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D]'
                  : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
              }`}
            >
              {isMasked ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#18181B] tracking-tight">
                Safe-to-Share Export
              </h2>
              <p className="text-xs text-[#6B7280]">
                Inspect the exact plain-text brief before sharing via Gmail, WhatsApp, or local file.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F7F7F5] transition-colors cursor-pointer"
            aria-label="Close Safe Export modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher (Top Segmented Control) */}
        <div className="px-5 py-3.5 bg-[#F7F7F5] border-b border-[#E6E5E0] space-y-2.5">
          <div
            className="inline-grid grid-cols-2 p-1 rounded-xl bg-[#FFFFFF] border border-[#E6E5E0] w-full sm:w-auto"
            role="tablist"
            aria-label="Export privacy mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isMasked}
              onClick={() => {
                setMode('MASKED_SAFE');
                setUnmaskedConfirmed(false);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                isMasked
                  ? 'bg-[#18181B] text-[#FFFFFF]'
                  : 'text-[#6B7280] hover:text-[#18181B]'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isMasked ? 'text-[#4ADE80]' : ''}`} />
              <span>Masked (Zero-PII Safe)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={!isMasked}
              onClick={() => setMode('UNMASKED_LOCAL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                !isMasked
                  ? 'bg-[#18181B] text-[#FFFFFF]'
                  : 'text-[#6B7280] hover:text-[#18181B]'
              }`}
            >
              <Lock className={`w-3.5 h-3.5 ${!isMasked ? 'text-[#FBBF24]' : ''}`} />
              <span>Unmasked (Full Local)</span>
            </button>
          </div>

          {/* Privacy Status Badge */}
          {isMasked ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D] text-xs font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="tabular-nums">
                {payload.maskedEntityCount} sensitive items masked • Safe for external sharing
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Contains raw local names &amp; figures • Share only with trusted recipients</span>
              </div>

              <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#FDE68A] text-xs text-[#18181B] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unmaskedConfirmed}
                  onChange={(e) => setUnmaskedConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-[#D4D4D8] accent-[#18181B] cursor-pointer"
                />
                <span>
                  I confirm this unmasked brief contains sensitive local data and I am opening external share
                  links only for trusted recipients.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Live Preview Pane */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#F7F7F5]">
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E6E5E0] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#FFFFFF] border-b border-[#E6E5E0] flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-semibold text-[#18181B] uppercase tracking-wider">
                Live Plain-Text Preview
              </span>
              <span className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                {payload.characterCount.toLocaleString()} chars
              </span>
            </div>

            <div className="px-4 py-2.5 bg-[#F7F7F5]/70 border-b border-[#E6E5E0] text-xs">
              <span className="font-mono text-[#6B7280] mr-2">Subject:</span>
              <span className="font-semibold text-[#18181B]">{payload.subject}</span>
            </div>

            <pre className="p-4 font-mono text-xs leading-relaxed text-[#18181B] whitespace-pre-wrap max-h-[340px] overflow-y-auto selection:bg-[#ECFDF5]">
              {payload.bodyText || 'No report content available to preview.'}
            </pre>
          </div>
        </div>

        {/* One-Click Action Buttons Footer */}
        <div className="px-5 py-4 bg-[#FFFFFF] border-t border-[#E6E5E0] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExternalShare(payload.gmailComposeUrl)}
              disabled={!canOpenExternalShare}
              title={
                canOpenExternalShare
                  ? 'Copy full text & open Gmail compose'
                  : 'Confirm local privacy notice above to enable external sharing'
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#FFFFFF] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send via Gmail</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </button>

            <button
              type="button"
              onClick={() => handleExternalShare(payload.whatsappShareUrl)}
              disabled={!canOpenExternalShare}
              title={
                canOpenExternalShare
                  ? 'Copy full text & open WhatsApp share'
                  : 'Confirm local privacy notice above to enable external sharing'
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-[#FFFFFF] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Send via WhatsApp</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6E5E0] bg-[#FFFFFF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#18181B] transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#15803D]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
              )}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownload('md')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6E5E0] bg-[#FFFFFF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#18181B] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>.md</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownload('txt')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6E5E0] bg-[#FFFFFF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#18181B] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>.txt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeExportModal;
