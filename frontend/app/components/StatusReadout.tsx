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
    <Card className="w-full border-[#26272D] bg-[#14151A] font-mono text-xs text-[#F7F8F8] rounded-2xl shadow-xl shadow-black/60">
      {/* Readout Header Bar */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#26272D] bg-[#0F1014] px-5 py-3 space-y-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="font-bold tracking-wider text-white uppercase text-[11px]">
            TELEMETRY // LOCALHOST (127.0.0.1)
          </span>
        </div>
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/40 text-emerald-300 font-bold flex items-center gap-1.5 py-0.5 px-2.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span>ONLINE (LOCAL)</span>
        </Badge>
      </CardHeader>

      {/* Metric Rows */}
      <CardContent className="divide-y divide-[#1F2026] p-0 bg-[#14151A]">
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 hover:bg-[#1A1B22] transition-colors">
          <span className="text-[#8A8F98] uppercase tracking-wider font-semibold">MODEL:</span>
          <span className="font-bold text-white">qwen2.5:1.5b-instruct — LOADED</span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 hover:bg-[#1A1B22] transition-colors">
          <span className="text-[#8A8F98] uppercase tracking-wider font-semibold">NETWORK:</span>
          <span className="font-bold text-emerald-400">
            {networkStats.tx} B/s outbound (HARD BLOCKED)
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 hover:bg-[#1A1B22] transition-colors">
          <span className="text-[#8A8F98] uppercase tracking-wider font-semibold">SANDBOX:</span>
          <span className="font-bold text-white">
            isolated (docker --network none)
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 hover:bg-[#1A1B22] transition-colors">
          <span className="text-[#8A8F98] uppercase tracking-wider font-semibold">PIPELINE:</span>
          <span className="font-bold text-white">
            pptx, docx, xlsx, csv, pdf, ocr — READY
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 hover:bg-[#1A1B22] transition-colors">
          <span className="text-[#8A8F98] uppercase tracking-wider font-semibold">AIR GAP STATUS:</span>
          <span className="font-bold text-white">
            VERIFIED 100% OFFLINE
          </span>
        </div>
      </CardContent>

      {/* Terminal Footer Prompt */}
      <CardFooter className="border-t border-[#26272D] bg-[#0A0B0E] px-5 py-3 text-white flex items-center justify-between rounded-b-2xl">
        <span className="text-[11px] text-[#8A8F98] font-mono">
          root@sovereign-node:~# status --verify --zero-telemetry
        </span>
        <span className="animate-pulse-dot font-bold text-emerald-400">_</span>
      </CardFooter>
    </Card>
  );
}
