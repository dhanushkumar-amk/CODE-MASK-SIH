"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function NetworkStatusBadge({ className }: { className?: string }) {
  const [txRate, setTxRate] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:8000/network-status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setTxRate(data.bytes_sent_delta || 0);
          setIsOnline(true);
        }
      } catch {
        setTxRate(0);
        setIsOnline(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const kbRate = (txRate / 1024).toFixed(1);

  return (
    <Badge
      variant="outline"
      className={`border-blue-200/80 bg-blue-50/50 text-slate-900 font-mono text-[11px] flex items-center gap-2 px-3 py-1 rounded-full shadow-2xs uppercase tracking-wider ${className ?? ""}`}
    >
      <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse-live" : "bg-slate-400"}`} />
      <span className="font-semibold text-slate-900">{isOnline ? "AIR-GAPPED" : "LOCAL HOST"} — {kbRate} KB/s</span>
    </Badge>
  );
}
