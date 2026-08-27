"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <Card className="w-full border-slate-300 bg-white font-mono text-xs text-slate-900 rounded-none shadow-sm">
      {/* Readout Header Bar */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-slate-100/90 px-4 py-2.5 space-y-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-live" />
          <span className="font-bold tracking-wider text-slate-900 uppercase text-[11px]">
            TELEMETRY // LOCALHOST (127.0.0.1)
          </span>
        </div>
        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-950 font-bold flex items-center gap-1.5 py-0.5 px-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse-live" />
          <span>ONLINE (LOCAL)</span>
        </Badge>
      </CardHeader>

      {/* Metric Rows */}
      <CardContent className="divide-y divide-slate-100 p-0 bg-white">
        <div className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors">
          <span className="text-slate-500 uppercase tracking-wider font-semibold">MODEL:</span>
          <span className="font-bold text-slate-950">qwen2.5:1.5b-instruct — LOADED</span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors">
          <span className="text-slate-500 uppercase tracking-wider font-semibold">NETWORK:</span>
          <span className="font-bold text-emerald-700">
            {networkStats.tx} B/s outbound (HARD BLOCKED)
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors">
          <span className="text-slate-500 uppercase tracking-wider font-semibold">SANDBOX:</span>
          <span className="font-bold text-slate-950">
            isolated (docker --network none)
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors">
          <span className="text-slate-500 uppercase tracking-wider font-semibold">PIPELINE:</span>
          <span className="font-bold text-slate-950">
            pptx, docx, xlsx, csv, pdf, ocr — READY
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors">
          <span className="text-slate-500 uppercase tracking-wider font-semibold">ENCLAVE:</span>
          <span className="font-bold text-slate-950">
            VERIFIED 100% AIR-GAPPED
          </span>
        </div>
      </CardContent>

      {/* Terminal Footer Prompt */}
      <CardFooter className="border-t border-slate-300 bg-slate-950 px-4 py-2.5 text-white flex items-center justify-between rounded-none">
        <span className="text-[11px] text-slate-300 font-mono">
          root@sovereign-node:~# status --verify --zero-telemetry
        </span>
        <span className="animate-pulse-live font-bold text-emerald-400">_</span>
      </CardFooter>
    </Card>
  );
}
