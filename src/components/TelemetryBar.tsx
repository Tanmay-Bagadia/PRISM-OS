import React from 'react';
import type { NanoAvailability, DeviceContext, StageTelemetry } from '../types/prism';
import {
  Infinity as InfinityIcon,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import type { BenchmarkScenario } from '../data/scenarios';
import { BENCHMARK_SCENARIOS } from '../data/scenarios';

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
  selectedScenarioId: string;
  onSelectScenario: (scen: BenchmarkScenario) => void;
  onToggleOffline: () => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  nanoStatus,
  device,
  onOpenPrivacyReceipt,
  selectedScenarioId,
  onSelectScenario,
  onToggleOffline,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary 3 scenarios on bar + extra 2 in dropdown
  const primaryScenarios = BENCHMARK_SCENARIOS.slice(0, 3);
  const extraScenarios = BENCHMARK_SCENARIOS.slice(3);

  const isExtraSelected = extraScenarios.some((s) => s.id === selectedScenarioId);
  const activeExtraScenario = extraScenarios.find((s) => s.id === selectedScenarioId);

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
      <div className="w-full h-14 px-4 sm:px-6 flex items-center justify-between mx-auto max-w-7xl">
        {/* Brand & Security Attestation Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectScenario(BENCHMARK_SCENARIOS[0]!)}>
            <div className="w-6 h-6 rounded-lg bg-[#18181B] flex items-center justify-center text-white shadow-sm">
              <InfinityIcon className="w-4 h-4" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[#18181B]">PRISM</span>
          </div>
          {renderNanoStatusBadge()}
        </div>

        {/* Segmented Navigation Links (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center bg-[#EFEFEA] p-1 rounded-xl">
          {primaryScenarios.map((scen) => {
            const isSelected = scen.id === selectedScenarioId;
            return (
              <button
                key={scen.id}
                onClick={() => onSelectScenario(scen)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  isSelected
                    ? 'bg-white text-[#18181B] border border-[#E6E5E0] shadow-[0_1px_2px_rgba(0,0,0,0.04)] font-semibold'
                    : 'text-[#4B5563] hover:text-[#18181B]'
                }`}
              >
                {scen.title}
              </button>
            );
          })}

          {/* More Scenarios Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                isExtraSelected
                  ? 'bg-white text-[#18181B] border border-[#E6E5E0] shadow-[0_1px_2px_rgba(0,0,0,0.04)] font-semibold'
                  : 'text-[#4B5563] hover:text-[#18181B]'
              }`}
            >
              <span>{isExtraSelected ? activeExtraScenario?.title : 'More'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl border border-[#E6E5E0] shadow-[0_4px_12px_rgba(24,24,27,0.08)] py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                {extraScenarios.map((scen) => (
                  <button
                    key={scen.id}
                    onClick={() => {
                      onSelectScenario(scen);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between ${
                      scen.id === selectedScenarioId
                        ? 'bg-[#F7F7F5] text-[#15803D] font-semibold'
                        : 'text-[#18181B] hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <span>{scen.title}</span>
                    {scen.id === selectedScenarioId && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Trailing Status & Primary Actions */}
        <div className="flex items-center gap-3">
          {/* Offline Tactical Toggle */}
          <div className="flex items-center gap-2 pr-2 border-r border-[#E6E5E0]">
            <span className="text-[11px] font-medium text-[#4B5563]">Offline</span>
            <button
              aria-checked={!device.online}
              role="switch"
              onClick={onToggleOffline}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors relative focus:outline-none ${
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
