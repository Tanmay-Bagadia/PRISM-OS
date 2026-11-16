import React from 'react';
import type { ScenarioFile } from '../types/prism';
import { X, FileText, Lock, Check } from 'lucide-react';

interface FileEditorModalProps {
  isOpen: boolean;
  file: ScenarioFile | null;
  onClose: () => void;
  onSaveContent: (fileId: string, newContent: string) => void;
}

export const FileEditorModal: React.FC<FileEditorModalProps> = ({
  isOpen,
  file,
  onClose,
  onSaveContent,
}) => {
  const [content, setContent] = React.useState('');
  const [savedToast, setSavedToast] = React.useState(false);

  React.useEffect(() => {
    if (file) {
      setContent(file.content);
    }
  }, [file]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  const handleSave = () => {
    onSaveContent(file.id, content);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 600);
  };

  const fileSizeBytes = new TextEncoder().encode(content).length;
  const fileSizeKB = (fileSizeBytes / 1024).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#18181B]/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-[#E6E5E0] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#F0EFEA] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F7F7F5] border border-[#E6E5E0] text-[#18181B] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#15803D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#18181B]">{file.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]">
                  Local Vault Lock
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">{file.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F4F4F5] text-[#6B7280] hover:text-[#18181B] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Textarea Editor */}
        <div className="p-5 flex-1 flex flex-col min-h-[300px] overflow-hidden bg-[#FAFAF9]">
          <div className="flex items-center justify-between text-xs font-mono text-[#6B7280] mb-2">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#15803D]" />
              <span>Editing Confidential File Directly in Memory</span>
            </span>
            <span className="tabular-nums">{fileSizeKB} KB ({fileSizeBytes} bytes)</span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Confidential file content..."
            className="flex-1 w-full p-4 bg-white rounded-xl border border-[#E6E5E0] font-mono text-xs leading-relaxed text-[#18181B] resize-none focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/5 transition-all"
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="p-4 px-5 border-t border-[#F0EFEA] bg-white flex items-center justify-between">
          <span className="text-xs text-[#6B7280]">
            Changes are saved to browser local state for live analysis.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-[#4B5563] hover:text-[#18181B] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#18181B] hover:bg-[#27272A] text-white rounded-lg text-xs font-medium shadow-sm active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              {savedToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#15803D]" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileEditorModal;
