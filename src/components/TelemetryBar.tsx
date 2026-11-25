import React from 'react';
import type { NanoAvailability, DeviceContext, StageTelemetry } from '../types/prism';
import {
  Infinity as InfinityIcon,
  ShieldCheck,
  RotateCcw,
  FileLock2,
  History,
} from 'lucide-react';

interface TelemetryBarProps {
  nanoStatus: NanoAvailability;
  device: DeviceContext;
  onUpdateDevice?: (updated: Partial<DeviceContext>) => void;
  telemetry: StageTelemetry[] | null;
  isRunning: boolean;
  activeStageIndex: number;
  onOpenDrawer?: () => void;
  blueprintCount?: number;
  isFirebaseReady?: boolean;
  onOpenPrivacyReceipt: () => void;
  onOpenSafeExport?: () => void;
  onOpenHistory?: () => void;
  historyCount?: number;
  onToggleOffline: () => void;
  onClearSession?: () => void;
  hasActiveSession?: boolean;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  nanoStatus,
  device,
  onOpenPrivacyReceipt,
  onOpenSafeExport,
  onOpenHistory,
  historyCount = 0,
  onToggleOffline,
  onClearSession,
  hasActiveSession = false,
}) => {
  // Live on-device Nano indicator
  const renderNanoStatusBadge = () => {
    if (nanoStatus.status === 'available') {
      return (
        <div
          title="Chrome Gemini Nano 4 active on-device"
          className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D] text-[11px] font-semibold"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-pulse" />
          <span>Protected On-Device</span>
        </div>
      );
    }
    if (nanoStatus.status === 'downloading') {
      const pct = Math.round((nanoStatus.downloadProgress || 0.1) * 100);
      return (
        <div
          title={`Downloading Gemini Nano weights (${pct}%)`}
          className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-[11px] font-semibold"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] animate-ping" />
          <span>Downloading Nano {pct}%</span>
        </div>
      );
    }
    return (
      <div
        title={nanoStatus.error || 'Gemini Nano unavailable. On-device deterministic scrubber fallback active.'}
        className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-[11px] font-semibold"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
        <span>Local Scrubber Active</span>
      </div>
    );
  };

  return (
    <header className="sticky top-0 h-14 bg-white border-b border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] z-30 transition-colors">
      <div className="w-full h-14 px-4 sm:px-6 flex items-center justify-between mx-auto max-w-6xl">
        {/* Brand & Security Attestation Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#18181B] flex items-center justify-center text-white shadow-sm">
              <InfinityIcon className="w-4 h-4" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[#18181B]">PRISM</span>
          </div>
          {renderNanoStatusBadge()}
        </div>

        {/* Trailing Status & Primary Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Subtle New Session / Clear Button */}
          {hasActiveSession && onClearSession && (
            <button
              onClick={onClearSession}
              title="Clear all attached files, notes, and analysis outputs"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          )}

          {/* Offline Air-Gap Toggle */}
          <div className="flex items-center gap-2 pr-2 border-r border-[#E6E5E0]">
            <span className="text-[11px] font-medium text-[#4B5563]">Offline</span>
            <button
              aria-checked={!device.online}
              role="switch"
              onClick={onToggleOffline}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors relative focus:outline-none cursor-pointer ${
                !device.online ? 'bg-[#15803D]' : 'bg-[#E4E4DF]'
              }`}
              title={!device.online ? 'Simulating offline air-gap (IndexedDB SHA-256 cache)' : 'Connected to Network'}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                  !device.online ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* History & Trends Action Button */}
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6E5E0] hover:bg-[#F7F7F5] rounded-lg text-[#18181B] text-xs font-medium shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] active:scale-[0.99] transition-all cursor-pointer tabular-nums"
              title="Open Local History & Longitudinal Trends"
            >
              <History className="w-3.5 h-3.5 text-[#4B5563]" />
              <span className="hidden md:inline">History &amp; Trends</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#F4F4F5] text-[#4B5563] font-mono text-[10px] tabular-nums">
                {historyCount}
              </span>
            </button>
          )}

          {/* Safe Export Action Button */}
          {onOpenSafeExport && (
            <button
              onClick={onOpenSafeExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6E5E0] hover:bg-[#ECFDF5] hover:border-[#A7F3D0] rounded-lg text-[#18181B] text-xs font-medium shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] active:scale-[0.99] transition-all cursor-pointer"
              title="Open Safe-to-Share Redacted Export & Local Action Letter"
            >
              <FileLock2 className="w-3.5 h-3.5 text-[#15803D]" />
              <span className="hidden sm:inline">Safe Export</span>
            </button>
          )}

          {/* Privacy Receipt Action Button (Triggers Drawer) */}
          <button
            onClick={onOpenPrivacyReceipt}
            id="openReceiptBtn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6E5E0] hover:bg-[#F7F7F5] rounded-lg text-[#18181B] text-xs font-medium shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] active:scale-[0.99] transition-all cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
            <span>Privacy Receipt</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TelemetryBar;
