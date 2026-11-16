import React from 'react';
import type { ReasoningBlueprint } from '../types/prism';
import { ListChecks, Check } from 'lucide-react';

export interface PlanItem {
  id: string;
  title: string;
  badge: string;
  badgeColor: 'amber' | 'green' | 'blue' | 'rose';
  timeline: string;
  description: string;
}

interface ActionableFocusPlanProps {
  scenarioId: string;
  blueprint: ReasoningBlueprint | null;
  checkedItemIds: Record<string, boolean>;
  onToggleItem: (id: string) => void;
}

export const ActionableFocusPlan: React.FC<ActionableFocusPlanProps> = ({
  scenarioId,
  blueprint,
  checkedItemIds,
  onToggleItem,
}) => {
  // Derive items based on scenario and blueprint
  const items: PlanItem[] = React.useMemo(() => {
    // If live blueprint steps are available, formulate actionable checklist from them
    if (blueprint && blueprint.steps && blueprint.steps.length > 0) {
      return blueprint.steps.map((step, idx) => {
        const badgeColors: PlanItem['badgeColor'][] = ['amber', 'green', 'blue', 'rose'];
        const timelines = ['Today', 'This Week', 'Ongoing'];
        return {
          id: step.id || `step_${idx}`,
          title: step.action,
          badge: `Phase ${idx + 1} Directive`,
          badgeColor: badgeColors[idx % badgeColors.length] || 'blue',
          timeline: timelines[idx % timelines.length] || 'Ongoing',
          description: `${step.output}. Grounded locally against on-device vault without network exposure.`,
        };
      });
    }

    if (scenarioId === 'scen_health') {
      return [
        {
          id: 'plan_health_1',
          title: 'Separate Iron & Calcium supplements by 4 hours',
          badge: 'Supplement Clash',
          badgeColor: 'amber',
          timeline: 'Today',
          description:
            'Calcium carbonate blocks up to 60% of non-heme iron absorption when taken together. Move your multivitamin or calcium intake to lunch to allow your morning iron dose to replenish ferritin stores.',
        },
        {
          id: 'plan_health_2',
          title: 'Begin 4,000 IU Vitamin D3 + K2 with morning healthy fats',
          badge: 'Nutrient Replenishment',
          badgeColor: 'green',
          timeline: 'This Week',
          description:
            'Fat-soluble absorption peaks when paired with breakfast eggs, whole yogurt, or avocado. D3 taken with K2 ensures calcium deposition into bone matrix rather than soft vascular tissue.',
        },
        {
          id: 'plan_health_3',
          title: 'Set 10:30 PM wind-down alarm to restore deep recovery window',
          badge: 'Sleep Architecture',
          badgeColor: 'blue',
          timeline: 'Ongoing',
          description:
            'Closing the 2.3-hour deficit will normalize morning ferritin utilization and cortisol curve balance, lowering daytime brain fog.',
        },
      ];
    }

    if (scenarioId === 'scen_cfo') {
      return [
        {
          id: 'plan_cfo_1',
          title: 'Renegotiate GPU cluster lease with NVIDIA to reduce $94.5k monthly OPEX',
          badge: 'Compute OPEX',
          badgeColor: 'amber',
          timeline: 'This Month',
          description:
            'Commit to 1-year reserved cluster pricing to save 28% on GPU training overhead without impacting active model training throughput.',
        },
        {
          id: 'plan_cfo_2',
          title: 'Defer Q1 2027 non-critical hiring to extend cash-out date past Q4 2028',
          badge: 'Headcount Budget',
          badgeColor: 'blue',
          timeline: 'Q1 2027',
          description:
            'Freeze backfills on 3 sales roles until net expansion rate crosses 120%, preserving $45,000 in monthly fully-loaded payroll expense.',
        },
        {
          id: 'plan_cfo_3',
          title: 'Establish treasury sweep to yield 4.8% APY on idle $8.45M SVB balance',
          badge: 'Treasury Yield',
          badgeColor: 'green',
          timeline: 'This Week',
          description:
            'Generating ~$405k in annual interest income offsets nearly 1 full month of company burn with zero capital liquidity compromise.',
        },
      ];
    }

    if (scenarioId === 'scen_legal') {
      return [
        {
          id: 'plan_legal_1',
          title: 'Redline Section 7.3 to reduce 48-month non-compete to standard 12 months',
          badge: 'Non-Compete',
          badgeColor: 'amber',
          timeline: 'Immediate',
          description:
            'Narrow restrictive covenant scope strictly to confidential disclosures rather than general mRNA research to protect company autonomy.',
        },
        {
          id: 'plan_legal_2',
          title: 'Strike Section 9.1 unilateral bond-free injunctive relief clause',
          badge: 'Injunction Terms',
          badgeColor: 'rose',
          timeline: 'Immediate',
          description:
            'Require prevailing party standard and mandatory court bond posting for provisional relief, preventing asymmetric court leverage.',
        },
        {
          id: 'plan_legal_3',
          title: 'Insert mutual liquidated damages cap at $250,000 with 30-day cure period',
          badge: 'Liability Cap',
          badgeColor: 'green',
          timeline: 'Pre-Execution',
          description:
            'Replaces asymmetric $5,000,000 statutory penalty with standard commercial cure notice and reciprocal limitation of liability.',
        },
      ];
    }

    if (scenarioId === 'scen_cyber') {
      return [
        {
          id: 'plan_cyber_1',
          title: 'Terminate C2 DNS tunneling channel to ns1.darkrelay.net',
          badge: 'Containment',
          badgeColor: 'rose',
          timeline: 'Immediate',
          description:
            'Blackhole rogue nameserver query blocks across all internal recursive resolvers to halt staging data exfiltration.',
        },
        {
          id: 'plan_cyber_2',
          title: 'Purge persistence cron job at /var/spool/cron/crontabs/root',
          badge: 'Root Eradication',
          badgeColor: 'amber',
          timeline: 'Today',
          description:
            'Remove scheduled backdoor execution script and re-image breached administrative bastion node.',
        },
        {
          id: 'plan_cyber_3',
          title: 'Rotate production Postgres and Kafka service credentials',
          badge: 'Credential Scrub',
          badgeColor: 'blue',
          timeline: 'This Week',
          description:
            'Invalidate leaked connection strings and enforce mTLS certificates across internal cluster boundary.',
        },
      ];
    }

    if (scenarioId === 'scen_hr') {
      return [
        {
          id: 'plan_hr_1',
          title: 'Convene independent Audit Committee review of Q2 recognized rev',
          badge: 'Accounting Audit',
          badgeColor: 'amber',
          timeline: 'This Week',
          description:
            'Engage forensic accounting counsel to verify documentation supporting the $2.1M Q2 revenue recognition threshold.',
        },
        {
          id: 'plan_hr_2',
          title: 'Formalize non-retaliation covenant for reporting employee',
          badge: 'Statutory Shield',
          badgeColor: 'green',
          timeline: 'Immediate',
          description:
            'Execute written commitment safeguarding employee position and whistle-blower reporting standing under SEC Rule 21F.',
        },
        {
          id: 'plan_hr_3',
          title: 'Counter-propose severance boundary capped at $385k plus RSU schedule',
          badge: 'Settlement Terms',
          badgeColor: 'blue',
          timeline: 'Pre-Mediation',
          description:
            'Offer 12 months base salary severance with standard mutual release in lieu of requested $750k immediate cash out.',
        },
      ];
    }

    // Default fallback
    return [
      {
        id: 'plan_custom_1',
        title: 'Formulate localized risk stratification matrix',
        badge: 'Local Vault',
        badgeColor: 'green',
        timeline: 'Today',
        description: 'Verify all extracted entities against user-specified domain constraints.',
      },
      {
        id: 'plan_custom_2',
        title: 'Cross-correlate relational entities across memory records',
        badge: 'Blind Logic',
        badgeColor: 'blue',
        timeline: 'This Week',
        description: 'Synthesize dependency vectors without exposing raw identifiers to external servers.',
      },
      {
        id: 'plan_custom_3',
        title: 'Synthesize final grounded execution report',
        badge: 'Grounded Output',
        badgeColor: 'amber',
        timeline: 'Ongoing',
        description: 'Re-hydrate abstract blueprint with confidential numbers inside device memory.',
      },
    ];
  }, [scenarioId, blueprint]);

  const completedCount = items.filter((item) => checkedItemIds[item.id]).length;

  const getBadgeClass = (color: PlanItem['badgeColor']) => {
    switch (color) {
      case 'amber':
        return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
      case 'green':
        return 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]';
      case 'rose':
        return 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]';
      case 'blue':
      default:
        return 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]';
    }
  };

  return (
    <section className="bg-white rounded-2xl p-6 border border-[#E6E5E0] shadow-[0_1px_2px_0_rgba(24,24,27,0.03)] mb-8 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between pb-5 border-b border-[#F0EFEA]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-[#18181B] tracking-tight">Actionable Focus Plan</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]">
              {items.length} Interventions
            </span>
          </div>
          <p className="text-xs text-[#6B7280]">
            Synthesized from your confidential files. Private to your device.
          </p>
        </div>
        <div className="hidden sm:flex items-center text-xs text-[#6B7280] bg-[#F7F7F5] px-2.5 py-1 rounded-lg border border-[#E6E5E0]">
          <ListChecks className="w-4 h-4 mr-1 text-[#6B7280]" />
          <span>{completedCount} of {items.length} completed</span>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="divide-y divide-[#F0EFEA]">
        {items.map((item) => {
          const isChecked = Boolean(checkedItemIds[item.id]);
          return (
            <div key={item.id} className="py-4.5 group flex items-start gap-3.5 transition-colors">
              <button
                type="button"
                onClick={() => onToggleItem(item.id)}
                className={`check-btn mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 focus:outline-none cursor-pointer ${
                  isChecked
                    ? 'bg-[#15803D] border-[#15803D]'
                    : 'border-[#D4D4D8] hover:border-[#15803D] bg-white'
                }`}
                title={isChecked ? 'Mark incomplete' : 'Mark completed'}
              >
                {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`text-sm font-semibold text-[#18181B] transition-all ${
                      isChecked ? 'line-strike' : ''
                    }`}
                  >
                    {item.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getBadgeClass(
                      item.badgeColor
                    )}`}
                  >
                    {item.badge}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-[#F4F4F5] text-[#6B7280]">
                    {item.timeline}
                  </span>
                </div>
                <p
                  className={`text-xs text-[#4B5563] leading-relaxed transition-opacity ${
                    isChecked ? 'opacity-50' : ''
                  }`}
                >
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ActionableFocusPlan;
