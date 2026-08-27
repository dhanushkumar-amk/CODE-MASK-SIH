"use client";

import NetworkStatusBadge from "@/app/components/NetworkStatusBadge";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Cpu } from "lucide-react";

export default function Navbar({
  onResetConsole,
}: {
  onResetConsole?: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-100/80 bg-white/80 backdrop-blur-xl shadow-xs">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <a
            href="#"
            onClick={onResetConsole}
            className="flex items-center gap-2.5 font-sans text-sm font-bold tracking-tight text-slate-900 hover:opacity-90 transition-opacity group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              F
            </div>
            <span className="font-extrabold tracking-tight text-slate-900 text-base">
              FORTEXA <span className="text-blue-600 font-medium text-xs">AI</span>
            </span>
          </a>
          <Badge
            variant="secondary"
            className="hidden sm:inline-flex bg-blue-50 text-blue-700 border-blue-200/80 font-medium text-[10px] py-0.5 px-2.5 rounded-full"
          >
            <ShieldCheck className="h-3 w-3 text-blue-600 mr-1" />
            AIR-GAPPED v1.0
          </Badge>
        </div>

        {/* Center/Right Status & Model Selector */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-3.5 py-1 font-mono text-[11px] text-slate-700 shadow-2xs">
            <Cpu className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-semibold text-slate-900">qwen2.5:1.5b-instruct</span>
          </div>
          <NetworkStatusBadge />
        </div>
      </div>
    </header>
  );
}

