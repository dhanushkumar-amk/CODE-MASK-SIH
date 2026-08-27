"use client";

import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-slate-50 py-6 font-sans text-xs text-slate-500">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-semibold text-slate-900 text-xs">FORTEXA AI</span>
          <span className="text-slate-300">•</span>
          <span className="text-[11px] text-slate-400">Air-Gapped Enterprise Enclave</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Zero Telemetry Outbound</span>
        </div>
      </div>
    </footer>
  );
}


