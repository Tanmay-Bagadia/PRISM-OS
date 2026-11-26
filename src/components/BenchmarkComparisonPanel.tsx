import React, { useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Compass,
  FileText,
  Scale,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import type { BenchmarkFinding } from '../types/benchmark';

export interface BenchmarkReferenceInputProps {
  sourceTitle: string;
  onChangeSourceTitle: (v: string) => void;
  referenceText: string;
  onChangeReferenceText: (v: string) => void;
}

export const BenchmarkReferenceInput: React.FC<BenchmarkReferenceInputProps> = ({
  sourceTitle,
  onChangeSourceTitle,
  referenceText,
  onChangeReferenceText,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasContent = Boolean(sourceTitle.trim() || referenceText.trim());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      onChangeReferenceText(text);
      if (!sourceTitle.trim()) {
        onChangeSourceTitle(file.name);
      }
    } catch {
      setFileError('Unable to read the selected file in-browser.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    setFileError(null);
    onChangeSourceTitle('');
    onChangeReferenceText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] overflow-hidden transition-colors">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F7F7F5]/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#F7F7F5] border border-[#E6E5E0] flex items-center justify-center shrink-0">
            <Scale className="w-3.5 h-3.5 text-[#18181B]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#18181B] truncate">
                Benchmark &amp; Reference Source (Optional)
              </span>
              {hasContent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[10px] font-medium text-[#15803D] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                  Attached
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#6B7280] truncate">
              Compare local ratios against a user-supplied reference or standard baseline
            </p>
          </div>
        </div>
        <span className="text-[#6B7280] shrink-0">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-3 border-t border-[#E6E5E0] bg-[#F7F7F5]/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
            <div className="flex-1 min-w-0">
              <label
                htmlFor="prism-benchmark-source-title"
                className="block text-[11px] font-medium text-[#4B5563] mb-1"
              >
                Source Citation / Title
              </label>
              <input
                id="prism-benchmark-source-title"
                type="text"
                value={sourceTitle}
                onChange={(e) => onChangeSourceTitle(e.target.value)}
                placeholder="Enter source title or citation..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E5E0] text-xs text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#18181B] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload benchmark reference file"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6E5E0] text-xs font-medium text-[#18181B] hover:bg-[#F7F7F5] transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#4B5563]" />
                <span>Load File</span>
              </button>

              {hasContent && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white border border-[#E6E5E0] text-xs font-medium text-[#6B7280] hover:text-[#18181B] hover:bg-[#F7F7F5] transition-colors"
                  title="Clear benchmark reference"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {fileError && (
            <p className="text-[11px] text-[#B91C1C]" role="alert">
              {fileError}
            </p>
          )}

          <div>
            <label
              htmlFor="prism-benchmark-reference-text"
              className="block text-[11px] font-medium text-[#4B5563] mb-1"
            >
              Reference Metrics &amp; Yardsticks (.txt, .md, .csv, .json)
            </label>
            <textarea
              id="prism-benchmark-reference-text"
              rows={4}
              value={referenceText}
              onChange={(e) => onChangeReferenceText(e.target.value)}
              placeholder="Paste reference metrics, thresholds, or yardsticks..."
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E6E5E0] text-xs text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#18181B] transition-colors resize-y leading-relaxed"
            />
          </div>

          <div className="flex items-start gap-2 text-[11px] text-[#4B5563] bg-white/80 border border-[#E6E5E0] rounded-xl px-3 py-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#15803D] shrink-0 mt-0.5" />
            <span>
              Reference metrics stay on-device and are sanitized into abstract ratios before any
              cloud comparison.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export interface GroundedBenchmarksGridProps {
  findings: BenchmarkFinding[];
  isRunning?: boolean;
}

function getStandingBadgeStyle(standing: string): string {
  const normalized = standing.toLowerCase();
  if (
    /critical|severe|deficit|below|lagging|underperform|breach|high risk|bottom/.test(normalized)
  ) {
    return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
  }
  if (/watch|moderate|border|near|caution|mixed|median|fair/.test(normalized)) {
    return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
  }
  if (/top|strong|above|exceed|optimal|favorable|outperform|ahead|on target/.test(normalized)) {
    return 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]';
  }
  return 'bg-[#F7F7F5] text-[#18181B] border-[#E6E5E0]';
}

export const GroundedBenchmarksGrid: React.FC<GroundedBenchmarksGridProps> = ({
  findings,
  isRunning = false,
}) => {
  if (findings.length === 0 && !isRunning) {
    return null;
  }

  return (
    <section className="mb-7" aria-label="Grounded Benchmarks">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-lg font-semibold text-[#18181B] tracking-tight">
            Grounded Benchmarks
          </h2>
          <p className="text-xs text-[#6B7280]">
            {isRunning && findings.length === 0
              ? 'Evaluating anonymized ratios against benchmark targets...'
              : 'Locally hydrated comparisons anchored to cited reference sources'}
          </p>
        </div>
      </div>

      {isRunning && findings.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-32 bg-[#EFEFEA] rounded" />
                <div className="h-5 w-20 bg-[#EFEFEA] rounded-full" />
              </div>
              <div className="h-9 w-full bg-[#F7F7F5] rounded-xl border border-[#E6E5E0]" />
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-[#EFEFEA] rounded" />
                <div className="h-3 w-4/5 bg-[#EFEFEA] rounded" />
              </div>
              <div className="h-6 w-44 bg-[#F7F7F5] rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
          {findings.map((finding) => {
            const isUserSupplied = finding.sourceType === 'USER_SUPPLIED';
            const standingStyle = getStandingBadgeStyle(finding.percentileOrStanding);

            return (
              <div
                key={`${finding.ratioKey}-${finding.sourceCitation}`}
                className="bg-white rounded-2xl p-5 border border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] flex flex-col justify-between gap-4 hover:border-zinc-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                      <h3
                        className="text-xs font-semibold text-[#18181B] truncate"
                        title={finding.label}
                      >
                        {finding.label}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-medium shrink-0 ${standingStyle}`}
                    >
                      {finding.percentileOrStanding}
                    </span>
                  </div>

                  {/* Observed vs. Benchmark Comparison Badge */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F7F7F5] border border-[#E6E5E0]">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">
                        Observed
                      </span>
                      <span
                        className="block text-sm font-bold text-[#18181B] tabular-nums truncate mt-0.5"
                        title={finding.observedDisplay}
                      >
                        {finding.observedDisplay}
                      </span>
                    </div>
                    <div className="min-w-0 border-l border-[#E6E5E0] pl-2.5">
                      <span className="block text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">
                        Benchmark
                      </span>
                      <span
                        className="block text-sm font-semibold text-[#4B5563] tabular-nums truncate mt-0.5"
                        title={finding.benchmarkDisplay}
                      >
                        {finding.benchmarkDisplay}
                      </span>
                    </div>
                  </div>

                  {/* Locally Hydrated Impact Statement */}
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    {finding.localImpactSummary}
                  </p>
                </div>

                {/* Prominent Source Citation Pill */}
                <div className="pt-3 border-t border-[#F0EFEA] flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium max-w-full ${
                      isUserSupplied
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D]'
                        : 'bg-[#F7F7F5] border-[#E6E5E0] text-[#18181B]'
                    }`}
                    title={finding.sourceCitation}
                  >
                    {isUserSupplied ? (
                      <BookOpen className="w-3 h-3 shrink-0" />
                    ) : (
                      <Compass className="w-3 h-3 shrink-0 text-[#4B5563]" />
                    )}
                    <span className="font-semibold shrink-0">
                      {isUserSupplied ? 'User-Cited Source' : 'Standard Baseline'}:
                    </span>
                    <span className="truncate">{finding.sourceCitation}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
