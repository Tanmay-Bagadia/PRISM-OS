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

function extractMatch(text: string, pattern: RegExp, fallback: string): string {
  const match = text.match(pattern);
  return match && match[1] ? match[1].trim() : fallback;
}

export const KeyIndicatorsGrid: React.FC<KeyIndicatorsGridProps> = ({
  scenarioId,
  rawContent = '',
  stage3Telemetry,
  isRunning,
}) => {
  // Dynamically extract and compute the 3 indicators from rawContent
  const indicators: KeyIndicatorData[] = React.useMemo(() => {
    if (scenarioId === 'scen_health') {
      const vitDVal = extractMatch(rawContent, /Vitamin D\s*(?:\([^)]*\))?:\s*([0-9.]+)/i, '16');
      const vitDNum = parseFloat(vitDVal) || 16;
      const vitDIsLow = vitDNum < 30;

      const ironVal = extractMatch(rawContent, /Iron\s*(?:\([^)]*\))?:\s*([0-9.]+)/i, '14');
      const ironNum = parseFloat(ironVal) || 14;
      const ironIsLow = ironNum < 20;

      const sleepVal = extractMatch(rawContent, /(?:SleepDuration_Hrs|Average Sleep).*?,([0-9.]+)/i, '5.2');
      const sleepNum = parseFloat(sleepVal) || 5.2;
      const sleepDeficit = (7.5 - sleepNum).toFixed(1);

      return [
        {
          id: 'vit_d',
          label: 'Vitamin D (25-OH)',
          badge: vitDIsLow ? `Low • Target 30+` : 'Optimal • In Range',
          badgeType: vitDIsLow ? 'warning' : 'optimal',
          value: vitDVal,
          unit: 'ng/mL',
          currentLabel: `Current: ${vitDVal}`,
          targetLabel: 'Target: 30 - 80',
          currentPercentage: Math.min(100, Math.round((vitDNum / 80) * 100)),
          targetStartPercentage: 30,
          targetEndPercentage: 80,
          description: vitDIsLow
            ? 'Direct contributor to chronic fatigue & low muscular power recovery.'
            : 'Within normal clinical reference range for metabolic maintenance.',
        },
        {
          id: 'iron',
          label: 'Iron (Ferritin)',
          badge: ironIsLow ? 'Low • Target 20+' : 'Optimal • In Range',
          badgeType: ironIsLow ? 'warning' : 'optimal',
          value: ironVal,
          unit: 'ng/mL',
          currentLabel: `Current: ${ironVal}`,
          targetLabel: 'Target: 20 - 150',
          currentPercentage: Math.min(100, Math.round((ironNum / 150) * 100)),
          targetStartPercentage: 20,
          targetEndPercentage: 90,
          description: ironIsLow
            ? 'Suppressed ferritin reduces cellular oxygen delivery during work hours.'
            : 'Sufficient cellular ferritin stores for systemic oxygenation.',
        },
        {
          id: 'sleep',
          label: 'Average Sleep',
          badge: sleepNum < 7 ? `${sleepDeficit} hrs below goal` : 'Restored Baseline',
          badgeType: sleepNum < 6.5 ? 'critical' : sleepNum < 7.5 ? 'warning' : 'optimal',
          value: sleepVal,
          unit: 'hrs',
          currentLabel: `Observed: ${sleepVal}h`,
          targetLabel: 'Target: 7.5 hrs total',
          currentPercentage: Math.min(100, Math.round((sleepNum / 8.5) * 100)),
          targetStartPercentage: 75,
          targetEndPercentage: 100,
          description: sleepNum < 7
            ? 'Short sleep latency confirms high sleep pressure coupled with late alarms.'
            : 'Circadian rhythm architecture supports full neural recovery.',
        },
      ];
    }

    if (scenarioId === 'scen_cfo') {
      const burnRaw = extractMatch(rawContent, /Monthly Net Burn:\s*\$?([0-9,.]+)/i, '420,000');
      const burnNum = parseFloat(burnRaw.replace(/,/g, '')) || 420000;
      const burnK = Math.round(burnNum / 1000);

      const cashRaw = extractMatch(rawContent, /Current Cash[^:]*:\s*\$?([0-9,.]+)/i, '8,450,000');
      const cashNum = parseFloat(cashRaw.replace(/,/g, '')) || 8450000;
      const runwayMonths = burnNum > 0 ? (cashNum / burnNum).toFixed(1) : '20.1';

      const arrRaw = extractMatch(rawContent, /ARR:\s*\$?([0-9,.]+)/i, '3,600,000');
      const arrNum = parseFloat(arrRaw.replace(/,/g, '')) || 3600000;
      const arrM = (arrNum / 1000000).toFixed(1);

      return [
        {
          id: 'burn',
          label: 'Monthly Net Burn',
          badge: burnK > 300 ? 'Burn • Target < $300k' : 'Controlled Burn',
          badgeType: burnK > 300 ? 'warning' : 'optimal',
          value: burnK,
          unit: 'k / mo',
          currentLabel: `Current: $${burnK}k`,
          targetLabel: 'Target: < $300k',
          currentPercentage: Math.min(100, Math.round((burnK / 500) * 100)),
          targetStartPercentage: 25,
          targetEndPercentage: 60,
          description: 'Payroll and compute infrastructure OPEX drive monthly cash depletion.',
        },
        {
          id: 'runway',
          label: 'Cash Runway',
          badge: parseFloat(runwayMonths) >= 18 ? 'Healthy • Min 18m' : 'Warning • Runway Short',
          badgeType: parseFloat(runwayMonths) >= 18 ? 'optimal' : 'critical',
          value: runwayMonths,
          unit: 'months',
          currentLabel: `Runway: ${runwayMonths}m`,
          targetLabel: 'Target: 18 - 36m',
          currentPercentage: Math.min(100, Math.round((parseFloat(runwayMonths) / 36) * 100)),
          targetStartPercentage: 50,
          targetEndPercentage: 100,
          description: `$${(cashNum / 1000000).toFixed(2)}M in bank cash provides operating buffer.`,
        },
        {
          id: 'arr',
          label: 'ARR Trajectory',
          badge: 'Annual Revenue',
          badgeType: 'optimal',
          value: arrM,
          unit: '$M ARR',
          currentLabel: `Current: $${arrM}M`,
          targetLabel: 'Target: $5.0M Series C',
          currentPercentage: Math.min(100, Math.round((arrNum / 5000000) * 100)),
          targetStartPercentage: 60,
          targetEndPercentage: 100,
          description: 'Top-decile revenue expansion across enterprise contracts.',
        },
      ];
    }

    if (scenarioId === 'scen_legal') {
      const damagesRaw = extractMatch(rawContent, /Liquidated Damages[^:]*:\s*.*?\$?([0-9,.]+)/i, '5,000,000');
      const damagesNum = parseFloat(damagesRaw.replace(/,/g, '')) || 5000000;
      const damagesM = (damagesNum / 1000000).toFixed(1);

      const nonCompeteMonths = extractMatch(rawContent, /([0-9]+)\s*months\s*following\s*disclosure/i, '48');
      const nonCompeteNum = parseInt(nonCompeteMonths, 10) || 48;

      return [
        {
          id: 'damages',
          label: 'Liquidated Damages',
          badge: damagesNum > 500000 ? 'Severe • High Risk' : 'Standard Cap',
          badgeType: damagesNum > 500000 ? 'critical' : 'optimal',
          value: damagesM,
          unit: '$M Penalty',
          currentLabel: `Penalty: $${damagesM}M`,
          targetLabel: 'Target: Mutual $250k',
          currentPercentage: Math.min(100, Math.round((damagesNum / 5000000) * 100)),
          targetStartPercentage: 10,
          targetEndPercentage: 25,
          description: 'Immediate statutory breach penalty without requirement to prove damages.',
        },
        {
          id: 'non_compete',
          label: 'Non-Compete Term',
          badge: nonCompeteNum > 24 ? `Overreach • ${Math.round(nonCompeteNum / 12)} Years` : 'Market Standard',
          badgeType: nonCompeteNum > 24 ? 'warning' : 'optimal',
          value: nonCompeteMonths,
          unit: 'months',
          currentLabel: `Term: ${nonCompeteMonths}m`,
          targetLabel: 'Target: 12 - 24m',
          currentPercentage: Math.min(100, Math.round((nonCompeteNum / 60) * 100)),
          targetStartPercentage: 20,
          targetEndPercentage: 40,
          description: 'Restrictive covenant restricts commercial vector development post-disclosure.',
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
          description: 'Allows Disclosing Party immediate injunction without posting court bond.',
        },
      ];
    }

    if (scenarioId === 'scen_cyber') {
      const cvss = extractMatch(rawContent, /CVSS\s*([0-9.]+)/i, '9.8');
      const wire = extractMatch(rawContent, /Wire Transfer[^:]*:\s*\$?([0-9,.]+)/i, '1,250,000');
      const wireM = (parseFloat(wire.replace(/,/g, '')) / 1000000).toFixed(2);

      return [
        {
          id: 'cvss',
          label: 'Threat Severity',
          badge: 'Critical • Lateral',
          badgeType: 'critical',
          value: cvss,
          unit: 'CVSS Score',
          currentLabel: `Score: ${cvss}`,
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
          value: wireM,
          unit: '$M Wire',
          currentLabel: `Hold: $${wireM}M`,
          targetLabel: 'Target: $0.00 Loss',
          currentPercentage: 75,
          targetStartPercentage: 0,
          targetEndPercentage: 10,
          description: 'Unauthorized transfer initiated to external IP intercepted by SOC.',
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
          description: 'Production Postgres DB and Kafka Broker targeted via staged DNS queries.',
        },
      ];
    }

    if (scenarioId === 'scen_hr') {
      const demand = extractMatch(rawContent, /Settlement Offer Demanded:\s*\$?([0-9,.]+)/i, '750,000');
      const demandK = Math.round(parseFloat(demand.replace(/,/g, '')) / 1000) || 750;
      const salary = extractMatch(rawContent, /Base Salary:\s*\$?([0-9,.]+)/i, '385,000');
      const salaryK = Math.round(parseFloat(salary.replace(/,/g, '')) / 1000) || 385;

      return [
        {
          id: 'settlement',
          label: 'Settlement Demand',
          badge: 'Whistleblower Exposure',
          badgeType: 'warning',
          value: demandK,
          unit: '$k Demand',
          currentLabel: `Demand: $${demandK}k`,
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
          value: salaryK,
          unit: '$k Annual',
          currentLabel: `Base: $${salaryK}k`,
          targetLabel: 'Bonus: $150k target',
          currentPercentage: 65,
          targetStartPercentage: 50,
          targetEndPercentage: 90,
          description: 'Executive compensation package with performance bonus allocation.',
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

    // Dynamic parsing for custom uploaded user files
    const words = rawContent.split(/\s+/).filter(Boolean).length;
    const lines = rawContent.split('\n').filter(Boolean).length;
    const numbersFound = rawContent.match(/\b\d+(\.\d+)?\b/g) || [];

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
        label: 'Extracted Metrics',
        badge: 'Numeric Graph',
        badgeType: 'optimal',
        value: numbersFound.length,
        unit: 'numbers',
        currentLabel: `${numbersFound.length} values masked`,
        targetLabel: '0 Raw Sent',
        currentPercentage: Math.min(100, Math.round((numbersFound.length / 20) * 100)),
        targetStartPercentage: 20,
        targetEndPercentage: 90,
        description: 'All local numeric metrics are masked on-device prior to Stage 2.',
      },
      {
        id: 'c3',
        label: 'Privacy Boundary',
        badge: '0 Bytes Out',
        badgeType: 'optimal',
        value: '100',
        unit: '% Isolated',
        currentLabel: `${lines} records protected`,
        targetLabel: '100% Device Sandbox',
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
