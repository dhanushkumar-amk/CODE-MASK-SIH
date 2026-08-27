import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProofSection() {
  const proofs = [
    {
      label: "LIVE NETWORK MONITORING",
      title: "Real-Time Byte Tracking",
      desc: "Integrated OS-level socket telemetry continuously logs all outbound network interfaces to mathematically verify 0 bytes transmitted during agent execution.",
    },
    {
      label: "PHYSICAL DISCONNECTION",
      title: "Zero Remote Heartbeats",
      desc: "Designed to operate seamlessly with physical Ethernet cables unplugged and Wi-Fi disabled. Zero external dependencies or cloud license pings required.",
    },
    {
      label: "CONTAINER ENCLAVE",
      title: "--network none Docker Sandbox",
      desc: "All code execution steps run inside isolated, non-root Docker containers with networking hard-disabled at the Linux kernel layer.",
    },
  ];

  return (
    <section id="proof" className="w-full border-y border-neutral-200 bg-[#FAFAFA] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col gap-2 max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 font-semibold">
            PROOF OF OFFLINE // INDEPENDENT AUDITABILITY
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 font-sans">
            Don't trust vendor promises. Verify with mathematical air-gapping.
          </h2>
          <p className="text-sm text-neutral-600 font-sans leading-relaxed mt-1">
            Built for zero-trust facilities, refineries, and PSUs where compliance auditors demand provable offline verification and physical isolation.
          </p>
        </div>

        {/* 3 Proof Cards using shadcn Card */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {proofs.map((p) => (
            <Card
              key={p.label}
              className="flex flex-col justify-between border-neutral-300 bg-white p-6 shadow-none rounded-none"
            >
              <CardHeader className="p-0 space-y-2">
                <Badge variant="outline" className="text-[10px] py-0 border-neutral-300 font-mono text-neutral-500 w-fit">
                  {p.label}
                </Badge>
                <CardTitle className="text-base font-bold text-neutral-950 font-sans tracking-tight">
                  {p.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 mt-3">
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                  {p.desc}
                </p>
              </CardContent>
              <CardFooter className="p-0 mt-6 flex items-center gap-2 font-mono text-[10px] text-neutral-950 font-bold uppercase tracking-wider bg-transparent">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" />
                VERIFIABLE METHOD OF PROOF
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
