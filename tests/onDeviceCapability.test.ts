import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectOnDeviceGeminiNano } from '../src/lib/prism/onDeviceCapability.ts';

const ORIGINAL_LANGUAGE_MODEL = (globalThis as Record<string, unknown>).LanguageModel;
const ORIGINAL_AI = (globalThis as Record<string, unknown>).ai;

function restoreGlobals() {
  if (ORIGINAL_LANGUAGE_MODEL === undefined) {
    delete (globalThis as Record<string, unknown>).LanguageModel;
  } else {
    (globalThis as Record<string, unknown>).LanguageModel = ORIGINAL_LANGUAGE_MODEL;
  }

  if (ORIGINAL_AI === undefined) {
    delete (globalThis as Record<string, unknown>).ai;
  } else {
    (globalThis as Record<string, unknown>).ai = ORIGINAL_AI;
  }
}

describe('detectOnDeviceGeminiNano', () => {
  afterEach(() => {
    vi.useRealTimers();
    restoreGlobals();
  });

  it('returns AVAILABLE when Chrome 138+ LanguageModel.availability() resolves "available"', async () => {
    (globalThis as Record<string, unknown>).LanguageModel = {
      availability: vi.fn().mockResolvedValue('available'),
    };

    const report = await detectOnDeviceGeminiNano();

    expect(report.status).toBe('AVAILABLE');
    expect(report.engineLabel).toContain('Gemini Nano');
    expect(report.plainEnglishSummary.trim().length).toBeGreaterThan(0);
    expect(report.enablementHint).toBe('');
  });

  it('returns AVAILABLE when legacy ai.languageModel.capabilities() resolves "readily"', async () => {
    delete (globalThis as Record<string, unknown>).LanguageModel;
    (globalThis as Record<string, unknown>).ai = {
      languageModel: {
        capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
      },
    };

    const report = await detectOnDeviceGeminiNano();

    expect(report.status).toBe('AVAILABLE');
    expect(report.enablementHint).toBe('');
  });

  it('returns DOWNLOADABLE for "downloadable", "downloading", and "after-download" states with Chrome flag hints', async () => {
    for (const state of ['downloadable', 'downloading', 'after-download']) {
      (globalThis as Record<string, unknown>).LanguageModel = {
        availability: vi.fn().mockResolvedValue(state),
      };

      const report = await detectOnDeviceGeminiNano();

      expect(report.status).toBe('DOWNLOADABLE');
      expect(report.enablementHint).toContain('chrome://flags/#prompt-api-for-gemini-nano');
      expect(report.enablementHint).toContain('chrome://flags/#optimization-guide-on-device-model');
    }

    delete (globalThis as Record<string, unknown>).LanguageModel;
    (globalThis as Record<string, unknown>).ai = {
      languageModel: {
        capabilities: vi.fn().mockResolvedValue({ available: 'after-download' }),
      },
    };

    const fallbackReport = await detectOnDeviceGeminiNano();
    expect(fallbackReport.status).toBe('DOWNLOADABLE');
  });

  it('returns UNAVAILABLE when neither LanguageModel nor ai.languageModel is present', async () => {
    delete (globalThis as Record<string, unknown>).LanguageModel;
    delete (globalThis as Record<string, unknown>).ai;

    const report = await detectOnDeviceGeminiNano();

    expect(report.status).toBe('UNAVAILABLE');
    expect(report.plainEnglishSummary.trim().length).toBeGreaterThan(0);
    expect(report.enablementHint).toContain('chrome://flags/#prompt-api-for-gemini-nano');
    expect(report.enablementHint).toContain('chrome://flags/#optimization-guide-on-device-model');
  });

  it('returns UNAVAILABLE when the browser API rejects', async () => {
    (globalThis as Record<string, unknown>).LanguageModel = {
      availability: vi.fn().mockRejectedValue(new Error('Hardware unsupported')),
    };

    const report = await detectOnDeviceGeminiNano();

    expect(report.status).toBe('UNAVAILABLE');
    expect(report.enablementHint).toContain('chrome://flags/#prompt-api-for-gemini-nano');
  });

  it('times out after 1500ms and returns UNAVAILABLE when the probe hangs', async () => {
    vi.useFakeTimers();
    (globalThis as Record<string, unknown>).LanguageModel = {
      availability: vi.fn(() => new Promise<string>(() => {})),
    };

    const reportPromise = detectOnDeviceGeminiNano();
    await vi.advanceTimersByTimeAsync(1500);
    const report = await reportPromise;

    expect(report.status).toBe('UNAVAILABLE');
    expect(report.enablementHint).toContain('chrome://flags/#prompt-api-for-gemini-nano');
  });
});
