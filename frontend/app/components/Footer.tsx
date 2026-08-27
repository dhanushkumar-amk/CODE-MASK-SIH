import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="w-full border-t border-blue-100/80 bg-white/80 backdrop-blur-md py-8 font-sans text-xs text-slate-500">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-extrabold tracking-wider text-slate-900 uppercase flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-blue-600 shadow-xs shadow-blue-500/50" />
              FORTEXA WORKBENCH <span className="text-blue-600">//</span> v1.0
            </span>
            <span className="text-[11px] text-slate-500">
              Self-hosted, air-gapped AI agent engine for critical infrastructure.
            </span>
          </div>

          <div className="flex items-center gap-2 border border-blue-200/80 bg-blue-50/60 px-3.5 py-1.5 font-semibold text-blue-700 rounded-full text-[11px] font-mono">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse-live" />
            <span>AIR-GAPPED LOCALHOST // 0 TELEMETRY LOG</span>
          </div>
        </div>

        <Separator className="bg-slate-100" />

        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 font-mono">
          <div>© {new Date().getFullYear()} FORTEXA AI SYSTEMS. ALL RIGHTS RESERVED.</div>
          <div>VERIFIED 100% ON-PREMISE ENCLAVE</div>
        </div>
      </div>
    </footer>
  );
}

