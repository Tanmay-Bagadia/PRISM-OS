import React from 'react';
import {
  Activity,
  DollarSign,
  FileText,
  ShieldAlert,
  Users,
  WifiOff,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { BENCHMARK_SCENARIOS, type BenchmarkScenario } from '../data/scenarios';
import type { DeviceContext } from '../types/prism';

interface ScenarioSelectorProps {
  selectedScenarioId: string;
  onSelectScenario: (scenario: BenchmarkScenario) => void;
  device: DeviceContext;
  onToggleOffline: () => void;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  selectedScenarioId,
  onSelectScenario,
  device,
  onToggleOffline,
}) => {
  const getIcon = (iconName: BenchmarkScenario['iconName']) => {
    switch (iconName) {
      case 'Activity':
        return <Activity className="w-4 h-4" />;
      case 'DollarSign':
        return <DollarSign className="w-4 h-4" />;
      case 'FileText':
        return <FileText className="w-4 h-4" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-4 h-4" />;
      case 'Users':
        return <Users className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getDomainColor = (category: BenchmarkScenario['category']) => {
    switch (category) {
      case 'health':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'finance':
        return 'text-sky-400 border-sky-500/30 bg-sky-500/10';
      case 'legal':
        return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
      default:
        return 'text-zinc-400 border-zinc-700 bg-zinc-800';
    }
  };

  return (
    <div className="w-full bg-[#0a0d14] border-b border-white/[0.08] px-4 py-3">
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left: 1-Click Scenario Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
            JUDGE SCENARIOS:
          </span>

          {BENCHMARK_SCENARIOS.map((scen) => {
            const isSelected = scen.id === selectedScenarioId;
            return (
              <button
                key={scen.id}
                onClick={() => onSelectScenario(scen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-[#141b2b] text-white border-white/25 shadow-md shadow-black/40 ring-1 ring-white/10'
                    : 'bg-white/[0.02] text-zinc-400 border-white/[0.05] hover:bg-white/[0.06] hover:text-zinc-200'
                }`}
              >
                <span
                  className={`p-1 rounded-md border ${
                    isSelected ? getDomainColor(scen.category) : 'text-zinc-400 border-transparent bg-white/[0.05]'
                  }`}
                >
                  {getIcon(scen.iconName)}
                </span>
                <div className="text-left">
                  <div className="font-semibold text-xs leading-none">{scen.title}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5 leading-none">
                    {scen.files.length} {scen.files.length === 1 ? 'file' : 'files'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Hospital Basement / Offline Simulator Switch */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            onClick={onToggleOffline}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
              !device.online
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 glow-amber'
                : 'bg-white/[0.03] text-zinc-400 border-white/[0.07] hover:bg-white/[0.06] hover:text-zinc-200'
            }`}
            title="Simulate offline environment like a hospital basement or air-gapped terminal to demonstrate instant offline cached blueprint execution"
          >
            {!device.online ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Simulating Offline Mode</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                  AIR-GAPPED
                </span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulate Offline / Hospital Basement</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

