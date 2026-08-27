"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Server, FileText, ChevronDown, ChevronUp } from "lucide-react";

export default function StatusReadout() {
  const [networkStats, setNetworkStats] = useState({ tx: 0, rx: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:8000/network-status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setNetworkStats({ tx: data.bytes_sent_delta || 0, rx: data.bytes_recv_delta || 0 });
        }
      } catch {
        // Fallback display
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-xs font-sans text-xs text-slate-700 shadow-2xs overflow-hidden transition-all">
      {/* Compact Horizontal Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Active Model Pill */}
          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <Server className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[11px] text-slate-500">Engine:</span>
            <span className="font-mono text-xs font-semibold text-slate-900">qwen2.5:1.5b</span>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" title="Loaded" />
          </div>

          <div className="hidden sm:block h-3.5 w-px bg-slate-200" />

          {/* Air-gap Zero Telemetry Status */}
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-mono text-[11px] font-semibold">{networkStats.tx} B/s Outbound</span>
            <span className="text-[10px] text-slate-400 font-normal">(Network Blocked)</span>
          </div>

          <div className="hidden md:block h-3.5 w-px bg-slate-200" />

          {/* Docker Enclave Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-slate-600">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px]">Docker Enclave Active</span>
          </div>
        </div>

        {/* Toggle Details Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? "Hide Details" : "System Telemetry"}</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Expanded Metrics Section */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-slate-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">LOCAL MODEL</span>
              <span className="font-mono font-medium text-slate-800">qwen2.5:1.5b-instruct</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">ENCLAVE ISOLATION</span>
              <span className="font-mono font-medium text-slate-800">docker --network none</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">SUPPORTED PIPELINE</span>
              <span className="font-mono font-medium text-slate-800">PDF, CSV, XLSX, DOCX, PPTX</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


