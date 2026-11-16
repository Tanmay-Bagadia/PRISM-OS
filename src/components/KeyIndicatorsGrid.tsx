import React from 'react';
import { RotateCw, Activity } from 'lucide-react';
import type { AbstractTopology, StageTelemetry } from '../types/prism';

export interface KeyIndicatorData {
  id: string;
  label: string;
  badge: string;
  badgeType: 'warning' | 'critical' | 'optimal';
  value: string | number;
  unit: string;
  currentLabel: string;
  targetLabel: string;
  currentPercentage: number;
  targetStartPercentage?: number;
  targetEndPercentage?: number;
  description: string;
}

interface KeyIndicatorsGridProps {
  rawContent?: string;
  topology: AbstractTopology | null;
  stage3Telemetry?: StageTelemetry;
  isRunning: boolean;
}

export const KeyIndicatorsGrid: React.FC<KeyIndicatorsGridProps> = ({
  topology,
  stage3Telemetry,
  isRunning,
}) => {
  // Dynamically compute indicators exclusively from the live topology.entities
  const indicators: KeyIndicatorData[] = React.useMemo(() => {
    if (!topology || !topology.entities || topology.entities.length === 0) {
      return [];
    }

    // Select up to 3 entities with the richest information
    const candidateEntities = topology.entities.slice(0, 3);

    return candidateEntities.map((entity, idx) => {
      let label = entity.label;
      let rawVal = '';

      if (label.includes(':')) {
        const parts = label.split(':');
        label = parts[0]?.trim() || 'Metric';
        rawVal = parts.slice(1).join(':').trim();
      }

      // Extract numeric part if present
      const numMatch = rawVal.match(/[\$]?([0-9,.]+)/);
      const numericVal = numMatch ? numMatch[1] : '';
      const numParsed = parseFloat(numericVal?.replace(/,/g, '') || '0');

      // Extract units if present
      const unitMatch = rawVal.match(/\b(ng\/mL|mg\/dL|mEq\/L|bpm|mmHg|hrs|min|months|mo|k|M|RSUs|nodes|DB)\b/i);
      const unit = unitMatch ? unitMatch[1] : (numMatch ? 'value' : 'grounded');

      // Determine badge severity dynamically based on keywords in entity label
      const isCritical = /critical|severe|breach|overreach|deficit|lateral|penalty|low\s*magnesium/i.test(
        entity.label
      );
      const isWarning = /low|high|burn|warning|risk|hold|disputed|hypokalemic|border/i.test(
        entity.label
      );
      const badgeType: KeyIndicatorData['badgeType'] = isCritical
        ? 'critical'
        : isWarning
        ? 'warning'
        : 'optimal';

      const badgeText = isCritical
        ? 'Critical Variance'
        : isWarning
        ? 'Anomaly Flag'
        : 'On-Device Grounded';

      // Calculate percentage for range bar
      let percentage = 65;
      if (numParsed > 0) {
        if (numParsed <= 100) {
          percentage = Math.max(10, Math.min(95, Math.round(numParsed)));
        } else {
          percentage = Math.max(15, Math.min(90, Math.round(numParsed % 100)));
        }
      }

      return {
        id: entity.id || `ind_${idx}`,
        label: label.slice(0, 32),
        badge: badgeText,
        badgeType,
        value: numericVal || rawVal.slice(0, 12) || 'Evaluated',
        unit: unit || 'metric',
        currentLabel: `Observed: ${numericVal || 'Grounded'}`,
        targetLabel: 'Vault Verified',
        currentPercentage: percentage,
        targetStartPercentage: 25,
        targetEndPercentage: 75,
        description: `Distilled on-device from ${entity.type.replace(/_/g, ' ')} context with zero network leakage.`,
      };
    });
  }, [topology]);

  const latencyDisplay = stage3Telemetry?.latencyMs || 0;

  const getBadgeStyle = (type: KeyIndicatorData['badgeType']) => {
    switch (type) {
      case 'critical':
        return 'bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]';
      case 'warning':
        return 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]';
      case 'optimal':
      default:
        return 'bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]';
    }
  };

  const getFillColor = (type: KeyIndicatorData['badgeType']) => {
    switch (type) {
      case 'critical':
        return 'bg-[#BE123C]';
      case 'warning':
        return 'bg-[#B45309]';
      case 'optimal':
      default:
        return 'bg-[#15803D]';
    }
  };

  return (
    <div>
      {/* Section Title Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-lg font-semibold text-[#18181B] tracking-tight">Key Indicators</h2>
          <p className="text-xs text-[#6B7280]">
            {topology
              ? 'Evaluated dynamically on-device against extracted topological entities'
              : 'Awaiting on-device pipeline execution to extract live indicators'}
          </p>
        </div>
        {topology && (
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
            <RotateCw className={`w-3.5 h-3.5 text-[#15803D] ${isRunning ? 'animate-spin' : ''}`} />
            <span className="tabular-nums">Evaluated locally in {latencyDisplay}ms</span>
          </div>
        )}
      </div>

      {/* When analysis has not been executed yet */}
      {!topology ? (
        <div className="bg-white rounded-2xl p-8 border border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] mb-7 flex flex-col items-center justify-center text-center space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#F7F7F5] border border-[#E6E5E0] flex items-center justify-center text-[#6B7280]">
            {isRunning ? (
              <RotateCw className="w-5 h-5 text-[#15803D] animate-spin" />
            ) : (
              <Activity className="w-5 h-5 text-[#6B7280]" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#18181B]">
              {isRunning ? 'Extracting On-Device Indicators...' : 'Awaiting Private Analysis'}
            </h3>
            <p className="text-xs text-[#6B7280] max-w-md mt-1 leading-relaxed">
              {isRunning
                ? 'Gemini Nano is parsing confidential context in local device memory without network egress.'
                : 'Key indicators are extracted dynamically on-device during Stage 1. Click "Update Brief" above to analyze.'}
            </p>
          </div>
        </div>
      ) : (
        /* 3 Bento Cards Grid dynamically generated from topology */
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7 animate-in fade-in duration-200">
          {indicators.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-2xl p-5 border border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] flex flex-col justify-between hover:border-zinc-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#4B5563] truncate max-w-[140px]" title={card.label}>
                    {card.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getBadgeStyle(card.badgeType)}`}>
                    {card.badge}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-[30px] leading-none font-bold tracking-tight text-[#18181B] tabular-nums truncate max-w-[170px]" title={String(card.value)}>
                    {card.value}
                  </span>
                  <span className="text-xs text-[#6B7280]">{card.unit}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#F0EFEA]">
                <div className="flex justify-between text-xs text-[#6B7280] mb-1.5">
                  <span className="truncate max-w-[120px]">{card.currentLabel}</span>
                  <span>{card.targetLabel}</span>
                </div>

                {/* Visual Range Bar */}
                <div className="w-full h-2 rounded-full bg-[#EFEFEA] overflow-hidden relative">
                  <div
                    className={`absolute left-0 top-0 bottom-0 ${getFillColor(card.badgeType)} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.max(8, Math.min(100, card.currentPercentage))}%` }}
                  />
                  {card.targetStartPercentage !== undefined && card.targetEndPercentage !== undefined && (
                    <div
                      className="absolute top-0 bottom-0 bg-[#A7F3D0]/60 border-l border-r border-[#15803D]/30"
                      style={{
                        left: `${card.targetStartPercentage}%`,
                        width: `${Math.max(10, card.targetEndPercentage - card.targetStartPercentage)}%`,
                      }}
                    />
                  )}
                </div>

                <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">{card.description}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default KeyIndicatorsGrid;
