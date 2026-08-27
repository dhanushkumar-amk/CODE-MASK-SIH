"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Navbar({
  onLaunchClick,
}: {
  onLaunchClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-sm shadow-none">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Wordmark & Eyebrow Badge */}
        <div className="flex items-center gap-3">
          <a
            href="#"
            className="font-mono text-sm font-bold tracking-tight text-neutral-950 hover:opacity-80"
          >
            SOVEREIGN WORKBENCH
          </a>
          <Badge variant="secondary" className="hidden sm:inline-flex border-neutral-300">
            OFFLINE // v1.0
          </Badge>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 font-mono text-xs text-neutral-600 uppercase tracking-wider">
          <a href="#how-it-works" className="hover:text-neutral-950 transition-colors">
            How It Works
          </a>
          <a href="#problem" className="hover:text-neutral-950 transition-colors">
            Problem
          </a>
          <a href="#proof" className="hover:text-neutral-950 transition-colors">
            Proof
          </a>
          <a href="#workbench" className="hover:text-neutral-950 transition-colors">
            Demo
          </a>
        </nav>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onLaunchClick}
            className="hidden sm:inline-flex border-neutral-300 hover:bg-neutral-100 text-neutral-950"
          >
            Launch Engine
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
