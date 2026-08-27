"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RouteResult } from "@/lib/api";

export default function RoutingPanel({ route }: { route: RouteResult }) {
  const formattedTime = route.timestamp
    ? new Date(route.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <Card className="w-full border-neutral-300 bg-white p-3.5 sm:px-5 font-mono text-xs shadow-none rounded-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-neutral-500 font-semibold uppercase tracking-wider">
            ROUTED TO:
          </span>
          <span className="font-bold text-neutral-950 uppercase tracking-tight">
            {route.model || "qwen2.5:1.5b-instruct"}
          </span>
          <Badge
            variant="outline"
            className="border-neutral-950 text-neutral-950 font-mono text-[10px] uppercase tracking-wider rounded-none bg-white px-2 py-0.5"
          >
            [{route.task_type || "GENERAL_TASK"}]
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-neutral-500 text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" />
          <span>TIMESTAMP: {formattedTime}</span>
        </div>
      </div>
    </Card>
  );
}
