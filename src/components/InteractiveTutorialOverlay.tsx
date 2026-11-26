import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Lightbulb,
  FileText,
} from 'lucide-react';
import type { TutorialStep } from '../types/tutorial';
import { PRISM_TUTORIAL_STEPS } from '../lib/prism/tutorialSteps';

export interface InteractiveTutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onLoadDemoSample?: () => void;
}

const HIGHLIGHT_CLASSES = [
  'ring-2',
  'ring-[#15803D]',
  'ring-offset-2',
  'ring-offset-[#F7F7F5]',
  'transition-shadow',
];

export const InteractiveTutorialOverlay: React.FC<InteractiveTutorialOverlayProps> = ({
  isOpen,
  onClose,
  onComplete,
  onLoadDemoSample,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const steps: TutorialStep[] = PRISM_TUTORIAL_STEPS;
  const totalSteps = steps.length;
  const step = steps[currentIndex];
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  // Reset to step 0 whenever the overlay is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentIndex((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  }, [isLastStep, onComplete, totalSteps]);

  const handleBack = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation: ArrowRight, ArrowLeft, Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handleBack]);

  // Scroll target anchor into view and apply temporary ring highlight
  useEffect(() => {
    if (!isOpen || !step?.targetAnchorId) return;

    let targetEl: Element | null = null;
    try {
      const selector = `[data-tutorial-anchor="${step.targetAnchorId}"], #${step.targetAnchorId}`;
      targetEl = document.querySelector(selector);
    } catch {
      return;
    }

    if (!targetEl) return;

    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetEl.classList.add(...HIGHLIGHT_CLASSES);

    const timer = window.setTimeout(() => {
      targetEl?.classList.remove(...HIGHLIGHT_CLASSES);
    }, 2400);

    return () => {
      window.clearTimeout(timer);
      targetEl?.classList.remove(...HIGHLIGHT_CLASSES);
    };
  }, [isOpen, step?.targetAnchorId]);

  if (!isOpen || !step) return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prism-tutorial-title"
    >
      {/* Subtle non-intrusive backdrop */}
      <div
        className="fixed inset-0 bg-[#18181B]/15 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating walkthrough card */}
      <section className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px] bg-white border border-[#E6E5E0] rounded-2xl shadow-[0_16px_40px_rgba(24,24,27,0.14)] p-5 flex flex-col gap-4 z-50">
        {/* Header: Step pills + Close */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-medium text-[#4B5563] bg-[#F7F7F5] border border-[#E6E5E0] px-2 py-0.5 rounded-full tabular-nums">
              {currentIndex + 1} of {totalSteps}
            </span>

            {/* Clickable step dots */}
            <nav className="flex items-center gap-1.5" aria-label="Tutorial steps">
              {steps.map((s, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to step ${idx + 1}: ${s.title}`}
                    aria-current={isActive ? 'step' : undefined}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      isActive
                        ? 'w-5 bg-[#18181B]'
                        : 'w-2 bg-[#E6E5E0] hover:bg-[#9CA3AF]'
                    }`}
                  />
                );
              })}
            </nav>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tutorial"
            className="p-1 rounded-lg text-[#6B7280] hover:text-[#18181B] hover:bg-[#F7F7F5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h2
            id="prism-tutorial-title"
            className="text-base font-semibold text-[#18181B] tracking-tight"
          >
            {step.title}
          </h2>
          <p className="text-xs leading-relaxed text-[#4B5563]">{step.subtitle}</p>
        </div>

        {/* "What Stays On-Device" emerald privacy callout */}
        <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D]">
              What Stays On-Device
            </div>
            <p className="text-xs leading-relaxed text-[#14532D]">
              {step.privacyGuarantee}
            </p>
          </div>
        </div>

        {/* "Try It" action hint box */}
        <div className="rounded-xl bg-[#F7F7F5] border border-[#E6E5E0] p-3 flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-[#18181B] shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#18181B]">
              Try It
            </div>
            <p className="text-xs leading-relaxed text-[#4B5563]">
              {step.actionHint}
            </p>

            {step.id === 'WORKSPACE_INPUT' && onLoadDemoSample && (
              <button
                type="button"
                onClick={onLoadDemoSample}
                className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#E6E5E0] hover:border-[#18181B] text-xs font-medium text-[#18181B] shadow-xs transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#15803D]" />
                <span>Load Neutral Demo Brief</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Controls: Skip Tour, Back, Next / Finish Tour */}
        <div className="flex items-center justify-between pt-1 border-t border-[#E6E5E0]">
          <button
            type="button"
            onClick={onComplete}
            className="text-xs font-medium text-[#6B7280] hover:text-[#18181B] transition-colors cursor-pointer"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={isFirstStep}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isFirstStep
                  ? 'border-[#E6E5E0] text-[#9CA3AF] bg-[#F7F7F5] cursor-not-allowed'
                  : 'border-[#E6E5E0] text-[#18181B] bg-white hover:bg-[#F7F7F5] cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>Finish Tour</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InteractiveTutorialOverlay;
