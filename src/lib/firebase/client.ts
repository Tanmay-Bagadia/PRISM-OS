import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getAI,
  GoogleAIBackend,
  type AI,
} from 'firebase/ai';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  type Auth,
} from 'firebase/auth';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  CustomProvider,
  type AppCheck,
} from 'firebase/app-check';
import {
  getRemoteConfig,
  fetchAndActivate,
  type RemoteConfig,
} from 'firebase/remote-config';

// Firebase configuration strictly from Vite environment variables (zero hardcoded secrets)
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Singletons
let appInstance: FirebaseApp | null = null;
let aiInstance: AI | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let remoteConfigInstance: RemoteConfig | null = null;
let appCheckInstance: AppCheck | null = null;

/**
 * Returns the initialized FirebaseApp singleton
 */
export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      appInstance = existingApps[0]!;
    } else {
      appInstance = initializeApp(firebaseConfig);
    }
  }
  return appInstance;
}

/**
 * Returns the Firebase AI Logic SDK singleton (configured with GoogleAIBackend)
 */
export function getFirebaseAI(): AI {
  if (!aiInstance) {
    const app = getFirebaseApp();
    aiInstance = getAI(app, {
      backend: new GoogleAIBackend(),
    });
  }
  return aiInstance;
}

/**
 * Returns the Firebase Auth singleton
 */
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

/**
 * Returns the Cloud Firestore singleton configured with multi-tab offline persistence
 */
export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    try {
      firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // If already initialized or if IndexedDB isn't supported in test environment, use getFirestore
      firestoreInstance = getFirestore(app);
    }
  }
  return firestoreInstance;
}

/**
 * Returns the Remote Config singleton with default routing thresholds
 */
export function getFirebaseRemoteConfig(): RemoteConfig {
  if (!remoteConfigInstance) {
    const app = getFirebaseApp();
    remoteConfigInstance = getRemoteConfig(app);
    remoteConfigInstance.defaultConfig = {
      minBatteryForCloud: 0.2,
      maxRttForCloud: 2000,
      vaultForceLocal: true,
      frontierForceCloud: true,
    };
    remoteConfigInstance.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
  }
  return remoteConfigInstance;
}

/**
 * Initializes App Check for production security or developer/judge debugging
 */
export function setupAppCheck(): AppCheck | null {
  if (appCheckInstance) return appCheckInstance;
  if (typeof window === 'undefined') return null;

  const app = getFirebaseApp();
  const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;

  if (debugToken) {
    // Enable debug token for local dev and judge environments
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      debugToken === 'true' ? true : debugToken;
  }

  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  try {
    if (recaptchaKey) {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else {
      // In test/dev environments without a reCAPTCHA key, provide a lightweight custom provider
      appCheckInstance = initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: () =>
            Promise.resolve({
              token: 'debug-token-prism-os',
              expireTimeMillis: Date.now() + 3600000,
            }),
        }),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch {
    // App check already initialized or not supported in this runtime
  }

  return appCheckInstance;
}

/**
 * Initializes all Firebase services, signs in anonymously for frictionless testing,
 * and fetches Remote Config parameters.
 */
export async function initializeFirebase(): Promise<{
  app: FirebaseApp;
  ai: AI;
  auth: Auth;
  db: Firestore;
  remoteConfig: RemoteConfig;
}> {
  const app = getFirebaseApp();
  const ai = getFirebaseAI();
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const remoteConfig = getFirebaseRemoteConfig();

  // Setup App Check
  setupAppCheck();

  // Frictionless anonymous sign-in for hackathon judges & tests
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (err) {
    // Non-blocking in offline/mock test modes
    console.warn('[PRISM-OS Firebase] Anonymous sign-in deferred:', err);
  }

  // Fetch Remote Config (non-blocking)
  try {
    await fetchAndActivate(remoteConfig);
  } catch {
    // Default configs will remain active if offline
  }

  return { app, ai, auth, db, remoteConfig };
}
