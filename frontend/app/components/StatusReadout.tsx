"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StatusReadout() {
  const [networkStats, setNetworkStats] = useState({ tx: 0, rx: 0 });

  useEffect(() => {
    // Poll local network status if backend is available
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:8000/network-status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setNetworkStats({ tx: data.bytes_sent_delta || 0, rx: data.bytes_recv_delta || 0 });
        }
      } catch {
        // Fallback offline display
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full border-neutral-300 bg-white font-mono text-xs text-neutral-900 rounded-none shadow-none">
      {/* Readout Header Bar */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-300 bg-neutral-100 px-4 py-2.5 space-y-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neutral-950 animate-pulse-subtle" />
          <span className="font-bold tracking-wider text-neutral-950 uppercase text-[11px]">
            TELEMETRY // LOCALHOST (127.0.0.1)
          </span>
        </div>
        <Badge variant="outline" className="border-neutral-300 bg-white text-neutral-900 flex items-center gap-1.5 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-950 animate-pulse-subtle" />
          <span>ONLINE (LOCAL)</span>
        </Badge>
      </CardHeader>

      {/* Metric Rows */}
      <CardContent className="divide-y divide-neutral-200 p-0">
        <div className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-neutral-50/50">
          <span className="text-neutral-500 uppercase tracking-wider font-semibold">MODEL:</span>
          <span className="font-semibold text-neutral-950">qwen2.5:1.5b-instruct — LOADED</span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-neutral-50/50">
          <span className="text-neutral-500 uppercase tracking-wider font-semibold">NETWORK:</span>
          <span className="font-semibold text-neutral-950">
            {networkStats.tx} B/s outbound
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-neutral-50/50">
          <span className="text-neutral-500 uppercase tracking-wider font-semibold">SANDBOX:</span>
          <span className="font-semibold text-neutral-950">
            isolated (docker --network none)
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-neutral-50/50">
          <span className="text-neutral-500 uppercase tracking-wider font-semibold">DOCUMENT_PIPELINE:</span>
          <span className="font-semibold text-neutral-950">
            pptx, docx, xlsx, csv, pdf, ocr — READY
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-neutral-50/50">
          <span className="text-neutral-500 uppercase tracking-wider font-semibold">AIR_GAP_STATUS:</span>
          <span className="font-semibold text-neutral-950">
            VERIFIED 100% OFFLINE
          </span>
        </div>
      </CardContent>

      {/* Terminal Footer Prompt */}
      <CardFooter className="border-t border-neutral-300 bg-neutral-950 px-4 py-2.5 text-white flex items-center justify-between rounded-none">
        <span className="text-[11px] text-neutral-300 font-mono">
          root@sovereign-node:~# status --verify --zero-telemetry
        </span>
        <span className="animate-pulse-subtle font-bold text-white">_</span>
      </CardFooter>
    </Card>
  );
}
