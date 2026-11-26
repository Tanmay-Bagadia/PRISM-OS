import type { TutorialStep } from '../../types/tutorial.ts';

export const TUTORIAL_STORAGE_KEY = 'prism_tutorial_seen_v1';

export const PRISM_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'WORKSPACE_INPUT',
    stepNumber: 1,
    title: '1. Add Your Private File or Note',
    subtitle:
      'Drop in a medical bill, bank statement, contract, or note—or paste text directly. Your file stays right here on your device and is never uploaded to any server.',
    privacyGuarantee: 'Stays on your device • 0 bytes uploaded',
    targetAnchorId: 'tutorial-workspace-input',
    actionHint: "Drop a file here or click 'Try Sample Note' below to test it out.",
  },
  {
    id: 'EXECUTION_MODES',
    stepNumber: 2,
    title: '2. Pick How You Want It Analyzed',
    subtitle:
      "Use 'Local Only' to keep everything 100% offline on your computer, 'Smart Hybrid' to get help from cloud AI without sharing your personal details, or 'Offline Mode' when you have no internet.",
    privacyGuarantee: 'Your name, IDs, and exact numbers are hidden first',
    targetAnchorId: 'tutorial-execution-modes',
    actionHint: 'Choose a mode, then click Analyze.',
  },
  {
    id: 'GROUNDED_BENCHMARKS',
    stepNumber: 3,
    title: '3. Compare Against Your Own Targets (Optional)',
    subtitle:
      'Want to see how your numbers stack up? Paste your own target goals or market benchmarks and name your source. PRISM compares your ratios without exposing your private figures.',
    privacyGuarantee: 'Only safe percentages are compared—never your raw numbers',
    targetAnchorId: 'tutorial-grounded-benchmarks',
    actionHint: 'Open this box anytime you want to compare against a benchmark.',
  },
  {
    id: 'PRIVACY_PROOF',
    stepNumber: 4,
    title: '4. Check Your Privacy Proof',
    subtitle:
      'After every run, see which engine did the work and open the Privacy Receipt to verify with your own eyes that none of your personal information left your device.',
    privacyGuarantee: '100% transparent • Inspect everything sent vs. kept private',
    targetAnchorId: 'tutorial-privacy-proof',
    actionHint: 'Click the Privacy Receipt badge after running an analysis.',
  },
  {
    id: 'HISTORY_AND_EXPORT',
    stepNumber: 5,
    title: '5. Save in Folders, Compare Runs & Share Safely',
    subtitle:
      'Organize past results into folders right in your browser, compare any two runs to track progress over time, and share a masked (safe) or full report on Gmail or WhatsApp.',
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
