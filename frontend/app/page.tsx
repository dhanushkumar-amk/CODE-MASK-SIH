"use client";

import { useState } from "react";

import ExecutionTrace from "@/app/components/ExecutionTrace";
import TaskInput from "@/app/components/TaskInput";
import type { AgentRunResult } from "@/lib/api";

export default function Home() {
  // Lifted from TaskInput so future phases (Routing Panel, etc.) can share
  // the same result object without prop drilling.
  const [agentResult, setAgentResult] = useState<AgentRunResult | null>(null);

  return (
    <>
      <TaskInput onAgentResult={setAgentResult} />
      {agentResult && (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 pb-16">
          <ExecutionTrace result={agentResult} />
        </div>
      )}
    </>
  );
}
