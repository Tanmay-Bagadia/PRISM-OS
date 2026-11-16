import React from 'react';
import type {
  CognitivePosture,
  DeviceContext,
  RemoteThresholds,
  AbstractTopology,
  ReasoningBlueprint,
  ScenarioFile,
  StageTelemetry,
  NanoAvailability,
} from './types/prism';
import { runPrismPipeline, computeTopologyHash } from './lib/prism/engine';
import { checkNanoAvailability, monitorNanoDownload } from './lib/prism/nanoStatus';
import {
  initializeFirebase,
  getFirebaseFirestore,
  getRemoteConfigThresholds,
} from './lib/firebase/client';
import { collection, getDocs } from 'firebase/firestore';
import { TelemetryBar } from './components/TelemetryBar';
import { RelayWorkspace } from './components/RelayWorkspace';
import { PrivacyReceiptDrawer } from './components/PrivacyReceiptDrawer';
import {
  MobileBlueprintDrawer,
  type CachedBlueprintRecord,
} from './components/MobileBlueprintDrawer';

export const App: React.FC = () => {
  // ─── Firebase & Nano Initialization State ─────────────────────────────
  const [isFirebaseReady, setIsFirebaseReady] = React.useState(false);
  const [nanoStatus, setNanoStatus] = React.useState<NanoAvailability>({
    supported: false,
    status: 'unavailable',
    downloadProgress: 0,
  });

  // ─── Device & Routing Context ─────────────────────────────────────────
  const [device, setDevice] = React.useState<DeviceContext>(() => {
    const navConn = typeof navigator !== 'undefined'
      ? (navigator as unknown as { connection?: { rtt?: number } }).connection
      : undefined;
    return {
      batteryLevel: 1.0,
      networkRttMs: typeof navConn?.rtt === 'number' && navConn.rtt > 0 ? navConn.rtt : 45,
      nanoAvailable: false,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  });

  const [thresholds, setThresholds] = React.useState<RemoteThresholds>(() => getRemoteConfigThresholds());

  // ─── Clean User-Driven Workspace State (Zero Pre-Loaded Data) ──────────
  const [files, setFiles] = React.useState<ScenarioFile[]>([]);
  const [activeFileId, setActiveFileId] = React.useState<string>('');
  // Default to Local Only (vault) per reference UI
  const [posture, setPosture] = React.useState<CognitivePosture>('vault');
  const [prompt, setPrompt] = React.useState<string>('');

  // ─── Pipeline Execution & Output State ────────────────────────────────
  const [isRunning, setIsRunning] = React.useState(false);
  const [activeStageIndex, setActiveStageIndex] = React.useState<number>(0);
  const [topology, setTopology] = React.useState<AbstractTopology | null>(null);
  const [blueprint, setBlueprint] = React.useState<ReasoningBlueprint | null>(null);
  const [hydratedReport, setHydratedReport] = React.useState<string>('');
  const [telemetry, setTelemetry] = React.useState<StageTelemetry[] | null>(null);

  // ─── Privacy Receipt & Blueprint Drawers State ─────────────────────────
  const [isPrivacyReceiptOpen, setIsPrivacyReceiptOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [cachedBlueprints, setCachedBlueprints] = React.useState<CachedBlueprintRecord[]>([]);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─── Lifecycle: Firebase Init & Nano Monitoring ───────────────────────
  React.useEffect(() => {
    // 1. Initialize Firebase services & fetch Remote Config thresholds
    initializeFirebase()
      .then(() => {
        setIsFirebaseReady(true);
        setThresholds(getRemoteConfigThresholds());
        refreshBlueprintsFromFirestore();
      })
      .catch((err) => {
        console.warn('[PRISM-OS] Firebase initialization deferred:', err);
      });

    // 2. Initial check & subscribe to Chrome Gemini Nano 4 availability & progress
    checkNanoAvailability().then((initial) => {
      setNanoStatus(initial);
      setDevice((prev) => ({
        ...prev,
        nanoAvailable: initial.status === 'available',
      }));
    });

    const unsubscribeNano = monitorNanoDownload((status) => {
      setNanoStatus(status);
      setDevice((prev) => ({
        ...prev,
        nanoAvailable: status.status === 'available',
      }));
    });

    // 3. Detect live browser online & battery if supported
    if (typeof navigator !== 'undefined') {
      const handleOnline = () => setDevice((prev) => ({ ...prev, online: true }));
      const handleOffline = () => setDevice((prev) => ({ ...prev, online: false }));
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Network Information API for live RTT telemetry if supported
      const navWithConn = navigator as unknown as {
        connection?: {
          rtt?: number;
          addEventListener?: (evt: string, fn: () => void) => void;
          removeEventListener?: (evt: string, fn: () => void) => void;
        };
      };
      const handleConnChange = () => {
        if (typeof navWithConn.connection?.rtt === 'number' && navWithConn.connection.rtt > 0) {
          setDevice((prev) => ({ ...prev, networkRttMs: navWithConn.connection!.rtt! }));
        }
      };
      if (navWithConn.connection?.addEventListener) {
        navWithConn.connection.addEventListener('change', handleConnChange);
      }

      // Battery API if supported
      const navWithBattery = navigator as unknown as {
        getBattery?: () => Promise<{
          level: number;
          addEventListener: (evt: string, fn: () => void) => void;
        }>;
      };
      if (navWithBattery.getBattery) {
        navWithBattery
          .getBattery()
          .then((battery) => {
            setDevice((prev) => ({ ...prev, batteryLevel: battery.level }));
            battery.addEventListener('levelchange', () => {
              setDevice((prev) => ({ ...prev, batteryLevel: battery.level }));
            });
          })
          .catch(() => {});
      }

      return () => {
        unsubscribeNano();
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (navWithConn.connection?.removeEventListener) {
          navWithConn.connection.removeEventListener('change', handleConnChange);
        }
      };
    }

    return () => {
      unsubscribeNano();
    };
  }, []);

  // ─── Fetch Firestore Blueprints Cache ─────────────────────────────────
  const refreshBlueprintsFromFirestore = async () => {
    try {
      const db = getFirebaseFirestore();
      const snap = await getDocs(collection(db, 'blueprints'));
      const records: CachedBlueprintRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.schema === 'prism-blueprint-v1' && Array.isArray(data.steps)) {
          records.push({
            topologyHash: docSnap.id,
            blueprint: data as ReasoningBlueprint,
            cachedAt: (data.cachedAt as number) || Date.now(),
          });
        }
      });
      if (records.length > 0) {
        setCachedBlueprints(records);
      }
    } catch {
      // Offline fallback: keep in-memory records
    }
  };

  // ─── File Management ──────────────────────────────────────────────────
  const handleUpdateFileContent = (fileId: string, newContent: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content: newContent } : f))
    );
  };

  const handleAddCustomFile = (newFile: ScenarioFile) => {
    setFiles((prev) => {
      // Replace if file with same name exists, otherwise prepend
      const existingIdx = prev.findIndex((f) => f.name === newFile.name);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newFile;
        return copy;
      }
      return [newFile, ...prev];
    });
    setActiveFileId(newFile.id);
    showToast(`Loaded "${newFile.name}" into local memory`);
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => {
      const remaining = prev.filter((f) => f.id !== fileId);
      if (activeFileId === fileId) {
        setActiveFileId(remaining[0]?.id || '');
      }
      return remaining;
    });
    showToast('File removed from local memory');
  };

  // ─── Clear Workspace / New Session ────────────────────────────────────
  const handleClearSession = () => {
    setFiles([]);
    setActiveFileId('');
    setPrompt('');
    setTopology(null);
    setBlueprint(null);
    setHydratedReport('');
    setTelemetry(null);
    setIsPrivacyReceiptOpen(false);
    showToast('Workspace reset. New private session started.');
  };

  // ─── Execute PRISM Pipeline ───────────────────────────────────────────
  const executePipeline = async (overrideDevice?: DeviceContext, overridePrompt?: string) => {
    // Combine all attached files into one comprehensive raw content context
    const validFiles = files.filter((f) => f.content && f.content.trim().length > 0);
    const combinedRawContent = validFiles
      .map((f) => (validFiles.length > 1 ? `=== FILE: ${f.name} ===\n${f.content.trim()}` : f.content.trim()))
      .join('\n\n');

    if (!combinedRawContent) {
      showToast('Please attach at least one file or paste raw notes before analyzing.');
      return;
    }

    const activePrompt = (overridePrompt || prompt).trim();
    if (!activePrompt) {
      showToast('Please type a question or select a goal for PRISM.');
      return;
    }

    setIsRunning(true);
    setActiveStageIndex(0);

    const activeDevice = overrideDevice || device;

    if (overridePrompt) {
      setPrompt(overridePrompt);
    }

    try {
      const result = await runPrismPipeline({
        rawContent: combinedRawContent,
        prompt: activePrompt,
        posture,
        device: activeDevice,
        thresholds,
        onStageProgress: (stageIndex) => setActiveStageIndex(stageIndex),
      });

      setTopology(result.topology);
      setBlueprint(result.blueprint);
      setHydratedReport(result.hydratedReport);
      setTelemetry(result.telemetry);

      // Record to local blueprint cache list
      const hash = await computeTopologyHash(result.topology);
      setCachedBlueprints((prev) => {
        if (prev.some((p) => p.topologyHash === hash)) return prev;
        return [
          {
            topologyHash: hash,
            blueprint: result.blueprint,
            cachedAt: Date.now(),
          },
          ...prev,
        ];
      });

      const stage2 = result.telemetry[1];
      if (stage2.cacheStatus === 'hit') {
        showToast(`⚡ Stage 2 Firestore Offline Cache HIT: ${stage2.latencyMs}ms!`);
      } else {
        showToast(`✨ PRISM Pipeline Complete — 0 raw bytes sent to cloud!`);
      }
    } catch (err: unknown) {
      console.error('Pipeline execution error:', err);
      showToast('Error executing pipeline. Scrubber fallback engaged.');
    } finally {
      setIsRunning(false);
      setActiveStageIndex(2);
    }
  };

  // ─── Follow-Up in Offline Mode (Demonstrating 63ms Cache Hit) ──────────
  const handleFollowUpOffline = async (customPrompt?: string) => {
    const offlineDevice: DeviceContext = {
      ...device,
      online: false,
    };
    setDevice(offlineDevice);
    showToast('Air-gap engaged (online: false). Re-executing against Firestore SHA-256 cache...');
    await executePipeline(offlineDevice, customPrompt);
  };

  const hasActiveSession = files.length > 0 || prompt.length > 0 || Boolean(topology || blueprint);

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#18181B] flex flex-col font-sans selection:bg-[#ECFDF5] selection:text-[#15803D] pb-28 sm:pb-36">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-white border border-[#E6E5E0] text-xs font-medium text-[#18181B] shadow-[0_4px_12px_rgba(24,24,27,0.08)] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-[#15803D] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar: Clean Logo + Status on Left, Offline + Receipt on Right */}
      <TelemetryBar
        nanoStatus={nanoStatus}
        device={device}
        onUpdateDevice={(updated) => setDevice((prev) => ({ ...prev, ...updated }))}
        telemetry={telemetry}
        isRunning={isRunning}
        activeStageIndex={activeStageIndex}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        blueprintCount={cachedBlueprints.length}
        isFirebaseReady={isFirebaseReady}
        onOpenPrivacyReceipt={() => setIsPrivacyReceiptOpen(true)}
        onToggleOffline={() => {
          const newOnline = !device.online;
          setDevice((prev) => ({ ...prev, online: newOnline }));
          showToast(newOnline ? 'Connected to Network' : 'Air-Gap Offline Engaged (Local Cache Only)');
        }}
        onClearSession={handleClearSession}
        hasActiveSession={hasActiveSession}
      />

      {/* Main Viewport Workspace */}
      <RelayWorkspace
        files={files}
        activeFileId={activeFileId}
        onSelectFile={setActiveFileId}
        onUpdateFileContent={handleUpdateFileContent}
        onAddCustomFile={handleAddCustomFile}
        onRemoveFile={handleRemoveFile}
        posture={posture}
        onChangePosture={setPosture}
        prompt={prompt}
        onChangePrompt={setPrompt}
        onRunPipeline={() => executePipeline()}
        isRunning={isRunning}
        activeStageIndex={activeStageIndex}
        topology={topology}
        blueprint={blueprint}
        hydratedReport={hydratedReport}
        telemetry={telemetry}
        onFollowUpOffline={handleFollowUpOffline}
        isOfflineMode={!device.online}
        onToggleOffline={() => {
          const newOnline = !device.online;
          setDevice((prev) => ({ ...prev, online: newOnline }));
          showToast(newOnline ? 'Connected to Network' : 'Air-Gap Offline Engaged (Local Cache Only)');
        }}
      />

      {/* Slide-Over "Privacy Receipt" Drawer */}
      <PrivacyReceiptDrawer
        isOpen={isPrivacyReceiptOpen}
        onClose={() => setIsPrivacyReceiptOpen(false)}
        topology={topology}
        blueprint={blueprint}
        telemetry={telemetry}
        activeFileNames={files.map((f) => f.name)}
      />

      {/* Mobile / Companion Blueprint Drawer */}
      <MobileBlueprintDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        cachedBlueprints={cachedBlueprints}
        onSelectBlueprint={(bp) => {
          setBlueprint(bp);
          showToast(`Loaded Blueprint: "${bp.goal.slice(0, 30)}..."`);
        }}
        onRefreshFromFirestore={refreshBlueprintsFromFirestore}
      />
    </div>
  );
};

export default App;
