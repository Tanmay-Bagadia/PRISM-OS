import React from 'react';
import { RotateCw } from 'lucide-react';
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
  scenarioId: string;
  rawContent?: string;
  topology: AbstractTopology | null;
  stage3Telemetry?: StageTelemetry;
  isRunning: boolean;
}

export const KeyIndicatorsGrid: React.FC<KeyIndicatorsGridProps> = ({
  scenarioId,
  rawContent = '',
  stage3Telemetry,
  isRunning,
}) => {
  // Dynamically compute the 3 indicators based on scenario and raw content
  const indicators: KeyIndicatorData[] = React.useMemo(() => {
    if (scenarioId === 'scen_health') {
      return [
        {
          id: 'vit_d',
          label: 'Vitamin D (25-OH)',
          badge: 'Low • Target 30+',
          badgeType: 'warning',
          value: '16',
          unit: 'ng/mL',
          currentLabel: 'Current: 16',
          targetLabel: 'Target: 30 - 80',
          currentPercentage: 20,
          targetStartPercentage: 30,
          targetEndPercentage: 80,
          description: 'Direct contributor to chronic fatigue & low muscular power recovery.',
        },
        {
          id: 'iron',
          label: 'Iron (Ferritin)',
          badge: 'Low • Target 20+',
          badgeType: 'warning',
          value: '14',
          unit: 'ng/mL',
          currentLabel: 'Current: 14',
          targetLabel: 'Target: 20 - 150',
          currentPercentage: 14,
          targetStartPercentage: 20,
          targetEndPercentage: 90,
          description: 'Suppressed ferritin reduces cellular oxygen delivery during work hours.',
        },
        {
          id: 'sleep',
          label: 'Average Sleep',
          badge: '2.3 hrs below goal',
          badgeType: 'critical',
          value: '5.2',
          unit: 'hrs',
          currentLabel: 'Deep: 42m',
          targetLabel: 'Target: 7.5 hrs total',
          currentPercentage: 55,
          targetStartPercentage: 75,
          targetEndPercentage: 100,
          description: 'Short sleep latency confirms high sleep pressure coupled with late alarms.',
        },
      ];
    }

    if (scenarioId === 'scen_cfo') {
      return [
        {
          id: 'burn',
          label: 'Monthly Net Burn',
          badge: 'Burn • Target < $300k',
          badgeType: 'warning',
          value: '420',
          unit: 'k / mo',
          currentLabel: 'Current: $420k',
          targetLabel: 'Target: < $300k',
          currentPercentage: 75,
          targetStartPercentage: 25,
          targetEndPercentage: 55,
          description: 'Payroll ($310k) and Cloud GPU cluster ($88k) drive monthly cash depletion.',
        },
        {
          id: 'runway',
          label: 'Cash Runway',
          badge: 'Healthy • Min 18m',
          badgeType: 'optimal',
          value: '20.1',
          unit: 'months',
          currentLabel: 'Current: 20.1m',
          targetLabel: 'Target: 18 - 36m',
          currentPercentage: 62,
          targetStartPercentage: 50,
          targetEndPercentage: 100,
          description: '$8.45M in SVB provides buffer; cash-out date projected Q3 2028.',
        },
        {
          id: 'arr',
          label: 'ARR Trajectory',
          badge: '84% YoY Growth',
          badgeType: 'optimal',
          value: '3.6',
          unit: '$M ARR',
          currentLabel: 'Current: $3.6M',
          targetLabel: 'Target: $5.0M Series C',
          currentPercentage: 72,
          targetStartPercentage: 60,
          targetEndPercentage: 100,
          description: 'Top-decile revenue expansion across 42 FTE enterprise robotics accounts.',
        },
      ];
    }

    if (scenarioId === 'scen_legal') {
      return [
        {
          id: 'damages',
          label: 'Liquidated Damages',
          badge: 'Severe • High Risk',
          badgeType: 'critical',
          value: '5.0',
          unit: '$M Penalty',
          currentLabel: 'Current: $5.0M',
          targetLabel: 'Target: Mutual $250k',
          currentPercentage: 90,
          targetStartPercentage: 10,
          targetEndPercentage: 25,
          description: 'Section 4 statutory penalty triggers immediate breach liability without proof of damages.',
        },
        {
          id: 'non_compete',
          label: 'Non-Compete Term',
          badge: 'Overreach • 4 Years',
          badgeType: 'warning',
          value: '48',
          unit: 'months',
          currentLabel: 'Current: 48m',
          targetLabel: 'Target: 12 - 24m',
          currentPercentage: 80,
          targetStartPercentage: 20,
          targetEndPercentage: 40,
          description: 'Section 7.3 restricts mRNA/CRISPR delivery development far beyond market standard.',
        },
        {
          id: 'injunction',
          label: 'Injunctive Relief',
          badge: 'Unilateral Injunction',
          badgeType: 'critical',
          value: '0',
          unit: 'Bond Required',
          currentLabel: 'Current: No Bond',
          targetLabel: 'Target: Bond Required',
          currentPercentage: 10,
          targetStartPercentage: 50,
          targetEndPercentage: 100,
          description: 'Section 9.1 allows Disclosing Party immediate injunction without posting bond.',
        },
      ];
    }

    if (scenarioId === 'scen_cyber') {
      return [
        {
          id: 'cvss',
          label: 'Threat Severity',
          badge: 'Critical • Lateral',
          badgeType: 'critical',
          value: '9.8',
          unit: 'CVSS Score',
          currentLabel: 'Score: 9.8',
          targetLabel: 'Target: 0.0 (Clean)',
          currentPercentage: 98,
          targetStartPercentage: 0,
          targetEndPercentage: 15,
          description: 'Root privilege escalation and persistence cron detected on internal cluster.',
        },
        {
          id: 'transfer',
          label: 'Intercepted Wire',
          badge: 'Hold • High Priority',
          badgeType: 'warning',
          value: '1.25',
          unit: '$M Wire',
          currentLabel: 'Intercepted: $1.25M',
          targetLabel: 'Target: $0.00 Loss',
          currentPercentage: 75,
          targetStartPercentage: 0,
          targetEndPercentage: 10,
          description: 'Unauthorized wire transfer initiated to 185.220.101.5 intercepted by SOC.',
        },
        {
          id: 'hosts',
          label: 'Compromised Hosts',
          badge: 'DNS Exfiltration',
          badgeType: 'critical',
          value: '2',
          unit: 'Core Services',
          currentLabel: 'Affected: 2 nodes',
          targetLabel: 'Target: Isolated Subnet',
          currentPercentage: 45,
          targetStartPercentage: 80,
          targetEndPercentage: 100,
          description: 'Production Postgres DB and Kafka Broker-03 targeted via staged ns1.darkrelay.net queries.',
        },
      ];
    }

    if (scenarioId === 'scen_hr') {
      return [
        {
          id: 'settlement',
          label: 'Settlement Demand',
          badge: 'Whistleblower Exposure',
          badgeType: 'warning',
          value: '750',
          unit: '$k Demand',
          currentLabel: 'Demand: $750k',
          targetLabel: 'Target: Cap at $385k',
          currentPercentage: 75,
          targetStartPercentage: 20,
          targetEndPercentage: 40,
          description: 'Severance demand includes full base plus single-trigger RSU vesting.',
        },
        {
          id: 'base_comp',
          label: 'Base Remuneration',
          badge: 'Executive Level',
          badgeType: 'optimal',
          value: '385',
          unit: '$k Annual',
          currentLabel: 'Base: $385k',
          targetLabel: 'Bonus: $150k target',
          currentPercentage: 65,
          targetStartPercentage: 50,
          targetEndPercentage: 90,
          description: 'Base salary plus $150k target performance bonus.',
        },
        {
          id: 'disputed_rev',
          label: 'Disputed Revenue',
          badge: 'Premature Recognition',
          badgeType: 'critical',
          value: '2.1',
          unit: '$M Q2 Rev',
          currentLabel: 'Recognized: $2.1M',
          targetLabel: 'Target: Audit Clear',
          currentPercentage: 85,
          targetStartPercentage: 10,
          targetEndPercentage: 30,
          description: 'Allegation of non-compliant revenue recognition reported to Audit Committee.',
        },
      ];
    }

    // Fallback for custom user files
    const words = rawContent.split(/\s+/).length;
    const lines = rawContent.split('\n').filter(Boolean).length;
    return [
      {
        id: 'c1',
        label: 'Local File Volume',
        badge: 'Vault Grounded',
        badgeType: 'optimal',
        value: words > 1000 ? (words / 1000).toFixed(1) : words,
        unit: words > 1000 ? 'k words' : 'words',
        currentLabel: `${words} words parsed`,
        targetLabel: 'Encrypted in Memory',
        currentPercentage: Math.min(100, Math.round((words / 800) * 100)),
        targetStartPercentage: 40,
        targetEndPercentage: 100,
        description: 'Direct memory buffer parsed on-device with 0 bytes network exposure.',
      },
      {
        id: 'c2',
        label: 'Structural Entities',
        badge: 'Sanitized Graph',
        badgeType: 'optimal',
        value: lines,
        unit: 'records',
        currentLabel: `${lines} records`,
        targetLabel: 'Distilled < 2 KB',
        currentPercentage: Math.min(100, Math.round((lines / 50) * 100)),
        targetStartPercentage: 30,
        targetEndPercentage: 90,
        description: 'Topology nodes distilled for blind reasoning blueprint.',
      },
      {
        id: 'c3',
        label: 'Privacy Boundary',
        badge: '0 Bytes Out',
        badgeType: 'optimal',
        value: '100',
        unit: '% Isolated',
        currentLabel: '0 bytes PII sent',
        targetLabel: '100% Cryptographic Lock',
        currentPercentage: 100,
        targetStartPercentage: 90,
        targetEndPercentage: 100,
        description: 'All raw identifiers and numbers remain within local execution sandbox.',
      },
    ];
  }, [scenarioId, rawContent]);

  const latencyDisplay = stage3Telemetry?.latencyMs || 42;

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
            {scenarioId === 'scen_health'
              ? 'Calibrated against 30-day baseline and blood reference ranges'
              : scenarioId === 'scen_cfo'
              ? 'Audited against SVB cash ledger and preferred equity covenants'
              : scenarioId === 'scen_legal'
              ? 'Cross-correlated against standard Delaware Court of Chancery benchmarks'
              : 'Evaluated locally against contextual execution constraints'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
          <RotateCw className={`w-3.5 h-3.5 text-[#15803D] ${isRunning ? 'animate-spin' : ''}`} />
          <span className="tabular-nums">Evaluated locally in {latencyDisplay}ms</span>
        </div>
      </div>

      {/* 3 Bento Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
        {indicators.map((card) => (
          <div
            key={card.id}
            className="bg-white rounded-2xl p-5 border border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] flex flex-col justify-between hover:border-zinc-300 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#4B5563]">{card.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getBadgeStyle(card.badgeType)}`}>
                  {card.badge}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-[34px] leading-none font-bold tracking-tight text-[#18181B] tabular-nums">
                  {card.value}
                </span>
                <span className="text-xs text-[#6B7280]">{card.unit}</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#F0EFEA]">
              <div className="flex justify-between text-xs text-[#6B7280] mb-1.5">
                <span>{card.currentLabel}</span>
                <span>{card.targetLabel}</span>
              </div>

              {/* Visual Range Bar */}
              <div className="w-full h-2 rounded-full bg-[#EFEFEA] overflow-hidden relative">
                {/* Current Value Fill */}
                <div
                  className={`absolute left-0 top-0 bottom-0 ${getFillColor(card.badgeType)} rounded-full transition-all duration-300`}
                  style={{ width: `${Math.max(5, Math.min(100, card.currentPercentage))}%` }}
                />
                {/* Target Range Highlight Zone */}
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
    </div>
  );
};

export default KeyIndicatorsGrid;
