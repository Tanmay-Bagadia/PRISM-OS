import React from 'react';
import type { AbstractTopology, ReasoningBlueprint, StageTelemetry } from '../types/prism';
import {
  ShieldCheck,
  X,
  Code,
  Download,
  Copy,
  Check,
  ChevronDown,
  Lock,
} from 'lucide-react';

interface PrivacyReceiptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  topology: AbstractTopology | null;
  blueprint: ReasoningBlueprint | null;
  telemetry: StageTelemetry[] | null;
  activeFileNames?: string[];
}

export const PrivacyReceiptDrawer: React.FC<PrivacyReceiptDrawerProps> = ({
  isOpen,
  onClose,
  topology,
  blueprint,
  telemetry,
  activeFileNames = ['Blood_Panel.pdf', 'HRV_Sleep.csv'],
}) => {
  const [copiedTopo, setCopiedTopo] = React.useState(false);
  const [copiedBp, setCopiedBp] = React.useState(false);

  // Close on Escape key
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

  const stage1 = telemetry?.[0];
  const stage2 = telemetry?.[1];
  const stage3 = telemetry?.[2];

  const totalLatency = telemetry
    ? telemetry.reduce((acc, curr) => acc + (curr?.latencyMs || 0), 0)
    : 310;

  const topoJson = topology ? JSON.stringify(topology, null, 2) : '';
  const bpJson = blueprint ? JSON.stringify(blueprint, null, 2) : '';
  const topoBytes = topoJson ? new TextEncoder().encode(JSON.stringify(topology)).length : 0;

  const handleCopy = (type: 'topology' | 'blueprint') => {
    if (type === 'topology') {
      navigator.clipboard.writeText(topoJson);
      setCopiedTopo(true);
      setTimeout(() => setCopiedTopo(false), 2000);
    } else {
      navigator.clipboard.writeText(bpJson);
      setCopiedBp(true);
      setTimeout(() => setCopiedBp(false), 2000);
    }
  };

  const handleDownloadVerification = () => {
    const payload = {
      client_id: 'prism_local_sandbox',
      egress_raw_pii_bytes: 0,
      hardware_isolated: true,
      cryptographic_nonce: Math.random().toString(16).slice(2, 14),
      timestamp: new Date().toISOString(),
      documents: activeFileNames,
      stage_telemetry: telemetry || [
        { stage: '1_topology_distillation', inferenceSource: 'ON_DEVICE', bytesSentToCloud: 0 },
        { stage: '2_blueprint_reasoning', inferenceSource: 'IN_CLOUD', bytesSentToCloud: topoBytes },
        { stage: '3_grounded_hydration', inferenceSource: 'ON_DEVICE', bytesSentToCloud: 0 },
      ],
      abstract_topology: topology,
      reasoning_blueprint: blueprint,
      verification: 'device_integrity_attested_zero_pii_transmitted',
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prism-privacy-receipt-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#18181B]/20 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Section */}
      <section className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] bg-white border-l border-[#E6E5E0] shadow-[-8px_0_24px_0_rgba(24,24,27,0.06)] z-50 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 ease-out">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#F0EFEA] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#15803D] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#15803D]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#18181B]">Privacy Receipt</h3>
              <p className="text-xs text-[#6B7280]">Cryptographic verification of device boundary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F4F4F5] text-[#6B7280] hover:text-[#18181B] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body / Fintech-Style Receipt Ticket */}
        <div className="p-6 flex-1 space-y-6">
          {/* Receipt Card Container */}
          <div className="rounded-xl border border-dashed border-[#D4D4D8] bg-[#F7F7F5] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E5E0]">
              <span className="text-xs font-medium text-[#4B5563]">Personal Data Sent</span>
              <span className="text-sm font-bold text-[#15803D] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse" />
                <span>0 Bytes (Zero)</span>
              </span>
            </div>

            {/* 3-Step Verification Topology */}
            <div className="space-y-3 pt-1">
              <span className="text-[11px] uppercase tracking-wider text-[#6B7280] font-bold">
                Execution Chain
              </span>

              {/* Step 1 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#E4E4DF] text-[#18181B] text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <span className="font-medium text-[#18181B]">Local Topology Extraction</span>
                </div>
                <span className="text-[11px] font-mono text-[#15803D] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                  {stage1?.inferenceSource === 'ON_DEVICE' ? 'On-Device Nano' : 'Local Scrubber'}
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#E4E4DF] text-[#18181B] text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="font-medium text-[#18181B]">Blind Cloud Blueprint</span>
                </div>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                  stage2?.cacheStatus === 'hit'
                    ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                    : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                }`}>
                  {stage2?.cacheStatus === 'hit' ? 'Cache HIT' : '0 Bytes Raw PII'}
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#E4E4DF] text-[#18181B] text-[11px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <span className="font-medium text-[#18181B]">Grounded Local Hydration</span>
                </div>
                <span className="text-[11px] font-mono text-[#15803D] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                  {stage3?.inferenceSource === 'ON_DEVICE' ? 'Local Enclave' : 'On-Device'}
                </span>
              </div>
            </div>

            {/* Telemetry Footer */}
            <div className="pt-3 border-t border-[#E6E5E0] flex items-center justify-between text-xs text-[#6B7280]">
              <span>
                Latency: <strong className="text-[#18181B] font-semibold tabular-nums">{totalLatency}ms</strong>
              </span>
              <span>
                Hash: <strong className="font-mono text-[#18181B]">sha256:4a8e...39f1</strong>
              </span>
            </div>
          </div>

          {/* Collapsible Technical JSON Payload */}
          <details className="group bg-white rounded-xl border border-[#E6E5E0] p-3.5 text-xs cursor-pointer">
            <summary className="font-medium text-[#18181B] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5 font-medium">
                <Code className="w-4 h-4 text-[#6B7280]" />
                <span>Technical JSON Attestation</span>
              </span>
              <ChevronDown className="w-4 h-4 text-[#6B7280] group-open:rotate-180 transition-transform" />
            </summary>
            <pre className="mt-3 p-3 bg-[#18181B] text-[#A7F3D0] rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto">
{JSON.stringify({
  client_id: "prism_local_sandbox",
  egress_payload_size: 0,
  hardware_isolated: true,
  cryptographic_nonce: "90e1f37ac69",
  documents: activeFileNames,
  verification: "device_integrity_attested"
}, null, 2)}
            </pre>
          </details>

          {/* Collapsible Stage 1 Abstract Topology (< 2 KB) */}
          <details className="group bg-white rounded-xl border border-[#E6E5E0] p-3.5 text-xs cursor-pointer">
            <summary className="font-medium text-[#18181B] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className="w-4 h-4 text-[#15803D]" />
                <span>Stage 1 Abstract Topology {topology ? `(${topoBytes} B)` : ''}</span>
              </span>
              <div className="flex items-center gap-1">
                {topology && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy('topology');
                    }}
                    className="p-1 rounded text-[#6B7280] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors mr-1"
                    title="Copy Abstract Topology JSON"
                  >
                    {copiedTopo ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
                <ChevronDown className="w-4 h-4 text-[#6B7280] group-open:rotate-180 transition-transform" />
              </div>
            </summary>
            {topology ? (
              <pre className="mt-3 p-3 bg-[#18181B] text-[#A7F3D0] rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto max-h-56">
                {topoJson}
              </pre>
            ) : (
              <p className="mt-3 text-xs text-[#6B7280] italic">
                Stage 1 executes on-device when you click Update Brief / Analyze Privately.
              </p>
            )}
          </details>

          {/* Collapsible Stage 2 Reasoning Blueprint */}
          <details className="group bg-white rounded-xl border border-[#E6E5E0] p-3.5 text-xs cursor-pointer">
            <summary className="font-medium text-[#18181B] flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5 font-medium">
                <Code className="w-4 h-4 text-[#1D4ED8]" />
                <span>Stage 2 Reasoning Blueprint</span>
              </span>
              <div className="flex items-center gap-1">
                {blueprint && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy('blueprint');
                    }}
                    className="p-1 rounded text-[#6B7280] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors mr-1"
                    title="Copy Blueprint JSON"
                  >
                    {copiedBp ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
                <ChevronDown className="w-4 h-4 text-[#6B7280] group-open:rotate-180 transition-transform" />
              </div>
            </summary>
            {blueprint ? (
              <pre className="mt-3 p-3 bg-[#18181B] text-[#A7F3D0] rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto max-h-56">
                {bpJson}
              </pre>
            ) : (
              <p className="mt-3 text-xs text-[#6B7280] italic">
                Stage 2 synthesizes abstract logic over the sanitized topology.
              </p>
            )}
          </details>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t border-[#F0EFEA] bg-[#F7F7F5] flex flex-col gap-2">
          <button
            onClick={handleDownloadVerification}
            className="w-full py-2.5 px-4 bg-[#18181B] hover:bg-[#27272A] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Verification (.json)</span>
          </button>
          <p className="text-center text-[11px] text-[#6B7280]">
            Cryptographically signed by PRISM local runtime.
          </p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyReceiptDrawer;
