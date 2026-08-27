"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<{
  open: boolean;
  toggle: () => void;
}>({ open: false, toggle: () => {} });

function Collapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

  const toggle = React.useCallback(() => {
    const next = !isOpen;
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }, [isOpen, controlledOpen, onOpenChange]);

  return (
    <CollapsibleContext.Provider value={{ open: isOpen, toggle }}>
      <div data-slot="collapsible" data-state={isOpen ? "open" : "closed"} className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

function CollapsibleTrigger({
  className,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggle } = React.useContext(CollapsibleContext);

  return (
    <button
      type="button"
      data-slot="collapsible-trigger"
      onClick={(e) => {
        onClick?.(e);
        toggle();
      }}
      className={cn("cursor-pointer select-none", className)}
      {...props}
    >
      {children}
    </button>
  );
}

function CollapsibleContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = React.useContext(CollapsibleContext);

  if (!open) return null;

  return (
    <div
      data-slot="collapsible-content"
      className={cn("overflow-hidden transition-all", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
