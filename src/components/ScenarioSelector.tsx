import React from 'react';
import {
  Activity,
  DollarSign,
  FileText,
  ShieldAlert,
  Users,
  Sparkles,
  WifiOff,
  Wifi,
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
        return <Activity className="w-3.5 h-3.5" />;
      case 'DollarSign':
        return <DollarSign className="w-3.5 h-3.5" />;
      case 'FileText':
        return <FileText className="w-3.5 h-3.5" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case 'Users':
        return <Users className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="md:hidden w-full border-b border-white/[0.06] bg-[#0e1015] px-6 py-2.5">
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0">
          {BENCHMARK_SCENARIOS.map((scen) => {
            const isSelected = scen.id === selectedScenarioId;
            return (
              <button
                key={scen.id}
                onClick={() => onSelectScenario(scen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#181d29] text-white border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {getIcon(scen.iconName)}
                <span>{scen.title}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onToggleOffline}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
            !device.online
              ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {!device.online ? <WifiOff className="w-3 h-3 text-amber-400" /> : <Wifi className="w-3 h-3 text-zinc-500" />}
          <span>{!device.online ? 'Offline' : 'Online'}</span>
        </button>
      </div>
    </div>
  );
};
