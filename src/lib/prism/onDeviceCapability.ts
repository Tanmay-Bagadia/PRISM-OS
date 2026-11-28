export type OnDeviceCapabilityStatus = 'AVAILABLE' | 'DOWNLOADABLE' | 'UNAVAILABLE';

export interface OnDeviceCapabilityReport {
  status: OnDeviceCapabilityStatus;
  engineLabel: string;
  plainEnglishSummary: string;
  enablementHint: string;
}

interface GlobalLanguageModel {
  availability?: () => Promise<string>;
}

interface GlobalWithPromptAI {
  LanguageModel?: GlobalLanguageModel;
  ai?: {
    languageModel?: {
      capabilities?: () => Promise<{ available?: string }>;
    };
  };
}

const PROBE_TIMEOUT_MS = 1500;
const ENABLEMENT_HINT =
  'In Chrome, open chrome://flags/#prompt-api-for-gemini-nano and chrome://flags/#optimization-guide-on-device-model, enable both, and relaunch.';

function buildReport(status: OnDeviceCapabilityStatus): OnDeviceCapabilityReport {
  if (status === 'AVAILABLE') {
    return {
      status,
      engineLabel: 'Gemini Nano (On-Device)',
      plainEnglishSummary:
        'Built-in browser AI is ready on this device. Private notes can be processed locally without leaving your computer.',
      enablementHint: '',
    };
  }

  if (status === 'DOWNLOADABLE') {
    return {
      status,
      engineLabel: 'Gemini Nano (Downloadable)',
      plainEnglishSummary:
        'Your browser supports built-in on-device AI, and the local model can be downloaded when needed.',
      enablementHint: ENABLEMENT_HINT,
    };
  }

  return {
    status: 'UNAVAILABLE',
    engineLabel: 'Local Deterministic Fallback',
    plainEnglishSummary:
      'Built-in browser AI is not active here. Local privacy checks still run on your device using built-in rules.',
    enablementHint: ENABLEMENT_HINT,
  };
}

function mapRawStatus(raw: string | undefined): OnDeviceCapabilityStatus {
  if (raw === 'available' || raw === 'readily') {
    return 'AVAILABLE';
  }
  if (raw === 'downloadable' || raw === 'downloading' || raw === 'after-download') {
    return 'DOWNLOADABLE';
  }
  return 'UNAVAILABLE';
}

async function probeAvailability(): Promise<OnDeviceCapabilityStatus> {
  const scope = globalThis as unknown as GlobalWithPromptAI;

  if (typeof scope.LanguageModel?.availability === 'function') {
    const raw = await scope.LanguageModel.availability();
    return mapRawStatus(raw);
  }

  if (typeof scope.ai?.languageModel?.capabilities === 'function') {
    const caps = await scope.ai.languageModel.capabilities();
    return mapRawStatus(caps?.available);
  }

  return 'UNAVAILABLE';
}

/**
 * Safely detects Chrome Built-in AI (Gemini Nano) availability with a 1500ms timeout
 * so callers in Node, Vitest, Safari, or Firefox never block or throw.
 */
export async function detectOnDeviceGeminiNano(): Promise<OnDeviceCapabilityReport> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<OnDeviceCapabilityStatus>((resolve) => {
      timerId = setTimeout(() => resolve('UNAVAILABLE'), PROBE_TIMEOUT_MS);
    });

    const status = await Promise.race([probeAvailability(), timeoutPromise]);
    return buildReport(status);
  } catch {
    return buildReport('UNAVAILABLE');
  } finally {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
  }
}
