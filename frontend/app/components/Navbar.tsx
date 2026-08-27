"use client";

import { ChevronDown, Plus, Cpu } from "lucide-react";

export default function Navbar({
  onResetConsole,
}: {
  onResetConsole?: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-slate-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
        {/* ChatGPT Style Model Selector Dropdown */}
        <button className="flex items-center gap-1.5 font-sans font-semibold text-slate-800 text-sm hover:bg-slate-200/60 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer">
          <Cpu className="h-4 w-4 text-blue-600" />
          <span>Fortexa 1.5B</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {/* Right Action Button */}
        {onResetConsole && (
          <button
            onClick={onResetConsole}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 border border-slate-200 rounded-full px-3 py-1.2 bg-white hover:bg-slate-100 transition-all cursor-pointer font-medium shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>New chat</span>
          </button>
        )}
      </div>
    </header>
  );
}





