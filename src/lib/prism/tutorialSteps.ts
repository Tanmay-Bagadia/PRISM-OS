import type { TutorialStep } from '../../types/tutorial.ts';

export const TUTORIAL_STORAGE_KEY = 'prism_tutorial_seen_v1';

export const PRISM_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'WORKSPACE_INPUT',
    stepNumber: 1,
    title: '1. Add Any Sensitive File or Note',
    subtitle:
      'Works with any private document—medical records, legal contracts, financial statements, or personal notes. Drop a file or paste text directly; it stays right on your device.',
    privacyGuarantee: 'Stays on your device • 0 bytes uploaded',
    targetAnchorId: 'tutorial-workspace-input',
    actionHint: "Drop any file here or click 'Try Sample Note' below to test it out.",
  },
  {
    id: 'EXECUTION_MODES',
    stepNumber: 2,
    title: '2. Pick How You Want It Analyzed',
    subtitle:
      'PRISM-OS automatically routes between on-device Gemini Nano and anonymized Cloud Gemini based on what your device supports—or you can pick Local Only, Smart Hybrid, or Offline Mode yourself.',
    privacyGuarantee: 'Your name, IDs, and exact numbers are hidden locally first',
    targetAnchorId: 'tutorial-execution-modes',
    actionHint: 'Check your device readiness above, pick a mode, and click Analyze.',
  },
  {
    id: 'GROUNDED_BENCHMARKS',
    stepNumber: 3,
    title: '3. Compare Against Your Own Targets (Optional)',
    subtitle:
      'Want to see how any numbers or terms stack up? Paste your own target goals, policy rules, or market benchmarks and name your source. PRISM compares your ratios without exposing your private details.',
    privacyGuarantee: 'Only safe percentages are compared—never your raw numbers',
    targetAnchorId: 'tutorial-grounded-benchmarks',
    actionHint: 'Open this box anytime you want to compare against a benchmark.',
  },
  {
    id: 'PRIVACY_PROOF',
    stepNumber: 4,
    title: '4. Check Your Privacy Proof',
    subtitle:
      'After every run, see whether on-device Gemini Nano or anonymized Cloud Gemini did the work, and open the Privacy Receipt to verify that none of your personal information left your device.',
    privacyGuarantee: '100% transparent • Inspect everything sent vs. kept private',
    targetAnchorId: 'tutorial-privacy-proof',
    actionHint: 'Click the Privacy Receipt badge after running an analysis.',
  },
  {
    id: 'HISTORY_AND_EXPORT',
    stepNumber: 5,
    title: '5. Save in Folders, Compare Runs & Share Safely',
    subtitle:
      'Organize past results from any document into folders right in your browser, compare any two runs over time, and share a masked (safe) or full report on Gmail or WhatsApp.',
    privacyGuarantee: 'Saved privately in your browser • Only cleared if you delete it',
    targetAnchorId: 'tutorial-history-export',
    actionHint: 'Use History & Trends to organize folders or Safe to Export to share.',
  },
];

function getSafeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns whether the user has already completed or dismissed the tutorial.
 * Safely falls back to `false` in SSR, Node/Vitest, or restricted storage contexts.
 */
export function hasCompletedTutorial(): boolean {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return false;
  }
  try {
    return storage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks the tutorial as completed in `localStorage`.
 * No-ops safely in SSR, Node/Vitest, or restricted storage contexts.
 */
export function markTutorialCompleted(): void {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage quota or security errors in restricted environments.
  }
}

/**
 * Clears the tutorial completion flag from `localStorage`.
 * No-ops safely in SSR, Node/Vitest, or restricted storage contexts.
 */
export function resetTutorialState(): void {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(TUTORIAL_STORAGE_KEY);
  } catch {
    // Ignore storage security errors in restricted environments.
  }
}
