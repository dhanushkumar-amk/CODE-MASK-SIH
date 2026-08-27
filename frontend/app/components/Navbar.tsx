"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Navbar({
  onLaunchClick,
}: {
  onLaunchClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#08090A]/80 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Logo Wordmark & Live Pill */}
        <div className="flex items-center gap-3">
          <a
            href="#"
            className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight text-white hover:opacity-80 transition-opacity"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            <span>SOVEREIGN WORKBENCH</span>
          </a>
          <Badge variant="secondary" className="hidden sm:inline-flex bg-[#16171E] text-emerald-400 border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            OFFLINE v1.0
          </Badge>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 font-sans text-xs font-semibold text-[#8A8F98]">
          <a
            href="#how-it-works"
            className="px-3 py-1.5 rounded-lg hover:bg-[#181920] hover:text-white transition-colors"
          >
            How It Works
          </a>
          <a
            href="#problem"
            className="px-3 py-1.5 rounded-lg hover:bg-[#181920] hover:text-white transition-colors"
          >
            Problem
          </a>
          <a
            href="#proof"
            className="px-3 py-1.5 rounded-lg hover:bg-[#181920] hover:text-white transition-colors"
          >
            Proof
          </a>
          <a
            href="#workbench"
            className="px-3 py-1.5 rounded-lg hover:bg-[#181920] hover:text-white transition-colors"
          >
            Console Demo
          </a>
        </nav>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onLaunchClick}
            className="hidden sm:inline-flex border-[#26272D] bg-[#14151A] text-white hover:bg-[#1C1D24]"
          >
            Launch Console
          </Button>
          <a
            href="mailto:contact@sovereign-ai.local?subject=Sovereign%20Workbench%20Demo%20Request"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            Request Demo
          </a>
        </div>
      </div>
    </header>
  );
}
