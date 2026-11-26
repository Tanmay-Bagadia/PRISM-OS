import type { TutorialStep } from '../../types/tutorial.ts';

export const TUTORIAL_STORAGE_KEY = 'prism_tutorial_seen_v1';

export const PRISM_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'WORKSPACE_INPUT',
    stepNumber: 1,
    title: 'Private Local Workspace',
    subtitle:
      'Drop financial statements, clinical lab reports, or legal contracts—or paste sensitive notes directly. Everything is parsed and scrubbed locally in your browser before any analysis begins.',
    privacyGuarantee: '0 bytes of raw PII or source files ever leave your device.',
    targetAnchorId: 'tutorial-workspace-input',
    actionHint: 'Drop a file, paste text, or load a sample scenario to start.',
  },
  {
    id: 'EXECUTION_MODES',
    stepNumber: 2,
    title: 'Hybrid & Offline Processing',
    subtitle:
      'Choose Local Only for air-gapped processing, Smart Hybrid to send only an anonymized topology to Cloud AI and rehydrate results locally, Deep Analysis for multi-step synthesis, or simulate Offline Mode using cached blueprints.',
    privacyGuarantee: 'Cloud AI only sees abstract IDs and unitless deltas—never names, figures, or records.',
    targetAnchorId: 'tutorial-execution-modes',
    actionHint: 'Pick an execution mode or toggle Offline Mode to test cached blueprints.',
  },
  {
    id: 'GROUNDED_BENCHMARKS',
    stepNumber: 3,
    title: 'Cited Blind Benchmarks',
    subtitle:
      'Optionally attach your own market, clinical, or legal reference targets along with a source citation. PRISM-OS compares unitless ratios against your benchmark without exposing raw figures.',
    privacyGuarantee: 'Benchmarks are evaluated using normalized ratios so raw values stay local.',
    targetAnchorId: 'tutorial-grounded-benchmarks',
    actionHint: 'Add optional target ratios and a citation, or skip to use default checks.',
  },
  {
    id: 'PRIVACY_PROOF',
    stepNumber: 4,
    title: 'Live Execution & Privacy Receipt',
    subtitle:
      'After every run, verify whether Cloud AI, a Cached Blueprint, or Automatic Local Fallback executed, and inspect the exact anonymized graph side-by-side with your locally hydrated report.',
    privacyGuarantee: 'Full audit trail proving what crossed the cloud boundary vs. what stayed local.',
    targetAnchorId: 'tutorial-privacy-proof',
    actionHint: 'Open the Privacy Receipt after running to inspect the anonymized payload.',
  },
  {
    id: 'HISTORY_AND_EXPORT',
    stepNumber: 5,
    title: 'Local Folders, Diffs & Safe Share',
    subtitle:
      'Organize runs into local IndexedDB folders, compare any two runs over time to spot changes, and export either Masked (Zero-PII) or Unmasked briefs directly to Gmail or WhatsApp.',
    privacyGuarantee: 'History is stored locally in IndexedDB; Masked exports strip all personal identifiers.',
    targetAnchorId: 'tutorial-history-export',
    actionHint: 'Save runs to folders, diff two snapshots, or share a masked brief.',
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
