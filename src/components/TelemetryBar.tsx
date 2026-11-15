import React from 'react';
import type { NanoAvailability, DeviceContext, StageTelemetry } from '../types/prism';
import {
  Cpu,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  ShieldCheck,
  ArrowRight,
  Sliders,
  CheckCircle2,
  FolderSync,
} from 'lucide-react';

interface TelemetryBarProps {
  nanoStatus: NanoAvailability;
  device: DeviceContext;
  onUpdateDevice: (updated: Partial<DeviceContext>) => void;
  telemetry: StageTelemetry[] | null;
  isRunning: boolean;
  activeStageIndex: number;
  onOpenDrawer: () => void;
  blueprintCount: number;
  isFirebaseReady?: boolean;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  nanoStatus,
  device,
  onUpdateDevice,
  telemetry,
  isRunning,
  activeStageIndex,
  onOpenDrawer,
  blueprintCount,
  isFirebaseReady,
}) => {
  const [showDeviceControls, setShowDeviceControls] = React.useState(false);

  // Derive Nano Status UI properties
  const getNanoBadge = () => {
    if (nanoStatus.status === 'available') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 glow-emerald">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <Cpu className="w-3.5 h-3.5" />
          <span>Gemini Nano 4: Ready</span>
        </span>
      );
    }
    if (nanoStatus.status === 'downloading') {
      const pct = Math.round((nanoStatus.downloadProgress || 0.1) * 100);
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-950/80 text-sky-400 border border-sky-500/30 glow-sky">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
          <Cpu className="w-3.5 h-3.5" />
          <span>Downloading Nano: {pct}%</span>
        </span>
      );
    }
    return (
      <span
        title={nanoStatus.error || 'Gemini Nano is not detected on this browser. Deterministic PII Scrubber is active.'}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900/90 text-zinc-400 border border-zinc-700/50"
      >
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <Cpu className="w-3.5 h-3.5 text-zinc-400" />
        <span>Nano Fallback: Deterministic Scrubber Active</span>
      </span>
    );
  };

  const getStagePill = (
    stageName: 'extract-topology' | 'cloud-blueprint' | 'hydrate-local',
    index: number,
    label: string
  ) => {
    const isCurrent = isRunning && activeStageIndex === index;
    const stageData = telemetry?.find((t) => t.stageName === stageName);

    if (isCurrent) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-sky-950/70 text-sky-300 border border-sky-500/40 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
          <span className="font-semibold">{label}</span>
          <span className="text-zinc-400">executing...</span>
        </div>
      );
    }

    if (!stageData) {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.03] text-zinc-500 border border-white/[0.05]">
          <span>{label}</span>
          <span className="text-zinc-600">idle</span>
        </div>
      );
    }

    const isCloud = stageData.inferenceSource === 'IN_CLOUD';
    const isHit = stageData.cacheStatus === 'hit';

    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono border transition-all ${
          isHit
            ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
            : isCloud
            ? 'bg-sky-950/60 text-sky-300 border-sky-500/40'
            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
        }`}
      >
        <span className="font-medium text-zinc-300">{label}:</span>
        <span className="font-bold">{stageData.inferenceSource}</span>
        <span className="text-zinc-400">•</span>
        <span className="tabular-nums text-zinc-200">{stageData.latencyMs}ms</span>
        {isHit && (
          <>
            <span className="text-zinc-400">•</span>
            <span className="px-1 rounded bg-amber-500/20 text-amber-300 font-semibold text-[10px]">
              CACHE HIT
            </span>
          </>
        )}
        {stageData.bytesSentToCloud > 0 ? (
          <>
            <span className="text-zinc-400">•</span>
            <span className="tabular-nums text-sky-400 font-semibold">
              {(stageData.bytesSentToCloud / 1024).toFixed(1)} KB cloud
            </span>
          </>
        ) : (
          <>
            <span className="text-zinc-400">•</span>
            <span className="tabular-nums text-emerald-400 font-semibold">0 B cloud</span>
          </>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#070a10]/95 backdrop-blur-md">
      {/* Top Main Navigation Bar */}
      <div className="max-w-[1720px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand & Mission Statement */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 via-sky-500 to-indigo-600 p-[1px] shadow-sm">
              <div className="w-full h-full bg-[#070a10] rounded-[7px] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">
                  PRISM<span className="text-emerald-400 font-mono text-xs ml-0.5 font-normal">-OS</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  #BuildHybridAI 2026
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 -mt-0.5 hidden sm:block">
                Inverted-Blueprint Cognitive Architecture • Zero Raw PII Cloud Exposure
              </p>
            </div>
          </div>
        </div>

        {/* Center: Gemini Nano Status & Privacy Attestation */}
        <div className="flex items-center gap-3">
          {getNanoBadge()}

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>0 Raw Bytes Cloud Transmission</span>
          </div>
        </div>

        {/* Right: Device Telemetry & Quick Hardware Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Hardware Indicator / Popover Toggle */}
          <button
            onClick={() => setShowDeviceControls(!showDeviceControls)}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
              showDeviceControls
                ? 'bg-zinc-800 text-white border-white/20'
                : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:bg-white/[0.08]'
            }`}
            title="Inspect & Simulate Device Network & Battery Conditions"
          >
            {device.online ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}
            <span className="tabular-nums">
              {device.online ? `${device.networkRttMs}ms` : 'OFFLINE'}
            </span>
            <span className="text-zinc-600">|</span>
            {device.batteryLevel < 0.2 ? (
              <BatteryLow className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="tabular-nums">{Math.round(device.batteryLevel * 100)}%</span>
            <Sliders className="w-3 h-3 text-zinc-400 ml-0.5" />
          </button>

          {/* Drawer Trigger */}
          <button
            onClick={onOpenDrawer}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-900/40 transition-colors"
          >
            <FolderSync className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sync Vault</span>
            {isFirebaseReady && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Firebase Online" />
            )}
            {blueprintCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300">
                {blueprintCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stage Telemetry Ticker Strip */}
      <div className="w-full bg-[#05070a] border-t border-white/[0.05] px-4 py-1.5 text-xs">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
            <span className="text-zinc-500">PIPELINE RELAY:</span>
            {getStagePill('extract-topology', 0, 'Stage 1: Nano Extract')}
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            {getStagePill('cloud-blueprint', 1, 'Stage 2: Cloud Blueprint')}
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            {getStagePill('hydrate-local', 2, 'Stage 3: Grounded Local')}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Nano Vault</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Cloud Blueprint</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Offline Cache Hit</span>
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Device Hardware Simulator Overlay */}
      {showDeviceControls && (
        <div className="absolute top-full right-4 mt-2 w-80 p-4 rounded-xl bg-[#0f141f] border border-white/10 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.08]">
            <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
              Hardware & Network Simulator
            </span>
            <button
              onClick={() => setShowDeviceControls(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Online Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-zinc-200">Network Uplink</span>
                <p className="text-[10px] text-zinc-400">
                  Toggle to simulate Hospital Basement / Offline
                </p>
              </div>
              <button
                onClick={() => onUpdateDevice({ online: !device.online })}
                className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                  device.online
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                }`}
              >
                {device.online ? 'Online' : 'Simulated Offline'}
              </button>
            </div>

            {/* RTT Slider */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-300">Network RTT Latency</span>
                <span className="font-mono text-zinc-200 tabular-nums">{device.networkRttMs} ms</span>
              </div>
              <input
                type="range"
                min="10"
                max="4000"
                step="10"
                value={device.networkRttMs}
                disabled={!device.online}
                onChange={(e) => onUpdateDevice({ networkRttMs: Number(e.target.value) })}
                className="w-full accent-sky-400 cursor-pointer disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
                <span>10ms (Fiber)</span>
                <span>2000ms (Threshold)</span>
                <span>4000ms (Satellite)</span>
              </div>
            </div>

            {/* Battery Slider */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-300">Device Battery Level</span>
                <span className="font-mono text-zinc-200 tabular-nums">
                  {Math.round(device.batteryLevel * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={device.batteryLevel}
                onChange={(e) => onUpdateDevice({ batteryLevel: Number(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
                <span className="text-amber-400">5% (Low Power)</span>
                <span>20% (Cutoff)</span>
                <span>100% (Full)</span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 border-t border-white/[0.05] pt-2">
              PRISM&apos;s Adaptive Router automatically downgrades from Cloud to On-Device Cache if
              battery &lt; 20% or RTT &gt; 2000ms.
            </p>
          </div>
        </div>
      )}
    </header>
  );
};
