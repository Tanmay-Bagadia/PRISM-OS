import React from 'react';
import { Lock, ArrowUp } from 'lucide-react';

interface FloatingVaultBarProps {
  onFollowUpOffline: (customPrompt?: string) => void;
  isRunning: boolean;
}

export const FloatingVaultBar: React.FC<FloatingVaultBarProps> = ({
  onFollowUpOffline,
  isRunning,
}) => {
  const [question, setQuestion] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isRunning) return;
    onFollowUpOffline(question.trim());
    setQuestion('');
  };

  return (
    <aside className="fixed bottom-5 inset-x-0 mx-auto w-full max-w-[620px] px-4 z-20">
      <form
        onSubmit={handleSubmit}
        className="bg-white/95 backdrop-blur-md rounded-full p-1.5 pl-4 border border-[#E6E5E0] shadow-[0_8px_24px_rgba(24,24,27,0.08)] flex items-center gap-2 transition-all hover:border-zinc-300"
      >
        {/* Local Status Micro-Pill */}
        <div className="hidden sm:inline-flex items-center gap-1.5 pr-2.5 border-r border-[#E6E5E0] text-xs text-[#4B5563] whitespace-nowrap">
          <Lock className="w-3.5 h-3.5 text-[#15803D]" />
          <span className="font-medium text-[#18181B]">Private Vault</span>
          <span className="text-[10px] text-[#15803D] bg-[#ECFDF5] px-1.5 py-0.5 rounded font-mono font-medium">
            0 Bytes Out
          </span>
        </div>

        {/* Follow-Up Text Input */}
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a follow-up question offline..."
          className="flex-1 bg-transparent border-0 text-xs text-[#18181B] placeholder:text-[#9CA3AF] focus:ring-0 focus:outline-none"
        />

        {/* Circular Submit CTA */}
        <button
          type="submit"
          disabled={isRunning || !question.trim()}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm ${
            isRunning || !question.trim()
              ? 'bg-[#E4E4DF] text-[#9CA3AF] cursor-not-allowed'
              : 'bg-[#18181B] hover:bg-[#27272A] text-white cursor-pointer'
          }`}
          title="Submit offline query to local cache"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
};

export default FloatingVaultBar;
