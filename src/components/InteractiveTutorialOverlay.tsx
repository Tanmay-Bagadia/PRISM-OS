import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  CheckCircle2,
  Lightbulb,
  FileText,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import type { TutorialStep } from '../types/tutorial';
import { PRISM_TUTORIAL_STEPS } from '../lib/prism/tutorialSteps';
import {
  detectOnDeviceGeminiNano,
  type OnDeviceCapabilityReport,
} from '../lib/prism/onDeviceCapability';

export interface InteractiveTutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onLoadDemoSample?: () => void;
}

interface CutoutRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CUTOUT_PADDING = 8;
const VIEWPORT_MARGIN = 16;
const CARD_GAP = 16;
const DEFAULT_CARD_WIDTH = 360;
const DEFAULT_CARD_MAX_HEIGHT = 340;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function getPaddedCutoutRect(el: Element): CutoutRect | null {
  const raw = el.getBoundingClientRect();
  if (raw.width <= 0 || raw.height <= 0) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.round(Math.max(0, raw.top - CUTOUT_PADDING));
  const left = Math.round(Math.max(0, raw.left - CUTOUT_PADDING));
  const right = Math.round(Math.min(vw, raw.right + CUTOUT_PADDING));
  const bottom = Math.round(Math.min(vh, raw.bottom + CUTOUT_PADDING));
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) return null;
  return { top, left, width, height };
}

