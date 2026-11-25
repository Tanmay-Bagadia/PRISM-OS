import React from 'react';
import type { StageTelemetry } from '../types/prism';
import { Cloud, Zap, AlertTriangle, ShieldCheck, X } from 'lucide-react';

export type ExecutionModeKind = 'cloud' | 'cached' | 'fallback' | 'vault';

export interface ExecutionModeInfo {
  kind: ExecutionModeKind;
  badgeLabel: string;
  toastMessage: string;
  pillClasses: string;
  dotColor: string;
}

/**
 * Derives the exact execution mode from the `cloud-blueprint` stage telemetry.
 */
export function deriveExecutionMode(
  telemetry: StageTelemetry[] | null | undefined
): ExecutionModeInfo | null {
  if (!telemetry || telemetry.length === 0) return null;
  const stage2 = telemetry.find((s) => s.stageName === 'cloud-blueprint');
  if (!stage2) return null;

  // 1. Offline / Cached Blueprint
  if (stage2.cacheStatus === 'hit') {
    return {
      kind: 'cached',
      badgeLabel: 'Cached Blueprint • Instant Offline Hit (0 B sent)',
      toastMessage: 'Executed instantaneously from local cached blueprint (0 bytes sent).',
      pillClasses: 'bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D]',
      dotColor: 'bg-[#15803D]',
    };
  }

  // 2. Live Cloud Gemini
  if (stage2.inferenceSource === 'IN_CLOUD' && !stage2.fallbackUsed) {
    return {
      kind: 'cloud',
      badgeLabel: `Cloud Gemini 2.5 • Anonymized Topology (${stage2.bytesSentToCloud} B sent)`,
      toastMessage: 'Analyzed via Cloud Gemini using anonymized topology (0 bytes raw PII sent).',
      pillClasses: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]',
      dotColor: 'bg-[#1D4ED8]',
    };
  }

  // 3. Fallback Triggered
  if (stage2.fallbackUsed) {
    return {
      kind: 'fallback',
      badgeLabel: 'Local Fallback Used • Cloud Unavailable (0 B sent)',
      toastMessage: 'Cloud Gemini unavailable — automatically fell back to On-Device Gemini Nano.',
      pillClasses: 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]',
      dotColor: 'bg-[#B45309]',
    };
  }

  // 4. Local-Only Vault
  return {
    kind: 'vault',
    badgeLabel: '100% On-Device Vault • Air-Gapped (0 B sent)',
    toastMessage: 'Processed 100% on-device in Local Vault mode (0 bytes sent).',
    pillClasses: 'bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D]',
    dotColor: 'bg-[#15803D]',
  };
}

export const ExecutionStatusPill: React.FC<{ telemetry?: StageTelemetry[] | null }> = ({
  telemetry,
}) => {
  const info = deriveExecutionMode(telemetry);
  if (!info) return null;

  const Icon =
    info.kind === 'cloud'
      ? Cloud
      : info.kind === 'cached'
      ? Zap
      : info.kind === 'fallback'
      ? AlertTriangle
      : ShieldCheck;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium tabular-nums ${info.pillClasses}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{info.badgeLabel}</span>
    </span>
  );
};

interface ExecutionToastProps {
  message: string | null;
  dotColor?: string;
  showReceiptLink?: boolean;
  onViewReceipt?: () => void;
  onDismiss: () => void;
}

export const ExecutionToast: React.FC<ExecutionToastProps> = ({
  message,
  dotColor = 'bg-[#15803D]',
  showReceiptLink = false,
  onViewReceipt,
  onDismiss,
}) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-md px-4 py-2.5 rounded-xl bg-white border border-[#E6E5E0] text-xs font-medium text-[#18181B] shadow-[0_8px_24px_rgba(24,24,27,0.1)] flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span className="leading-snug">{message}</span>
      {showReceiptLink && onViewReceipt && (
        <button
          type="button"
          onClick={() => {
            onViewReceipt();
            onDismiss();
          }}
          className="text-[#15803D] hover:underline font-semibold whitespace-nowrap cursor-pointer"
        >
          View Receipt
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="text-[#9CA3AF] hover:text-[#18181B] p-0.5 rounded transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

