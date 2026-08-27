import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="w-full border-t border-neutral-200 bg-white py-12 font-mono text-xs text-neutral-600">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Left: Wordmark & Offline Notice */}
          <div className="flex flex-col gap-1">
            <span className="font-bold tracking-wider text-neutral-950 uppercase">
              SOVEREIGN WORKBENCH // v1.0
            </span>
            <span className="text-[11px] text-neutral-500">
              Self-hosted, air-gapped AI agent system for refineries & PSUs. Runs 100% fully offline.
            </span>
          </div>

          {/* Essential Navigation Links */}
          <div className="flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-wider text-neutral-600">
            <a href="#how-it-works" className="hover:text-neutral-950 transition-colors">
              How It Works
            </a>
            <a href="#problem" className="hover:text-neutral-950 transition-colors">
              Problem
            </a>
            <a href="#proof" className="hover:text-neutral-950 transition-colors">
              Proof
            </a>
            <a href="mailto:contact@sovereign-ai.local?subject=Demo" className="hover:text-neutral-950 transition-colors">
              Request Demo
            </a>
          </div>
        </div>

        <Separator className="bg-neutral-200" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-2 border border-neutral-200 bg-neutral-50 px-3 py-1 font-semibold text-neutral-800">
            <span className="h-2 w-2 rounded-full bg-neutral-950 animate-pulse-subtle" />
            <span>AIR-GAPPED LOCALHOST // 0 OUTBOUND TELEMETRY</span>
          </div>
          <div>
            © {new Date().getFullYear()} SOVEREIGN AI SYSTEMS. ALL RIGHTS RESERVED.
          </div>
        </div>
      </div>
    </footer>
  );
}
