import React, { useEffect, useMemo, useState } from 'react';
import type { VaultFolder, VaultSession } from '../types/longitudinal';
import {
  History,
  X,
  Trash2,
  GitCompare,
  HardDrive,
  Clock,
  Check,
  Folder,
  FolderPlus,
  Pencil,
  ArrowLeftRight,
  ArrowRight,
  CheckSquare,
  Square,
} from 'lucide-react';

interface HistoryTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: VaultSession[];
  folders: VaultFolder[];
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  onCreateFolder: (name: string, color?: string) => void | Promise<void>;
  onRenameFolder: (id: string, name: string) => void | Promise<void>;
  onDeleteFolder: (id: string) => void | Promise<void>;
  onMoveSessionToFolder: (sessionId: string, folderId: string | null) => void | Promise<void>;
  onCompareRuns: (baselineSession: VaultSession, targetSession: VaultSession) => void;
  onCompareWithCurrent?: (session: VaultSession) => void;
  canCompare?: boolean;
  activeComparedSessionId?: string | null;
}

type FolderFilter = 'all' | 'unfiled' | string;

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const HistoryTimelineDrawer: React.FC<HistoryTimelineDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  folders,
  onDeleteSession,
  onClearAll,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveSessionToFolder,
  onCompareRuns,
  onCompareWithCurrent,
  canCompare = false,
  activeComparedSessionId = null,
}) => {
  const [activeFilter, setActiveFilter] = useState<FolderFilter>('all');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmClearAll(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset active filter if the selected folder no longer exists
  useEffect(() => {
    if (
      activeFilter !== 'all' &&
      activeFilter !== 'unfiled' &&
      !folders.some((f) => f.id === activeFilter)
    ) {
      setActiveFilter('all');
    }
  }, [activeFilter, folders]);

  // Prune any selected run IDs whose sessions were deleted
  const validSelectedIds = useMemo(
    () => selectedRunIds.filter((id) => sessions.some((s) => s.id === id)),
    [selectedRunIds, sessions]
  );

  const runA = useMemo(
    () => (validSelectedIds[0] ? sessions.find((s) => s.id === validSelectedIds[0]) ?? null : null),
    [validSelectedIds, sessions]
  );

  const runB = useMemo(
    () => (validSelectedIds[1] ? sessions.find((s) => s.id === validSelectedIds[1]) ?? null : null),
    [validSelectedIds, sessions]
  );

  const unfiledCount = useMemo(
    () => sessions.filter((s) => !s.folderId).length,
    [sessions]
  );

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (s.folderId) {
        counts.set(s.folderId, (counts.get(s.folderId) ?? 0) + 1);
      }
    }
    return counts;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (activeFilter === 'all') return sessions;
    if (activeFilter === 'unfiled') return sessions.filter((s) => !s.folderId);
    return sessions.filter((s) => s.folderId === activeFilter);
  }, [sessions, activeFilter]);

  const handleToggleSelectRun = (sessionId: string) => {
    setSelectedRunIds((prev) => {
      const valid = prev.filter((id) => sessions.some((s) => s.id === id));
      if (valid.includes(sessionId)) {
        return valid.filter((id) => id !== sessionId);
      }
      if (valid.length < 2) {
        return [...valid, sessionId];
      }
      // Replace the 2nd (Target) run when 2 are already selected
      const firstId = valid[0];
      return firstId ? [firstId, sessionId] : [sessionId];
    });
  };

  const handleSwapRuns = () => {
    const [firstId, secondId] = validSelectedIds;
    if (firstId && secondId) {
      setSelectedRunIds([secondId, firstId]);
    }
  };

  const handleClearSelection = () => {
    setSelectedRunIds([]);
  };

  const handleSaveNewFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    await onCreateFolder(trimmed);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleStartRename = (folder: VaultFolder) => {
    setRenamingFolderId(folder.id);
    setRenameFolderName(folder.name);
  };

  const handleSaveRename = async () => {
    if (!renamingFolderId) return;
    const trimmed = renameFolderName.trim();
    if (!trimmed) return;
    await onRenameFolder(renamingFolderId, trimmed);
    setRenamingFolderId(null);
    setRenameFolderName('');
  };

  const handleDeleteFolderClick = async (folderId: string) => {
    await onDeleteFolder(folderId);
    if (activeFilter === folderId) {
      setActiveFilter('all');
    }
    if (renamingFolderId === folderId) {
      setRenamingFolderId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Local History Timeline"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#18181B]/20 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Section */}
      <section className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-white border-l border-[#E6E5E0] shadow-[-8px_0_24px_0_rgba(24,24,27,0.06)] z-50 flex flex-col justify-between animate-in slide-in-from-right duration-300 ease-out">
        {/* Drawer Header */}
        <div className="p-5 pb-4 border-b border-[#F0EFEA] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F7F7F5] border border-[#E6E5E0] text-[#18181B] flex items-center justify-center">
                <History className="w-4 h-4 text-[#18181B]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#18181B]">History Timeline</h3>
                <p className="text-xs text-[#6B7280] tabular-nums">
                  {sessions.length} {sessions.length === 1 ? 'snapshot' : 'snapshots'} saved
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close history drawer"
              className="w-8 h-8 rounded-lg hover:bg-[#F4F4F5] text-[#6B7280] hover:text-[#18181B] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Local-Only Storage Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] font-medium text-[#15803D]">
            <HardDrive className="w-3.5 h-3.5 shrink-0" />
            <span>100% Stored Locally in IndexedDB • 0 Bytes Cloud</span>
          </div>

          {/* Folder Organizer Bar */}
          <div className="pt-1 space-y-2">
            <div className="flex items-center flex-wrap gap-1.5">
              {/* All Runs Pill */}
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[#18181B] text-white border-[#18181B]'
                    : 'bg-[#F7F7F5] text-[#4B5563] border-[#E6E5E0] hover:text-[#18181B] hover:border-[#D4D4D8]'
                }`}
              >
                <span>All Runs</span>
                <span
                  className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded ${
                    activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white text-[#6B7280]'
                  }`}
                >
                  {sessions.length}
                </span>
              </button>

              {/* Unfiled Pill */}
              <button
                type="button"
                onClick={() => setActiveFilter('unfiled')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  activeFilter === 'unfiled'
                    ? 'bg-[#18181B] text-white border-[#18181B]'
                    : 'bg-[#F7F7F5] text-[#4B5563] border-[#E6E5E0] hover:text-[#18181B] hover:border-[#D4D4D8]'
                }`}
              >
                <span>Unfiled</span>
                <span
                  className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded ${
                    activeFilter === 'unfiled' ? 'bg-white/20 text-white' : 'bg-white text-[#6B7280]'
                  }`}
                >
                  {unfiledCount}
                </span>
              </button>

              {/* User Folder Pills */}
              {folders.map((folder) => {
                const isActive = activeFilter === folder.id;
                const count = folderCounts.get(folder.id) ?? 0;

                if (renamingFolderId === folder.id) {
                  return (
                    <div
                      key={folder.id}
                      className="inline-flex items-center gap-1 bg-[#F7F7F5] border border-[#18181B] rounded-lg px-2 py-0.5"
                    >
                      <input
                        type="text"
                        value={renameFolderName}
                        onChange={(e) => setRenameFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleSaveRename();
                          } else if (e.key === 'Escape') {
                            e.stopPropagation();
                            setRenamingFolderId(null);
                          }
                        }}
                        aria-label="Rename folder"
                        autoFocus
                        className="w-24 bg-transparent text-xs text-[#18181B] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveRename()}
                        disabled={!renameFolderName.trim()}
                        aria-label="Save folder name"
                        className="p-0.5 text-[#15803D] hover:bg-[#ECFDF5] rounded disabled:opacity-40 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingFolderId(null)}
                        aria-label="Cancel rename"
                        className="p-0.5 text-[#6B7280] hover:text-[#18181B] rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={folder.id}
                    className={`inline-flex items-center rounded-lg border transition-colors ${
                      isActive
                        ? 'bg-[#18181B] text-white border-[#18181B]'
                        : 'bg-[#F7F7F5] text-[#4B5563] border-[#E6E5E0] hover:text-[#18181B] hover:border-[#D4D4D8]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFilter(folder.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium cursor-pointer"
                    >
                      <Folder className="w-3 h-3 shrink-0" />
                      <span className="max-w-[110px] truncate">{folder.name}</span>
                      <span
                        className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded ${
                          isActive ? 'bg-white/20 text-white' : 'bg-white text-[#6B7280]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>

                    {isActive && (
                      <div className="inline-flex items-center gap-0.5 pr-1.5 border-l border-white/20 pl-1">
                        <button
                          type="button"
                          onClick={() => handleStartRename(folder)}
                          aria-label={`Rename folder ${folder.name}`}
                          title="Rename folder"
                          className="p-0.5 rounded hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteFolderClick(folder.id)}
                          aria-label={`Delete folder ${folder.name}`}
                          title="Delete folder"
                          className="p-0.5 rounded hover:bg-white/15 text-white/80 hover:text-[#FCA5A5] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* + New Folder Toggle */}
              {!isCreatingFolder && (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-[#D4D4D8] text-[#4B5563] hover:text-[#18181B] hover:border-[#18181B] bg-white transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ New Folder</span>
                </button>
              )}
            </div>

            {/* Inline New Folder Input */}
            {isCreatingFolder && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[#F7F7F5] border border-[#E6E5E0]">
                <FolderPlus className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSaveNewFolder();
                    } else if (e.key === 'Escape') {
                      e.stopPropagation();
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  placeholder="New folder name..."
                  autoFocus
                  className="flex-1 min-w-0 bg-white border border-[#E6E5E0] rounded-md px-2 py-1 text-xs text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#18181B]"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveNewFolder()}
                  disabled={!newFolderName.trim()}
                  className="px-2.5 py-1 rounded-md bg-[#18181B] text-white text-xs font-medium hover:bg-[#27272A] disabled:opacity-40 cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  className="px-2 py-1 rounded-md bg-white border border-[#E6E5E0] text-[#4B5563] text-xs font-medium hover:text-[#18181B] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-5 flex-1 space-y-3 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D4D4D8] bg-[#F7F7F5] p-8 text-center space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#E6E5E0] text-[#6B7280] flex items-center justify-center mx-auto">
                <History className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-[#18181B]">No local snapshots yet</p>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Completed analyses are stored strictly on-device in IndexedDB so you can track metric changes over time.
              </p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D4D4D8] bg-[#F7F7F5] p-8 text-center space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#E6E5E0] text-[#6B7280] flex items-center justify-center mx-auto">
                <Folder className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-[#18181B]">No snapshots in this folder</p>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Move any saved run into this folder using its folder selector, or switch back to All Runs.
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isComparedWithCurrent = activeComparedSessionId === session.id;
              const isRunA = runA?.id === session.id;
              const isRunB = runB?.id === session.id;
              const isSelectedForCompare = isRunA || isRunB;

              return (
                <article
                  key={session.id}
                  className={`rounded-xl border p-4 space-y-3 transition-colors ${
                    isSelectedForCompare || isComparedWithCurrent
                      ? 'border-[#15803D] bg-[#ECFDF5]/35'
                      : 'border-[#E6E5E0] bg-white hover:border-[#D4D4D8]'
                  }`}
                >
                  {/* Top Row: Selection Checkbox/Badges + Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-semibold text-[#18181B] truncate">
                          {session.title || 'Untitled Snapshot'}
                        </h4>
                        <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#E6E5E0] text-[#4B5563]">
                          {session.domainTag}
                        </span>
                        {isRunA && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#18181B] text-white">
                            Run A (Baseline)
                          </span>
                        )}
                        {isRunB && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#15803D] text-white">
                            Run B (Target)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] tabular-nums">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{formatTimestamp(session.timestamp)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.id)}
                      aria-label={`Delete snapshot ${session.title || session.id}`}
                      title="Delete snapshot"
                      className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Extracted Metric Pills */}
                  {session.metrics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {session.metrics.map((metric, idx) => (
                        <span
                          key={`${session.id}-${metric.name}-${idx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F7F7F5] border border-[#E6E5E0] text-[11px] text-[#18181B] tabular-nums"
                        >
                          <span className="text-[#6B7280]">{metric.name}:</span>
                          <span className="font-semibold">{metric.rawDisplay}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Card Actions: Folder Assignment & Compare Selection */}
                  <div className="pt-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {/* Folder Select */}
                      <div className="relative flex-1 min-w-0">
                        <select
                          aria-label={`Move ${session.title || 'snapshot'} to folder`}
                          value={session.folderId ?? ''}
                          onChange={(e) =>
                            void onMoveSessionToFolder(session.id, e.target.value || null)
                          }
                          className="w-full py-1.5 px-2.5 rounded-lg text-xs bg-[#F7F7F5] border border-[#E6E5E0] text-[#18181B] focus:outline-none focus:border-[#18181B] cursor-pointer truncate"
                        >
                          <option value="">Move to folder: Unfiled</option>
                          {folders.map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              Folder: {folder.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Select for Compare Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleSelectRun(session.id)}
                        aria-pressed={isSelectedForCompare}
                        title={
                          isSelectedForCompare
                            ? 'Remove from comparison selection'
                            : validSelectedIds.length === 2
                              ? 'Replace Run B (Target) with this run'
                              : 'Select this run for 2-run comparison'
                        }
                        className={`inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-colors shrink-0 cursor-pointer ${
                          isSelectedForCompare
                            ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D]'
                            : 'bg-white border-[#E6E5E0] text-[#18181B] hover:bg-[#F7F7F5]'
                        }`}
                      >
                        {isSelectedForCompare ? (
                          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 shrink-0 text-[#6B7280]" />
                        )}
                        <span>
                          {isRunA
                            ? 'Selected (A)'
                            : isRunB
                              ? 'Selected (B)'
                              : 'Select for Compare'}
                        </span>
                      </button>
                    </div>

                    {/* Optional Compare with Current Run */}
                    {canCompare && onCompareWithCurrent && validSelectedIds.length < 2 && (
                      <button
                        type="button"
                        onClick={() => onCompareWithCurrent(session)}
                        title="Compare this snapshot with the active run"
                        className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                          isComparedWithCurrent
                            ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D]'
                            : 'bg-[#F7F7F5] border-[#E6E5E0] text-[#18181B] hover:bg-[#EFECE6]'
                        }`}
                      >
                        {isComparedWithCurrent ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Comparing with Current Run</span>
                          </>
                        ) : (
                          <>
                            <GitCompare className="w-3.5 h-3.5" />
                            <span>Compare with Current Run</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Sticky 2-Run Comparison Bar */}
        {validSelectedIds.length > 0 && (
          <div className="px-5 py-3.5 border-t border-[#A7F3D0] bg-[#ECFDF5] shrink-0 space-y-2.5">
            {validSelectedIds.length === 1 && runA && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[#15803D] font-medium truncate">
                  Select 1 more run to compare (Baseline:{' '}
                  <span className="font-semibold">{runA.title || 'Untitled Snapshot'}</span>)
                </p>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs font-semibold text-[#15803D] hover:underline shrink-0 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}

            {validSelectedIds.length === 2 && runA && runB && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#15803D]">
                  <div className="min-w-0 truncate">
                    <span className="font-semibold">A:</span>{' '}
                    <span>{runA.title || 'Untitled'}</span>
                    <span className="mx-1.5">→</span>
                    <span className="font-semibold">B:</span>{' '}
                    <span>{runB.title || 'Untitled'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-xs font-semibold text-[#15803D] hover:underline shrink-0 cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSwapRuns}
                    aria-label="Swap Baseline Run A and Target Run B"
                    title="Swap Run A and Run B"
                    className="p-2 rounded-lg bg-white border border-[#A7F3D0] text-[#15803D] hover:bg-[#D1FAE5]/50 transition-colors shrink-0 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onCompareRuns(runA, runB)}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Compare Selected Runs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drawer Footer */}
        {sessions.length > 0 && (
          <div className="p-5 border-t border-[#F0EFEA] bg-[#F7F7F5] shrink-0">
            {confirmClearAll ? (
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-[#B91C1C] text-center">
                  Delete all {sessions.length} locally saved snapshot{sessions.length === 1 ? '' : 's'}?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-[#F4F4F5] text-[#4B5563] border border-[#E6E5E0] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmClearAll(false);
                      onClearAll();
                    }}
                    className="flex-1 py-2 px-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Clear All</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#FEF2F2] text-[#18181B] hover:text-[#B91C1C] border border-[#E6E5E0] hover:border-[#FECACA] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Local History</span>
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default HistoryTimelineDrawer;
