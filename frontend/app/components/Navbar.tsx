"use client";

import { Plus } from "lucide-react";
import HistoryDrawer, { type HistoryItem } from "@/app/components/HistoryDrawer";

export default function Navbar({
  onResetConsole,
  history = [],
  onSelectRun,
  onClearHistory,
}: {
  onResetConsole?: () => void;
  tasksCompleted?: number;
  filesGenerated?: number;
  externalCalls?: number;
  history?: HistoryItem[];
  onSelectRun?: (item: HistoryItem) => void;
  onClearHistory?: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
        {/* Left Side: Brand Logo */}
        <button
          onClick={onResetConsole}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
            F
          </div>
          <span className="font-bold text-base text-slate-900 tracking-tight">
            Fortexa
          </span>
        </button>

        {/* Right Side: Session Log & New Chat Button */}
        <div className="flex items-center gap-2.5">
          <HistoryDrawer
            history={history}
            onSelectRun={onSelectRun}
            onClearHistory={onClearHistory}
          />

          {onResetConsole && (
            <button
              onClick={onResetConsole}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>New chat</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}









