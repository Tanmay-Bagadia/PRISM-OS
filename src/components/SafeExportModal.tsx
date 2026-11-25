import React from 'react';
import type { AbstractTopology } from '../types/prism';
import {
  buildRedactedDocument,
  generateLocalActionLetter,
  ACTION_LETTER_OPTIONS,
  type ActionLetterType,
  type MaskConfig,
} from '../lib/prism/redactor';
import {
  ShieldCheck,
  X,
  Copy,
  Check,
  Download,
  FileLock2,
  Mail,
  Sparkles,
  RotateCw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SafeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawContent: string;
  hydratedReport: string;
  topology: AbstractTopology | null;
  documentTitle?: string;
}

const TOGGLE_ITEMS: ReadonlyArray<{
  key: keyof MaskConfig;
  countKey: 'names' | 'ids' | 'contact' | 'financial';
  label: string;
  example: string;
}> = [
  {
    key: 'maskNames',
    countKey: 'names',
    label: 'Mask Names & Orgs',
    example: '[PERSON_A], [ORGANIZATION_A]',
  },
  {
    key: 'maskIds',
    countKey: 'ids',
    label: 'Mask IDs & Accounts',
    example: '[REDACTED_ID], [REDACTED_ACCOUNT]',
  },
  {
    key: 'maskContact',
    countKey: 'contact',
    label: 'Mask Contact Info',
    example: '[REDACTED_EMAIL], [REDACTED_PHONE]',
  },
  {
    key: 'maskFinancial',
    countKey: 'financial',
    label: 'Mask Financial Amounts',
    example: '[REDACTED_AMOUNT]',
  },
];

