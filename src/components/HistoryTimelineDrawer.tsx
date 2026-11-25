import React from 'react';
import type { VaultSession } from '../types/longitudinal';
import {
  History,
  X,
  Trash2,
  GitCompare,
  HardDrive,
  Clock,
  Check,
} from 'lucide-react';

interface HistoryTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: VaultSession[];
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  onCompareWithCurrent: (session: VaultSession) => void;
  canCompare: boolean;
  activeComparedSessionId?: string | null;
}

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
  onDeleteSession,
  onClearAll,
  onCompareWithCurrent,
  canCompare,
  activeComparedSessionId = null,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Local History Timeline">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#18181B]/20 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Section */}
      <section className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] bg-white border-l border-[#E6E5E0] shadow-[-8px_0_24px_0_rgba(24,24,27,0.06)] z-50 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 ease-out">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#F0EFEA] space-y-3">
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
        </div>

        {/* Drawer Body */}
        <div className="p-6 flex-1 space-y-3 overflow-y-auto">
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
          ) : (
            sessions.map((session) => {
              const isCompared = activeComparedSessionId === session.id;

              return (
                <article
                  key={session.id}
                  className={`rounded-xl border p-4 space-y-3 transition-colors ${
                    isCompared
                      ? 'border-[#15803D] bg-[#ECFDF5]/35'
                      : 'border-[#E6E5E0] bg-white hover:border-[#D4D4D8]'
                  }`}
                >
                  {/* Title, Domain Badge & Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-semibold text-[#18181B] truncate">
                          {session.title || 'Untitled Snapshot'}
                        </h4>
                        <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#E6E5E0] text-[#4B5563]">
                          {session.domainTag}
                        </span>
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

                  {/* Compare Action */}
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={!canCompare}
                      onClick={() => onCompareWithCurrent(session)}
                      title={
                        canCompare
                          ? 'Compare this snapshot with the active run'
                          : 'Run an analysis first to compare against a past snapshot'
                      }
                      className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                        isCompared
                          ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D] cursor-pointer'
                          : 'bg-[#F7F7F5] border-[#E6E5E0] text-[#18181B] hover:bg-[#EFECE6] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer'
                      }`}
                    >
                      {isCompared ? (
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
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        {sessions.length > 0 && (
          <div className="p-6 border-t border-[#F0EFEA] bg-[#F7F7F5]">
            <button
              type="button"
              onClick={onClearAll}
              className="w-full py-2.5 px-4 bg-white hover:bg-[#FEF2F2] text-[#18181B] hover:text-[#B91C1C] border border-[#E6E5E0] hover:border-[#FECACA] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Local History</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default HistoryTimelineDrawer;
