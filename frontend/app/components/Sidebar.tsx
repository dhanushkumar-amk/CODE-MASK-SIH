"use client";

import { Plus, MessageSquare, ShieldCheck, PanelLeftClose } from "lucide-react";

export default function Sidebar({
  isOpen = true,
  onToggle,
  onResetTask,
}: {
  isOpen?: boolean;
  onToggle?: () => void;
  onResetTask?: () => void;
}) {
  if (!isOpen) return null;

  return (
    <aside className="w-64 shrink-0 h-screen bg-[#171717] text-slate-200 font-sans text-xs flex flex-col justify-between border-r border-white/10 z-40 fixed md:relative">
      {/* Top Header & New Chat */}
      <div className="flex flex-col p-3 gap-3">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center font-black text-xs text-white">
              F
            </div>
            <span>Fortexa</span>
          </div>
          <button
            onClick={onToggle}
            title="Close sidebar"
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onResetTask}
          className="flex items-center gap-2.5 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2.5 text-xs text-white hover:bg-white/10 transition-all cursor-pointer font-medium"
        >
          <Plus className="h-4 w-4 text-white" />
          <span>New chat</span>
        </button>

        {/* Recent Chats Section */}
        <div className="flex flex-col gap-1 mt-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2">
            Recent Tasks
          </span>
          <button
            onClick={onResetTask}
            className="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left truncate group"
          >
            <MessageSquare className="h-3.5 w-3.5 text-slate-400 group-hover:text-white shrink-0" />
            <span className="truncate">Odd or Even Java Code</span>
          </button>
          <button
            onClick={onResetTask}
            className="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left truncate group"
          >
            <MessageSquare className="h-3.5 w-3.5 text-slate-400 group-hover:text-white shrink-0" />
            <span className="truncate">Analyze Crude Unit Log CSV</span>
          </button>
          <button
            onClick={onResetTask}
            className="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left truncate group"
          >
            <MessageSquare className="h-3.5 w-3.5 text-slate-400 group-hover:text-white shrink-0" />
            <span className="truncate">Refinery PDF OCR Parsing</span>
          </button>
        </div>
      </div>

      {/* Footer Profile & Enclave Status */}
      <div className="p-3 border-t border-white/10 flex items-center justify-between bg-[#141414]">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white leading-tight">Air-Gapped Node</span>
            <span className="text-[10px] text-slate-400">100% Local Enclave</span>
          </div>
        </div>
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
      </div>
    </aside>
  );
}

