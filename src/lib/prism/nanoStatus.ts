import type { NanoAvailability } from '../../types/prism';

interface ChromeLanguageModelFactory {
  availability?: () => Promise<'readily' | 'after-download' | 'no'>;
  capabilities?: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>;
  create?: (options?: {
    monitor?: (monitor: {
      addEventListener: (
        event: 'downloadprogress',
        listener: (e: { loaded: number; total: number }) => void
      ) => void;
    }) => void;
  }) => Promise<unknown>;
}

interface WindowWithAI {
  ai?: {
    languageModel?: ChromeLanguageModelFactory;
  };
  LanguageModel?: ChromeLanguageModelFactory;
}

/**
 * Checks whether Chrome Built-in AI (Gemini Nano) is available, downloading, or unavailable.
 */
export async function checkNanoAvailability(): Promise<NanoAvailability> {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      status: 'unavailable',
      downloadProgress: 0,
      error: 'Not running in browser environment',
    };
  }

  const win = window as unknown as WindowWithAI;
  const lm = win.ai?.languageModel || win.LanguageModel;

  if (!lm) {
    return {
      supported: false,
      status: 'unavailable',
      downloadProgress: 0,
      error: 'Chrome Built-in AI (Gemini Nano) is not supported on this browser',
    };
  }

  try {
    let rawStatus: 'readily' | 'after-download' | 'no' = 'no';

    if (typeof lm.availability === 'function') {
      rawStatus = await lm.availability();
    } else if (typeof lm.capabilities === 'function') {
      const caps = await lm.capabilities();
      rawStatus = caps.available;
    }

    if (rawStatus === 'readily') {
      return {
        supported: true,
        status: 'available',
        downloadProgress: 1.0,
      };
    } else if (rawStatus === 'after-download') {
      return {
        supported: true,
        status: 'downloading',
        downloadProgress: 0.1,
      };
    } else {
      return {
        supported: false,
        status: 'unavailable',
        downloadProgress: 0,
        error: 'Gemini Nano is not available on this device',
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      supported: false,
      status: 'error',
      downloadProgress: 0,
      error: message,
    };
  }
}

/**
 * Continuously monitors Gemini Nano download progress or availability changes.
 * Returns an unsubscribe teardown function.
 */
export function monitorNanoDownload(
  onProgress: (status: NanoAvailability) => void
): () => void {
  let isSubscribed = true;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Immediate initial check
  checkNanoAvailability().then((initial) => {
    if (!isSubscribed) return;
    onProgress(initial);

    // If downloading, begin polling or listening to model download progress
    if (initial.status === 'downloading') {
      const win = typeof window !== 'undefined' ? (window as unknown as WindowWithAI) : null;
      const lm = win?.ai?.languageModel || win?.LanguageModel;

      if (lm?.create) {
        try {
          lm.create({
            monitor(m) {
              m.addEventListener('downloadprogress', (e) => {
                if (!isSubscribed) return;
                const progress = e.total > 0 ? e.loaded / e.total : 0.5;
                onProgress({
                  supported: true,
                  status: progress >= 1 ? 'available' : 'downloading',
                  downloadProgress: Math.min(1, Math.max(0, progress)),
                });
              });
            },
          }).catch(() => {
            // Creation error handled by polling fallback
          });
        } catch {
          // Monitor API unsupported fallback
        }
      }

      // Interval fallback to poll status changes
      intervalId = setInterval(async () => {
        if (!isSubscribed) return;
        const current = await checkNanoAvailability();
        onProgress(current);
        if (current.status === 'available' || current.status === 'unavailable' || current.status === 'error') {
          if (intervalId) clearInterval(intervalId);
        }
      }, 3000);
    }
  });

  return () => {
    isSubscribed = false;
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}
