import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PRISM_TUTORIAL_STEPS,
  TUTORIAL_STORAGE_KEY,
  hasCompletedTutorial,
  markTutorialCompleted,
  resetTutorialState,
} from '../src/lib/prism/tutorialSteps.ts';
import type { TutorialStepId } from '../src/types/tutorial.ts';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('PRISM_TUTORIAL_STEPS', () => {
  it('defines 5 ordered steps with unique TutorialStepId values and required content', () => {
    const expectedIds: TutorialStepId[] = [
      'WORKSPACE_INPUT',
      'EXECUTION_MODES',
      'GROUNDED_BENCHMARKS',
      'PRIVACY_PROOF',
      'HISTORY_AND_EXPORT',
    ];

    expect(PRISM_TUTORIAL_STEPS).toHaveLength(5);

    const seenIds = new Set<TutorialStepId>();
    PRISM_TUTORIAL_STEPS.forEach((step, index) => {
      expect(step.stepNumber).toBe(index + 1);
      expect(step.id).toBe(expectedIds[index]);
      expect(seenIds.has(step.id)).toBe(false);
      seenIds.add(step.id);

      expect(step.targetAnchorId.trim().length).toBeGreaterThan(0);
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.subtitle.trim().length).toBeGreaterThan(0);
      expect(step.privacyGuarantee.trim().length).toBeGreaterThan(0);
      expect(step.actionHint.trim().length).toBeGreaterThan(0);
    });
  });

  it('uses the expected targetAnchorId for each pillar', () => {
    expect(PRISM_TUTORIAL_STEPS.map((step) => step.targetAnchorId)).toEqual([
      'tutorial-workspace-input',
      'tutorial-execution-modes',
      'tutorial-grounded-benchmarks',
      'tutorial-privacy-proof',
      'tutorial-history-export',
    ]);
  });
});

describe('tutorial localStorage helpers', () => {
  let memoryStorage: Storage;

  beforeEach(() => {
    memoryStorage = createMemoryStorage();
    vi.stubGlobal('window', { localStorage: memoryStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists and resets prism_tutorial_seen_v1 cleanly', () => {
    expect(TUTORIAL_STORAGE_KEY).toBe('prism_tutorial_seen_v1');
    expect(hasCompletedTutorial()).toBe(false);

    markTutorialCompleted();
    expect(memoryStorage.getItem('prism_tutorial_seen_v1')).toBe('true');
    expect(hasCompletedTutorial()).toBe(true);

    resetTutorialState();
    expect(memoryStorage.getItem('prism_tutorial_seen_v1')).toBeNull();
    expect(hasCompletedTutorial()).toBe(false);
  });

  it('degrades gracefully when window is undefined (SSR/Node)', () => {
    vi.stubGlobal('window', undefined);

    expect(hasCompletedTutorial()).toBe(false);
    expect(() => markTutorialCompleted()).not.toThrow();
    expect(() => resetTutorialState()).not.toThrow();
  });

  it('degrades gracefully when localStorage throws', () => {
    const throwingStorage: Storage = {
      ...createMemoryStorage(),
      getItem() {
        throw new Error('SecurityError');
      },
      setItem() {
        throw new Error('QuotaExceededError');
      },
      removeItem() {
        throw new Error('SecurityError');
      },
    };
    vi.stubGlobal('window', { localStorage: throwingStorage });

    expect(hasCompletedTutorial()).toBe(false);
    expect(() => markTutorialCompleted()).not.toThrow();
    expect(() => resetTutorialState()).not.toThrow();
  });
});
