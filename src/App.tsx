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
import { runPrismPipeline, computeTopologyHash, cleanMarkdownFences } from './lib/prism/engine';
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
import { SafeExportModal } from './components/SafeExportModal';
import { HistoryTimelineDrawer } from './components/HistoryTimelineDrawer';
import { InteractiveTutorialOverlay } from './components/InteractiveTutorialOverlay';
import { ExecutionToast, deriveExecutionMode } from './components/ExecutionStatusBanner';
import {
  hasCompletedTutorial,
  markTutorialCompleted,
} from './lib/prism/tutorialSteps';
import {
  MobileBlueprintDrawer,
  type CachedBlueprintRecord,
} from './components/MobileBlueprintDrawer';
import type { VaultSession, VaultFolder, MetricDelta, DiffTopology } from './types/longitudinal';
import type { BenchmarkTopology, BenchmarkFinding } from './types/benchmark';
import {
  saveVaultSession,
  listVaultSessions,
  deleteVaultSession,
  clearVaultSessions,
  createVaultFolder,
  listVaultFolders,
  renameVaultFolder,
  deleteVaultFolder,
  moveSessionToFolder,
} from './lib/storage/localHistoryVault';
import {
  extractMetricsFromReport,
  computeMetricDeltas,
  buildAnonymizedDiffTopology,
} from './lib/prism/diffEngine';

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
  const [isSafeExportOpen, setIsSafeExportOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = React.useState<boolean>(() => !hasCompletedTutorial());
  const [cachedBlueprints, setCachedBlueprints] = React.useState<CachedBlueprintRecord[]>([]);
  const [vaultSessions, setVaultSessions] = React.useState<VaultSession[]>([]);
  const [vaultFolders, setVaultFolders] = React.useState<VaultFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [lastSavedSessionId, setLastSavedSessionId] = React.useState<string | null>(null);
  const [metricDeltas, setMetricDeltas] = React.useState<MetricDelta[]>([]);
  const [comparedSession, setComparedSession] = React.useState<VaultSession | null>(null);
  const [comparisonLabel, setComparisonLabel] = React.useState<string | null>(null);
  const [activeDiffTopology, setActiveDiffTopology] = React.useState<DiffTopology | null>(null);
  const [benchmarkSourceTitle, setBenchmarkSourceTitle] = React.useState<string>('');
  const [benchmarkReferenceText, setBenchmarkReferenceText] = React.useState<string>('');
  const [benchmarkTopology, setBenchmarkTopology] = React.useState<BenchmarkTopology | null>(null);
  const [benchmarkFindings, setBenchmarkFindings] = React.useState<BenchmarkFinding[]>([]);
  const [toastState, setToastState] = React.useState<{
    message: string;
    dotColor?: string;
    showReceiptLink?: boolean;
  } | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (
    msg: string,
    opts?: { dotColor?: string; showReceiptLink?: boolean; durationMs?: number }
  ) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastState({
      message: msg,
      dotColor: opts?.dotColor,
      showReceiptLink: opts?.showReceiptLink,
    });
    toastTimerRef.current = setTimeout(() => setToastState(null), opts?.durationMs ?? 3500);
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

    // 1b. Load locally persisted IndexedDB longitudinal sessions & folders
    listVaultSessions()
      .then((sessions) => setVaultSessions(sessions))
      .catch(() => {});
    listVaultFolders()
      .then((folders) => setVaultFolders(folders))
      .catch(() => {});

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
    setMetricDeltas([]);
    setComparedSession(null);
    setComparisonLabel(null);
    setActiveDiffTopology(null);
    setLastSavedSessionId(null);
    setBenchmarkSourceTitle('');
    setBenchmarkReferenceText('');
    setBenchmarkTopology(null);
    setBenchmarkFindings([]);
    setIsPrivacyReceiptOpen(false);
    showToast('Workspace reset. Saved History & Trends preserved on-device.');
  };

  const handleLoadDemoSample = () => {
    const demoContent = [
      'Quarterly Operations & Resource Summary (Synthetic Sample)',
      'Monthly Operating Outflow: $48,000',
      'Available Liquidity Reserve: $576,000 (12.0 months coverage)',
      'Underutilized Compute Capacity: 28%',
      'Primary Review Item: Vendor SLA renewal window closes in 30 days',
    ].join('\n');
    const demoFile: ScenarioFile = {
      id: `demo_${Date.now()}`,
      name: 'Sample_Operations_Brief.txt',
      description: 'Neutral synthetic walkthrough sample',
      category: 'finance',
      content: demoContent,
    };
    setFiles([demoFile]);
    setActiveFileId(demoFile.id);
    setPrompt('Summarize key metrics, identify operational risks, and recommend prioritized next steps.');
    showToast('Loaded neutral demo brief locally. Click "Analyze Privately" to test.');
  };

  // ─── Execute PRISM Pipeline ───────────────────────────────────────────
  const executePipeline = async (
    overrideDevice?: DeviceContext,
    overridePrompt?: string,
    overrideDiffTopology?: DiffTopology | null
  ) => {
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
        diffTopology: overrideDiffTopology !== undefined ? overrideDiffTopology : activeDiffTopology,
        referenceText: benchmarkReferenceText,
        referenceSourceTitle: benchmarkSourceTitle,
        onStageProgress: (stageIndex) => setActiveStageIndex(stageIndex),
      });

      const cleanReport = cleanMarkdownFences(result.hydratedReport);
      setTopology(result.topology);
      setBlueprint(result.blueprint);
      setHydratedReport(cleanReport);
      setTelemetry(result.telemetry);
      setBenchmarkTopology(result.benchmarkTopology ?? null);
      setBenchmarkFindings(result.benchmarkFindings ?? []);

      // Auto-save completed run to local IndexedDB Vault
      const extractedMetrics = extractMetricsFromReport(cleanReport, combinedRawContent);
      const inferredDomain =
        result.topology.entities[0]?.type?.replace(/_/g, ' ') ||
        validFiles[0]?.category ||
        'general';
      const newSession: VaultSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        title: validFiles[0]?.name || activePrompt.slice(0, 48),
        domainTag: inferredDomain,
        folderId: selectedFolderId,
        metrics: extractedMetrics,
        rawSnippet: combinedRawContent.slice(0, 180),
        hydratedReport: cleanReport,
      };
      setLastSavedSessionId(newSession.id);
      void saveVaultSession(newSession)
        .then(() => listVaultSessions())
        .then((updated) => setVaultSessions(updated))
        .catch(() => {});

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

      const execMode = deriveExecutionMode(result.telemetry);
      if (execMode) {
        showToast(execMode.toastMessage, {
          dotColor: execMode.dotColor,
          showReceiptLink: true,
          durationMs: 5000,
        });
      } else {
        showToast(`PRISM Pipeline Complete — 0 raw bytes sent to cloud.`, {
          showReceiptLink: true,
          durationMs: 5000,
        });
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

  // ─── Longitudinal History, Folders & Comparison Handlers ──────────────
  const handleCreateFolder = async (name: string, color?: string) => {
    const folder = await createVaultFolder(name, color);
    const updated = await listVaultFolders();
    setVaultFolders(updated);
    showToast(`Created folder "${folder.name}"`);
  };

  const handleRenameFolder = async (id: string, name: string) => {
    await renameVaultFolder(id, name);
    const updated = await listVaultFolders();
    setVaultFolders(updated);
  };

  const handleDeleteFolder = async (id: string) => {
    await deleteVaultFolder(id);
    const [updatedFolders, updatedSessions] = await Promise.all([
      listVaultFolders(),
      listVaultSessions(),
    ]);
    setVaultFolders(updatedFolders);
    setVaultSessions(updatedSessions);
    if (selectedFolderId === id) {
      setSelectedFolderId(null);
    }
    showToast('Deleted folder (saved runs moved to Unfiled)');
  };

  const handleMoveSessionToFolder = async (sessionId: string, folderId: string | null) => {
    await moveSessionToFolder(sessionId, folderId);
    const updated = await listVaultSessions();
    setVaultSessions(updated);
    if (lastSavedSessionId === sessionId) {
      setSelectedFolderId(folderId);
    }
  };

  const handleAssignCurrentSessionFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    if (lastSavedSessionId) {
      void handleMoveSessionToFolder(lastSavedSessionId, folderId).then(() => {
        const folderName = vaultFolders.find((f) => f.id === folderId)?.name || 'Unfiled';
        showToast(`Saved run to "${folderName}"`);
      });
    }
  };

  const handleDeleteVaultSession = (id: string) => {
    void deleteVaultSession(id)
      .then(() => listVaultSessions())
      .then((updated) => setVaultSessions(updated))
      .catch(() => {});
    if (comparedSession?.id === id) {
      setComparedSession(null);
      setComparisonLabel(null);
      setMetricDeltas([]);
      setActiveDiffTopology(null);
    }
    if (lastSavedSessionId === id) {
      setLastSavedSessionId(null);
    }
  };

  const handleClearAllVault = () => {
    void clearVaultSessions()
      .then(() => setVaultSessions([]))
      .catch(() => {});
    setComparedSession(null);
    setComparisonLabel(null);
    setMetricDeltas([]);
    setActiveDiffTopology(null);
    setLastSavedSessionId(null);
    showToast('Cleared all local IndexedDB history');
  };

  const handleCompareRuns = async (baselineSession: VaultSession, targetSession: VaultSession) => {
    const deltas = computeMetricDeltas(baselineSession.metrics, targetSession.metrics);
    const diffTopo = buildAnonymizedDiffTopology(
      deltas,
      `Comparing ${baselineSession.timestamp.slice(0, 10)} vs ${targetSession.timestamp.slice(0, 10)}`
    );

    setComparedSession(targetSession);
    setComparisonLabel(`${baselineSession.title} → ${targetSession.title}`);
    setMetricDeltas(deltas);
    setActiveDiffTopology(diffTopo);
    setIsHistoryOpen(false);

    if (deltas.length > 0 && prompt.trim()) {
      showToast(`Computed ${deltas.length} metric delta(s) (${baselineSession.title} → ${targetSession.title}). Adapting blueprint...`);
      await executePipeline(undefined, undefined, diffTopo);
    } else {
      showToast(`Compared "${baselineSession.title}" → "${targetSession.title}" (${deltas.length} delta${deltas.length === 1 ? '' : 's'})`);
    }
  };

  const handleCompareWithCurrent = async (pastSession: VaultSession) => {
    const combinedRawContent = files
      .filter((f) => f.content && f.content.trim().length > 0)
      .map((f) => (files.length > 1 ? `=== FILE: ${f.name} ===\n${f.content.trim()}` : f.content.trim()))
      .join('\n\n');

    const currentMetrics = extractMetricsFromReport(hydratedReport, combinedRawContent);
    const deltas = computeMetricDeltas(pastSession.metrics, currentMetrics);
    const diffTopo = buildAnonymizedDiffTopology(
      deltas,
      `Comparing ${pastSession.timestamp.slice(0, 10)} vs current`
    );

    setComparedSession(pastSession);
    setComparisonLabel(pastSession.title);
    setMetricDeltas(deltas);
    setActiveDiffTopology(diffTopo);
    setIsHistoryOpen(false);

    if (deltas.length > 0 && prompt.trim()) {
      showToast(`Computed ${deltas.length} longitudinal metric delta(s). Adapting blueprint...`);
      await executePipeline(undefined, undefined, diffTopo);
    } else {
      showToast(`Compared against "${pastSession.title}"`);
    }
  };

  const hasActiveSession = files.length > 0 || prompt.length > 0 || Boolean(topology || blueprint);

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#18181B] flex flex-col font-sans selection:bg-[#ECFDF5] selection:text-[#15803D] pb-28 sm:pb-36">
      {/* Dismissible Execution Status Toast */}
      <ExecutionToast
        message={toastState?.message || null}
        dotColor={toastState?.dotColor}
        showReceiptLink={toastState?.showReceiptLink}
        onViewReceipt={() => setIsPrivacyReceiptOpen(true)}
        onDismiss={() => setToastState(null)}
      />

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
        onOpenSafeExport={() => setIsSafeExportOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        historyCount={vaultSessions.length}
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
        onOpenSafeExport={() => setIsSafeExportOpen(true)}
        metricDeltas={metricDeltas}
        comparedSessionTitle={comparisonLabel || comparedSession?.title || null}
        onClearComparison={() => {
          setComparedSession(null);
          setComparisonLabel(null);
          setMetricDeltas([]);
          setActiveDiffTopology(null);
        }}
        onReplanWithTrend={() => executePipeline(undefined, undefined, activeDiffTopology)}
        folders={vaultFolders}
        activeSessionFolderId={selectedFolderId}
        onAssignSessionFolder={handleAssignCurrentSessionFolder}
        benchmarkSourceTitle={benchmarkSourceTitle}
        onChangeBenchmarkSourceTitle={setBenchmarkSourceTitle}
        benchmarkReferenceText={benchmarkReferenceText}
        onChangeBenchmarkReferenceText={setBenchmarkReferenceText}
        benchmarkFindings={benchmarkFindings}
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
        benchmarkTopology={benchmarkTopology}
      />

      {/* Dual-Mode Safe-to-Export & Share Modal */}
      <SafeExportModal
        isOpen={isSafeExportOpen}
        onClose={() => setIsSafeExportOpen(false)}
        rawContent={files
          .map((f) => (files.length > 1 ? `=== FILE: ${f.name} ===\n${f.content.trim()}` : f.content.trim()))
          .join('\n\n')}
        hydratedReport={hydratedReport}
        topology={topology}
        documentTitle={files[0]?.name || 'prism-document'}
        benchmarkFindings={benchmarkFindings}
        metricDeltas={metricDeltas}
      />

      {/* Local Longitudinal History & Trends Drawer */}
      <HistoryTimelineDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={vaultSessions}
        folders={vaultFolders}
        onDeleteSession={handleDeleteVaultSession}
        onClearAll={handleClearAllVault}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onMoveSessionToFolder={handleMoveSessionToFolder}
        onCompareRuns={handleCompareRuns}
        onCompareWithCurrent={handleCompareWithCurrent}
        canCompare={Boolean(hydratedReport || files.some((f) => f.content.trim().length > 0))}
        activeComparedSessionId={comparedSession?.id || null}
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

      {/* Interactive Guided Tutorial Overlay */}
      <InteractiveTutorialOverlay
        isOpen={isTutorialOpen}
        onClose={() => {
          markTutorialCompleted();
          setIsTutorialOpen(false);
        }}
        onComplete={() => {
          markTutorialCompleted();
          setIsTutorialOpen(false);
        }}
        onLoadDemoSample={handleLoadDemoSample}
      />
    </div>
  );
};

export default App;
