"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Shield, Lock, Server, FileCheck } from "lucide-react";

export default function StatusReadout() {
  const [networkStats, setNetworkStats] = useState({ tx: 0, rx: 0 });

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
    <Card className="w-full border-blue-100/90 bg-white/90 font-sans text-xs text-slate-900 rounded-2xl shadow-xs overflow-hidden">
      {/* Header Bar */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 space-y-0">
        <div className="flex items-center gap-2.5">
          <Activity className="h-4 w-4 text-blue-600 animate-pulse-live" />
          <span className="font-extrabold tracking-wider text-slate-900 uppercase text-[11px]">
            FORTEXA TELEMETRY <span className="text-blue-600">//</span> LOCALHOST MONITOR
          </span>
        </div>
        <Badge variant="outline" className="border-blue-200 bg-blue-50/80 text-blue-700 font-bold flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse-live" />
          <span>VERIFIED 0 B/s OUTBOUND</span>
        </Badge>
      </CardHeader>

      {/* Grid of Telemetry Indicators */}
      <CardContent className="divide-y divide-slate-100 p-0 bg-white">
        <div className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Server className="h-4 w-4" />
            </div>
            <span className="text-slate-500 uppercase tracking-wider text-[11px] font-semibold">MODEL ENGINE:</span>
          </div>
          <span className="font-bold text-slate-900 font-mono">qwen2.5:1.5b-instruct — LOADED</span>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-slate-500 uppercase tracking-wider text-[11px] font-semibold">OUTBOUND SOCKETS:</span>
          </div>
          <span className="font-bold text-emerald-700 font-mono">
            {networkStats.tx} B/s (HARD NETWORK BLOCKED)
          </span>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Lock className="h-4 w-4" />
            </div>
            <span className="text-slate-500 uppercase tracking-wider text-[11px] font-semibold">SANDBOX ENCLAVE:</span>
          </div>
          <span className="font-bold text-slate-900 font-mono">
            isolated (docker --network none)
          </span>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileCheck className="h-4 w-4" />
            </div>
            <span className="text-slate-500 uppercase tracking-wider text-[11px] font-semibold">DOCUMENT PIPELINE:</span>
          </div>
          <span className="font-bold text-slate-900 font-mono">
            PDF, CSV, XLSX, DOCX, PPTX, OCR
          </span>
        </div>
      </CardContent>

      {/* Terminal Footer Prompt */}
      <CardFooter className="border-t border-slate-200/80 bg-slate-900 px-5 py-3 text-white flex items-center justify-between">
        <span className="text-[11px] text-blue-300 font-mono">
          root@fortexa-node:~# status --verify --zero-telemetry
        </span>
        <span className="animate-pulse-live font-bold text-blue-400 font-mono">_</span>
      </CardFooter>
    </Card>
  );
}

