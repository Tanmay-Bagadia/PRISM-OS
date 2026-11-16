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
  blueprint: ReasoningBlueprint | null;
  checkedItemIds: Record<string, boolean>;
  onToggleItem: (id: string) => void;
  isRunning?: boolean;
}

export const ActionableFocusPlan: React.FC<ActionableFocusPlanProps> = ({
  blueprint,
  checkedItemIds,
  onToggleItem,
  isRunning = false,
}) => {
  // Derive items 100% dynamically from the live ReasoningBlueprint steps
  const items: PlanItem[] = React.useMemo(() => {
    if (!blueprint || !blueprint.steps || blueprint.steps.length === 0) {
      return [];
    }

    const badgeColors: PlanItem['badgeColor'][] = ['amber', 'green', 'blue', 'rose'];
    const timelines = ['Immediate', 'Phase 2', 'Ongoing'];

    return blueprint.steps.map((step, idx) => ({
      id: step.id || `step_${idx}`,
      title: step.action,
      badge: `Step ${idx + 1} Directive`,
      badgeColor: badgeColors[idx % badgeColors.length] || 'blue',
      timeline: timelines[idx % timelines.length] || 'Target',
      description: `${step.output}. Grounded locally in device memory with zero data leakage.`,
    }));
  }, [blueprint]);

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
            {items.length > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]">
                {items.length} {items.length === 1 ? 'Intervention' : 'Interventions'}
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280]">
            {items.length > 0
              ? 'Synthesized dynamically from on-device reasoning blueprint. Private to your device.'
              : 'Awaiting pipeline execution to synthesize actionable interventions.'}
          </p>
        </div>

        {items.length > 0 && (
          <div className="hidden sm:flex items-center text-xs text-[#6B7280] bg-[#F7F7F5] px-2.5 py-1 rounded-lg border border-[#E6E5E0]">
            <ListChecks className="w-4 h-4 mr-1 text-[#6B7280]" />
            <span>
              {completedCount} of {items.length} completed
            </span>
          </div>
        )}
      </div>

      {/* Body: Empty State when no blueprint has been formulated yet */}
      {items.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#F7F7F5] border border-[#E6E5E0] flex items-center justify-center text-[#6B7280]">
            <ListChecks className="w-5 h-5 text-[#6B7280]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#18181B]">
              {isRunning ? 'Synthesizing Focus Plan...' : 'Awaiting Plan Synthesis'}
            </h4>
            <p className="text-xs text-[#6B7280] max-w-md mt-1 leading-relaxed">
              {isRunning
                ? 'PRISM is formulating structured reasoning directives from the abstract topology.'
                : 'Actionable focus items are synthesized on-device from Stage 2 reasoning blueprints. Run the pipeline above to formulate a personalized plan.'}
            </p>
          </div>
        </div>
      ) : (
        /* Dynamic Checklist Items */
        <div className="divide-y divide-[#F0EFEA] animate-in fade-in duration-200">
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
      )}
    </section>
  );
};

export default ActionableFocusPlan;