function rectsEqual(a: CutoutRect | null, b: CutoutRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function computeCardPosition(
  rect: CutoutRect | null,
  cardWidth: number,
  cardHeight: number,
  vw: number,
  vh: number
): { top: number; left: number } {
  const maxLeft = Math.max(VIEWPORT_MARGIN, vw - cardWidth - VIEWPORT_MARGIN);
  const maxTop = Math.max(VIEWPORT_MARGIN, vh - cardHeight - VIEWPORT_MARGIN);

  if (!rect) {
    return {
      top: clamp((vh - cardHeight) / 2, VIEWPORT_MARGIN, maxTop),
      left: clamp((vw - cardWidth) / 2, VIEWPORT_MARGIN, maxLeft),
    };
  }

  const cutoutBottom = rect.top + rect.height;
  const cutoutRight = rect.left + rect.width;
  const centeredLeft = clamp(
    rect.left + rect.width / 2 - cardWidth / 2,
    VIEWPORT_MARGIN,
    maxLeft
  );
  const centeredTop = clamp(
    rect.top + rect.height / 2 - cardHeight / 2,
    VIEWPORT_MARGIN,
    maxTop
  );

  // 1. Prefer placing below the cutout
  if (cutoutBottom + CARD_GAP + cardHeight <= vh - VIEWPORT_MARGIN) {
    return { top: cutoutBottom + CARD_GAP, left: centeredLeft };
  }

  // 2. Otherwise place above the cutout
  if (rect.top - CARD_GAP - cardHeight >= VIEWPORT_MARGIN) {
    return { top: rect.top - CARD_GAP - cardHeight, left: centeredLeft };
  }

  // 3. For tall elements, place to the right
  if (cutoutRight + CARD_GAP + cardWidth <= vw - VIEWPORT_MARGIN) {
    return { top: centeredTop, left: cutoutRight + CARD_GAP };
  }

  // 4. Or to the left
  if (rect.left - CARD_GAP - cardWidth >= VIEWPORT_MARGIN) {
    return { top: centeredTop, left: rect.left - CARD_GAP - cardWidth };
  }

  // 5. Fallback: clamp cleanly inside viewport margins
  return {
    top: clamp(vh - cardHeight - VIEWPORT_MARGIN, VIEWPORT_MARGIN, maxTop),
    left: clamp(vw - cardWidth - VIEWPORT_MARGIN, VIEWPORT_MARGIN, maxLeft),
  };
}

export const InteractiveTutorialOverlay: React.FC<InteractiveTutorialOverlayProps> = ({
  isOpen,
  onClose,
  onComplete,
  onLoadDemoSample,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<CutoutRect | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));
  const [measuredCardHeight, setMeasuredCardHeight] = useState<number>(DEFAULT_CARD_MAX_HEIGHT);
  const [capabilityReport, setCapabilityReport] = useState<OnDeviceCapabilityReport | null>(null);
  const [isCheckingCapability, setIsCheckingCapability] = useState(false);
  const [showEnablementHint, setShowEnablementHint] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const steps: TutorialStep[] = PRISM_TUTORIAL_STEPS;
  const totalSteps = steps.length;
  const step = steps[currentIndex];
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;
  const isNanoAvailable = capabilityReport?.status === 'AVAILABLE';

  const runCapabilityCheck = useCallback(async (isCancelled?: () => boolean) => {
    setIsCheckingCapability(true);
    try {
      const report = await detectOnDeviceGeminiNano();
      if (!isCancelled?.()) {
        setCapabilityReport(report);
      }
    } finally {
      if (!isCancelled?.()) {
        setIsCheckingCapability(false);
      }
    }
  }, []);

  // Reset to step 0 and run on-device AI capability check whenever the overlay opens
  useEffect(() => {
    let cancelled = false;

    if (isOpen) {
      setCurrentIndex(0);
      setShowEnablementHint(false);
      void runCapabilityCheck(() => cancelled);
    } else {
      setTargetRect(null);
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, runCapabilityCheck]);

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

  // Track rendered tutorial card height for collision-free placement
  useEffect(() => {
    if (!isOpen || !cardRef.current) return;

    const updateCardHeight = () => {
      if (!cardRef.current) return;
      const height = cardRef.current.getBoundingClientRect().height;
      if (height > 0) {
        setMeasuredCardHeight(height);
      }
    };

    updateCardHeight();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateCardHeight);
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isOpen, currentIndex]);

  // Locate target anchor, scroll into view, and track live bounding rect
  useEffect(() => {
    if (!isOpen || !step?.targetAnchorId) {
      setTargetRect(null);
      return;
    }

    let targetEl: Element | null = null;
    try {
      const selector = `[data-tutorial-anchor="${step.targetAnchorId}"], #${step.targetAnchorId}`;
      targetEl = document.querySelector(selector);
    } catch {
      setTargetRect(null);
      return;
    }

    if (!targetEl) {
      setTargetRect(null);
      return;
    }

    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    let rafId: number | null = null;
    let smoothScrollFrames = 0;

    const syncMeasurements = () => {
      setViewport((prev) =>
        prev.width === window.innerWidth && prev.height === window.innerHeight
          ? prev
          : { width: window.innerWidth, height: window.innerHeight }
      );
      if (!targetEl) return;
      const nextRect = getPaddedCutoutRect(targetEl);
      setTargetRect((prev) => (rectsEqual(prev, nextRect) ? prev : nextRect));
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        syncMeasurements();
      });
    };

    // Track smooth scroll animation frames briefly after step change
    let scrollTrackRaf: number | null = null;
    const trackSmoothScroll = () => {
      syncMeasurements();
      smoothScrollFrames += 1;
      if (smoothScrollFrames < 40) {
        scrollTrackRaf = window.requestAnimationFrame(trackSmoothScroll);
      }
    };
    scrollTrackRaf = window.requestAnimationFrame(trackSmoothScroll);

    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(targetEl);
      if (document.body) {
        resizeObserver.observe(document.body);
      }
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (scrollTrackRaf !== null) window.cancelAnimationFrame(scrollTrackRaf);
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [isOpen, step?.targetAnchorId]);

  const cardWidth = Math.min(DEFAULT_CARD_WIDTH, Math.max(240, viewport.width - VIEWPORT_MARGIN * 2));
  const effectiveCardHeight = Math.min(measuredCardHeight, Math.max(200, viewport.height - VIEWPORT_MARGIN * 2));

  const cardPosition = useMemo(
    () =>
      computeCardPosition(
        targetRect,
        cardWidth,
        effectiveCardHeight,
        viewport.width,
        viewport.height
      ),
    [targetRect, cardWidth, effectiveCardHeight, viewport.width, viewport.height]
  );

  if (!isOpen || !step) return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prism-tutorial-title"
    >
      {targetRect ? (
        <>
          {/* Seamless single-layer blurred backdrop with evenodd rounded-rect clip-path (100% unblurred inside cutout, zero seams) */}
          {(() => {
            const x = targetRect.left;
            const y = targetRect.top;
            const w = targetRect.width;
            const h = targetRect.height;
            const r = Math.min(14, Math.floor(w / 2), Math.floor(h / 2));
            const vw = viewport.width;
            const vh = viewport.height;
            const d = [
              `M 0 0 H ${vw} V ${vh} H 0 Z`,
              `M ${x + r} ${y}`,
              `H ${x + w - r}`,
              `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
              `V ${y + h - r}`,
              `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
              `H ${x + r}`,
              `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
              `V ${y + r}`,
              `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`,
            ].join(' ');
            return (
              <div
                className="fixed inset-0 backdrop-blur-md bg-slate-950/45 transition-opacity duration-300 pointer-events-none"
                style={{
                  clipPath: `path(evenodd, "${d}")`,
                  WebkitClipPath: `path(evenodd, "${d}")`,
                }}
                aria-hidden="true"
              />
            );
          })()}

          {/* 4 transparent click-catcher strips around the cutout so outside clicks close, inside clicks pass through */}
          <div
            className="fixed pointer-events-auto"
            style={{ top: 0, left: 0, right: 0, height: targetRect.top }}
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            className="fixed pointer-events-auto"
            style={{ top: targetRect.top + targetRect.height, left: 0, right: 0, bottom: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            className="fixed pointer-events-auto"
            style={{ top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height }}
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            className="fixed pointer-events-auto"
            style={{ top: targetRect.top, left: targetRect.left + targetRect.width, right: 0, height: targetRect.height }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Crisp glowing cutout ring aligned to the rounded SVG mask (non-blocking) */}
          <div
            className="fixed rounded-[14px] ring-2 ring-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] transition-all duration-300 pointer-events-none"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
            aria-hidden="true"
          />
        </>
      ) : (
        /* Graceful fallback when target element is not rendered on screen */
        <div
          className="fixed inset-0 backdrop-blur-md bg-slate-950/45 transition-opacity duration-300 pointer-events-auto"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Teleporting walkthrough card */}
      <section
        ref={cardRef}
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          width: cardWidth,
        }}
        className="fixed z-50 pointer-events-auto bg-white border border-[#E6E5E0] rounded-2xl shadow-[0_16px_40px_rgba(24,24,27,0.18)] p-5 flex flex-col gap-3.5 max-h-[calc(100vh-32px)] overflow-y-auto transition-all duration-300 ease-out"
      >
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

        {/* Step 1: Compact on-device AI status pill */}
        {step.id === 'WORKSPACE_INPUT' && (
          <div className="flex items-center">
            {isCheckingCapability && !capabilityReport ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F7F7F5] text-[#4B5563] border border-[#E6E5E0]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Checking on-device Gemini Nano...</span>
              </span>
            ) : isNanoAvailable ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                <span>Gemini Nano Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                <span>Nano Not Enabled • Auto-Hybrid Ready</span>
              </span>
            )}
          </div>
        )}

        {/* Step 2: Prominent live On-Device AI (Gemini Nano) Check card */}
        {step.id === 'EXECUTION_MODES' && (
          <div className="rounded-xl border border-[#E6E5E0] bg-[#FAFAFA] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#18181B]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#18181B]">
                  On-Device AI (Gemini Nano) Check
                </span>
              </div>

              <button
                type="button"
                onClick={() => void runCapabilityCheck()}
                disabled={isCheckingCapability}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#E6E5E0] bg-white hover:bg-[#F7F7F5] text-[11px] font-medium text-[#18181B] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingCapability ? 'animate-spin' : ''}`} />
                <span>Re-check</span>
              </button>
            </div>

            {isCheckingCapability && !capabilityReport ? (
              <p className="text-xs text-[#4B5563]">Checking whether your browser supports on-device Gemini Nano...</p>
            ) : isNanoAvailable ? (
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  <span>Gemini Nano Active</span>
                </span>
                <p className="text-xs leading-relaxed text-[#14532D]">
                  On-device AI is ready on this browser for zero-network local processing—your files never need to leave your computer.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                  <span>Nano Not Enabled • Auto-Hybrid Ready</span>
                </span>
                <p className="text-xs leading-relaxed text-[#4B5563]">
                  No worries—PRISM-OS still hides all your personal info locally first and automatically uses anonymized Cloud AI when needed.
                </p>

                {capabilityReport?.enablementHint && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowEnablementHint((prev) => !prev)}
                      aria-expanded={showEnablementHint}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#18181B] hover:underline cursor-pointer"
                    >
                      <span>How to enable Nano in Chrome</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          showEnablementHint ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {showEnablementHint && (
                      <p className="mt-1.5 rounded-lg bg-white border border-[#E6E5E0] p-2 text-[11px] leading-relaxed text-[#4B5563] break-words">
                        {capabilityReport.enablementHint}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                <span>Try Sample Note</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Controls: Skip, Back, Next / Done */}
        <div className="flex items-center justify-between pt-1 border-t border-[#E6E5E0]">
          <button
            type="button"
            onClick={onComplete}
            className="text-xs font-medium text-[#6B7280] hover:text-[#18181B] transition-colors cursor-pointer"
          >
            Skip
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
                  <span>Done</span>
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
