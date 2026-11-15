import React from 'react';
import type { NanoAvailability, DeviceContext, StageTelemetry } from '../types/prism';
import {
  Cpu,
  Wifi,
  WifiOff,
  Battery,
  ShieldCheck,
  Radio,
  FolderSync,
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
  onOpenDrawer: () => void;
  blueprintCount: number;
  isFirebaseReady?: boolean;
  onOpenWireDrawer?: () => void;
  selectedScenarioId?: string;
  onSelectScenario?: (scen: BenchmarkScenario) => void;
  onToggleOffline?: () => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  nanoStatus,
  device,
  onOpenDrawer,
  blueprintCount,
  isFirebaseReady,
  onOpenWireDrawer,
  selectedScenarioId,
  onSelectScenario,
  onToggleOffline,
}) => {

  // Subtle Nano Status Indicator
  const renderNanoIndicator = () => {
    if (nanoStatus.status === 'available') {
      return (
        <div
          title="Chrome Gemini Nano 4 active on-device"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-500/20"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Nano 4 Ready</span>
        </div>
      );
    }
    if (nanoStatus.status === 'downloading') {
      const pct = Math.round((nanoStatus.downloadProgress || 0.1) * 100);
      return (
        <div
          title={`Downloading Gemini Nano weights (${pct}%)`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-950/40 text-sky-300 border border-sky-500/20"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping" />
          <Cpu className="w-3.5 h-3.5 text-sky-400" />
          <span>Downloading {pct}%</span>
        </div>
      );
    }
    return (
      <div
        title={nanoStatus.error || 'Gemini Nano unavailable on this browser. On-device deterministic scrubber active.'}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900/60 text-zinc-400 border border-white/[0.08]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <Cpu className="w-3.5 h-3.5 text-zinc-400" />
        <span className="hidden sm:inline">Scrubber Fallback</span>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#0e1015]/90 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 via-sky-500 to-indigo-500 p-[1px] shadow-sm">
              <div className="w-full h-full bg-[#0e1015] rounded-[7px] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-white text-sm">
                  PRISM<span className="text-emerald-400 font-mono text-xs ml-0.5">OS</span>
                </span>
                <span
                  title={isFirebaseReady ? 'Firebase Auth & Cloud Services Connected' : 'Connecting to Firebase...'}
                  className="text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06] font-mono cursor-default"
                >
                  #BuildHybridAI
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Scenario Switcher Pills */}
        {onSelectScenario && (
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            {BENCHMARK_SCENARIOS.map((scen) => {
              const isSelected = scen.id === selectedScenarioId;
              return (
                <button
                  key={scen.id}
                  onClick={() => onSelectScenario(scen)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#181d29] text-white shadow-sm border border-white/10'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                  }`}
                >
                  {scen.title}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Utility Controls */}
        <div className="flex items-center gap-2.5">
          {renderNanoIndicator()}

          {/* Live Battery Telemetry */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-zinc-400"
            title={`Live Battery Telemetry: ${Math.round(device.batteryLevel * 100)}%`}
          >
            <Battery className="w-3.5 h-3.5 text-zinc-400" />
            <span className="tabular-nums">{Math.round(device.batteryLevel * 100)}%</span>
          </div>

          {/* Offline Simulator Switch */}
          <button
            onClick={onToggleOffline}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
              !device.online
                ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06] hover:text-zinc-200'
            }`}
            title="Toggle offline air-gap to test instant Firestore offline cached execution"
          >
            {!device.online ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="font-mono text-[11px]">Air-Gapped</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-mono text-[11px] tabular-nums">{device.networkRttMs}ms</span>
              </>
            )}
          </button>

          {/* Privacy Wire Inspector Button */}
          {onOpenWireDrawer && (
            <button
              onClick={onOpenWireDrawer}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-950/30 hover:bg-sky-950/50 text-sky-300 border border-sky-500/20 transition-all"
              title="Inspect Stage 1 Abstract Topology (<2 KB) & Stage 2 Blueprint"
            >
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <span>Privacy Wire</span>
            </button>
          )}

          {/* Vault Cache Drawer */}
          <button
            onClick={onOpenDrawer}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 border border-white/[0.06] transition-all"
            title="Inspect Cached Blueprints stored in IndexedDB"
          >
            <FolderSync className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Blueprints</span>
            {blueprintCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-zinc-300">
                {blueprintCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
export default TelemetryBar;
