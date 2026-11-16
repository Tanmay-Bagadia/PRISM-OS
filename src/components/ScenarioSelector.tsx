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
    <div className="md:hidden w-full border-b border-[#E6E5E0] bg-white px-4 py-2">
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 shrink-0">
          {BENCHMARK_SCENARIOS.map((scen) => {
            const isSelected = scen.id === selectedScenarioId;
            return (
              <button
                key={scen.id}
                onClick={() => onSelectScenario(scen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#EFEFEA] text-[#18181B] border border-[#E6E5E0] font-semibold'
                    : 'text-[#4B5563] hover:text-[#18181B]'
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
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all shrink-0 border ${
            !device.online
              ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]'
              : 'text-[#6B7280] border-[#E6E5E0]'
          }`}
        >
          {!device.online ? <WifiOff className="w-3 h-3 text-[#15803D]" /> : <Wifi className="w-3 h-3 text-[#6B7280]" />}
          <span>{!device.online ? 'Offline' : 'Online'}</span>
        </button>
      </div>
    </div>
  );
};

export default ScenarioSelector;
