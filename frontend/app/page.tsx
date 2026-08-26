export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-32">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        Sovereign AI Workbench
      </h1>
      <p className="text-lg text-muted-foreground">
        Offline-first. Zero external calls.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          ON
        </span>
        <span className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1 text-sm text-card-foreground">
          Network: isolated
        </span>
      </div>
    </main>
  );
}