export const SafeExportModal: React.FC<SafeExportModalProps> = ({
  isOpen,
  onClose,
  rawContent,
  hydratedReport,
  topology,
  documentTitle = 'prism-safe-export',
}) => {
  const [activeTab, setActiveTab] = React.useState<'redacted' | 'letter'>('redacted');
  const [maskConfig, setMaskConfig] = React.useState<MaskConfig>({
    maskNames: true,
    maskIds: true,
    maskContact: true,
    maskFinancial: true,
  });

  const [letterType, setLetterType] = React.useState<ActionLetterType>('insurance_appeal');
  const [letterText, setLetterText] = React.useState<string>('');
  const [letterSource, setLetterSource] = React.useState<'NANO_ON_DEVICE' | 'LOCAL_SYNTHESIS' | null>(null);
  const [isDrafting, setIsDrafting] = React.useState(false);

  const [copiedRedacted, setCopiedRedacted] = React.useState(false);
  const [copiedLetter, setCopiedLetter] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const redactedResult = React.useMemo(
    () => buildRedactedDocument(rawContent, topology, maskConfig),
    [rawContent, topology, maskConfig]
  );

  // Reset drafted letter if source content changes while closed
  React.useEffect(() => {
    if (!isOpen) return;
    setCopiedRedacted(false);
    setCopiedLetter(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleCategory = (key: keyof MaskConfig) => {
    setMaskConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyRedacted = () => {
    if (!redactedResult.redactedText) return;
    navigator.clipboard.writeText(redactedResult.redactedText);
    setCopiedRedacted(true);
    setTimeout(() => setCopiedRedacted(false), 2000);
  };

  const handleDownloadMarkdown = (content: string, suffix: string) => {
    if (!content) return;
    const safeName = documentTitle.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}-${suffix}-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDraftLetter = async () => {
    setIsDrafting(true);
    try {
      // Always generate letter from fully-masked document so raw PII never enters letter context
      const fullyMasked = buildRedactedDocument(rawContent, topology, {
        maskNames: true,
        maskIds: true,
        maskContact: true,
        maskFinancial: true,
      });
      const result = await generateLocalActionLetter({
        letterType,
        redactedDocument: fullyMasked.redactedText,
        hydratedReport,
        topology,
        rawContent,
      });
      setLetterText(result.letter);
      setLetterSource(result.source);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopyLetter = () => {
    if (!letterText) return;
    navigator.clipboard.writeText(letterText);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  // Render redacted text with inline visual pills for masked tokens
  const renderHighlightedRedacted = (text: string) => {
    if (!text) {
      return (
        <span className="text-[#9CA3AF]">
          No local document content loaded yet. Add a file or paste notes in the workspace to preview redactions.
        </span>
      );
    }
    const tokenRe = /(\[(?:PERSON_[A-Z0-9]+|ORGANIZATION_[A-Z0-9]+|REDACTED_[A-Z]+)\])/g;
    const parts = text.split(tokenRe);
    return parts.map((part, idx) => {
      if (tokenRe.test(part)) {
        tokenRe.lastIndex = 0;
        return (
          <span
            key={idx}
            className="inline-block px-1.5 py-0.2 mx-0.5 rounded bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] font-semibold text-[11px]"
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
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
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-[#E6E5E0] shadow-[0_20px_50px_rgba(24,24,27,0.14)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F0EFEA] flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#15803D]">
              <FileLock2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-semibold text-[#18181B] tracking-tight">
                  Safe-to-Share Export &amp; Action Letter
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D] text-[10px] font-mono font-semibold tabular-nums">
                  <ShieldCheck className="w-3 h-3" />
                  <span>0 Bytes Cloud • On-Device</span>
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Scrub sensitive PII locally before sharing or draft a masked dispute/cover letter with Gemini Nano.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
            aria-label="Close Safe Export modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 pt-3 pb-0 bg-[#FAFAF9] border-b border-[#E6E5E0] flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('redacted')}
              className={`px-3.5 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'redacted'
                  ? 'border-[#18181B] text-[#18181B] bg-white'
                  : 'border-transparent text-[#6B7280] hover:text-[#18181B]'
              }`}
            >
              <FileLock2 className="w-3.5 h-3.5" />
              <span>Redacted Document</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#ECFDF5] text-[#15803D] font-mono text-[10px] tabular-nums">
                {redactedResult.counts.total} masked
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('letter')}
              className={`px-3.5 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'letter'
                  ? 'border-[#18181B] text-[#18181B] bg-white'
                  : 'border-transparent text-[#6B7280] hover:text-[#18181B]'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Local Action Letter</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pb-2 text-[11px] font-mono text-[#6B7280] tabular-nums">
            <span>{redactedResult.placeholders.length} active mask tokens</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#F7F7F5]">
          {activeTab === 'redacted' ? (
            <div className="space-y-4">
              {/* Granular Privacy Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {TOGGLE_ITEMS.map((item) => {
                  const isOn = maskConfig[item.key];
                  const count = redactedResult.counts[item.countKey];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      onClick={() => toggleCategory(item.key)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isOn
                          ? 'bg-white border-[#A7F3D0] shadow-[0_1px_2px_rgba(21,128,61,0.06)]'
                          : 'bg-[#F0EFEA]/60 border-[#E6E5E0] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#18181B] flex items-center gap-1.5">
                          {isOn ? (
                            <EyeOff className="w-3.5 h-3.5 text-[#15803D]" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-[#71717A]" />
                          )}
                          <span>{item.label}</span>
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold tabular-nums ${
                            isOn
                              ? 'bg-[#ECFDF5] text-[#15803D]'
                              : 'bg-[#E6E5E0] text-[#6B7280]'
                          }`}
                        >
                          {count}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[#6B7280] truncate">{item.example}</p>
                    </button>
                  );
                })}
              </div>

              {/* Live Redacted Document Preview */}
              <div className="bg-white rounded-xl border border-[#E6E5E0] overflow-hidden">
                <div className="px-4 py-2.5 bg-[#FAFAF9] border-b border-[#F0EFEA] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-medium text-[#4B5563]">
                    LIVE REDACTED PREVIEW ({redactedResult.redactedText.length} chars)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyRedacted}
                      disabled={!redactedResult.redactedText}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E6E5E0] bg-white hover:bg-[#F7F7F5] text-xs font-medium text-[#18181B] disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      {copiedRedacted ? (
                        <Check className="w-3.5 h-3.5 text-[#15803D]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
                      )}
                      <span>{copiedRedacted ? 'Copied' : 'Copy Redacted Text'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadMarkdown(redactedResult.redactedText, 'redacted')}
                      disabled={!redactedResult.redactedText}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-xs font-medium text-white disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>

                <pre className="p-4 font-mono text-xs leading-relaxed text-[#18181B] whitespace-pre-wrap max-h-[360px] overflow-y-auto selection:bg-[#ECFDF5]">
                  {renderHighlightedRedacted(redactedResult.redactedText)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Letter Type Selector & Generate Controls */}
              <div className="bg-white rounded-xl border border-[#E6E5E0] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label
                      htmlFor="action-letter-select"
                      className="block text-xs font-semibold text-[#18181B]"
                    >
                      Action / Dispute Letter Template
                    </label>
                    <p className="text-[11px] text-[#6B7280]">
                      Drafted 100% on-device referencing only masked placeholders—never raw PII.
                    </p>
                  </div>

                  {letterSource && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D] text-[10px] font-mono font-semibold self-start sm:self-auto">
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {letterSource === 'NANO_ON_DEVICE'
                          ? 'Gemini Nano (ON_DEVICE)'
                          : 'On-Device Synthesis (0 B Cloud)'}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    id="action-letter-select"
                    value={letterType}
                    onChange={(e) => setLetterType(e.target.value as ActionLetterType)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F7F7F5] border border-[#E6E5E0] text-xs font-medium text-[#18181B] focus:outline-none focus:border-[#18181B]"
                  >
                    {ACTION_LETTER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleDraftLetter}
                    disabled={isDrafting || !rawContent.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isDrafting ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin text-[#4ADE80]" />
                        <span>Drafting On-Device...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#4ADE80]" />
                        <span>Draft On-Device Letter</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Letter Output Area */}
              <div className="bg-white rounded-xl border border-[#E6E5E0] overflow-hidden">
                <div className="px-4 py-2.5 bg-[#FAFAF9] border-b border-[#F0EFEA] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-medium text-[#4B5563]">
                    READY-TO-SEND MASKED DRAFT
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLetter}
                      disabled={!letterText}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E6E5E0] bg-white hover:bg-[#F7F7F5] text-xs font-medium text-[#18181B] disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      {copiedLetter ? (
                        <Check className="w-3.5 h-3.5 text-[#15803D]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
                      )}
                      <span>{copiedLetter ? 'Copied' : 'Copy Letter'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadMarkdown(letterText, letterType)}
                      disabled={!letterText}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-xs font-medium text-white disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>

                {letterText ? (
                  <textarea
                    value={letterText}
                    onChange={(e) => setLetterText(e.target.value)}
                    rows={14}
                    className="w-full p-4 font-mono text-xs leading-relaxed text-[#18181B] bg-white resize-y focus:outline-none selection:bg-[#ECFDF5]"
                  />
                ) : (
                  <div className="p-10 text-center text-xs text-[#6B7280]">
                    Select a letter template above and click <strong>Draft On-Device Letter</strong> to
                    generate a masked, ready-to-send letter strictly on your device.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafeExportModal;

