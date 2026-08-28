"use client";

import { Plus, ShieldCheck } from "lucide-react";
import HistoryDrawer, { type HistoryItem } from "@/app/components/HistoryDrawer";

import UserAuthModal from "@/app/components/UserAuthModal";

export default function Navbar({
  onResetConsole,
  history = [],
  onSelectRun,
  onClearHistory,
  onUserChanged,
}: {
  onResetConsole?: () => void;
  tasksCompleted?: number;
  filesGenerated?: number;
  externalCalls?: number;
  history?: HistoryItem[];
  onSelectRun?: (item: HistoryItem) => void;
  onClearHistory?: () => void;
  onUserChanged?: (user: any) => void;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
        {/* Left Side: Brand Logo */}
        <button
          onClick={onResetConsole}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center p-0.5 group-hover:scale-105 transition-transform">
            <img
              src="/image.png"
              alt="Fortexa Logo"
              className="h-full w-full object-contain"
              style={{
                filter: "invert(37%) sepia(93%) saturate(2335%) hue-rotate(213deg) brightness(98%) contrast(92%)"
              }}
            />
          </div>
          <span className="font-bold text-base text-slate-900 tracking-tight">
            Fortexa
          </span>
        </button>

        {/* Right Side: Session Log & User Profile */}
        <div className="flex items-center gap-2.5">
          <HistoryDrawer
            history={history}
            onSelectRun={onSelectRun}
            onClearHistory={onClearHistory}
          />

          <UserAuthModal onUserChanged={onUserChanged} />
        </div>
      </div>
    </header>
  );
}









