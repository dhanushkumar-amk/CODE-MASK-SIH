import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ArchitectureSection() {
  const steps = [
    {
      num: "01",
      label: "TASK IN",
      title: "Local Ingestion",
      desc: "Prompt text or uploaded file (PDF, CSV, XLSX, DOCX, scan) placed directly in local workspace.",
    },
    {
      num: "02",
      label: "ROUTER",
      title: "Model Classifier",
      desc: "Local classifier evaluates task requirements and routes to offline qwen2.5:1.5b-instruct.",
    },
    {
      num: "03",
      label: "AGENT LOOP",
      title: "Reasoning Engine",
      desc: "Deterministic step planner structures multi-tool execution chains and synthesizes answers.",
    },
    {
      num: "04",
      label: "TOOLS",
      title: "Isolated Execution",
      desc: "Code runs in --network none Docker sandbox; OCR, PPTX, DOCX, XLSX run 100% on-device.",
    },
    {
      num: "05",
      label: "DELIVERABLE OUT",
      title: "Verified Output",
      desc: "Formatted reports, PowerPoint presentations, spreadsheets, or code delivered locally.",
    },
  ];

  return (
    <section id="how-it-works" className="w-full border-t border-neutral-200 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col gap-2 max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 font-semibold">
            HOW IT WORKS // ZERO-CLOUD ARCHITECTURE
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 font-sans">
            End-to-end processing pipeline bounded inside your local host.
          </h2>
        </div>

        {/* Horizontal Flow Steps */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((s, idx) => (
            <Card key={s.num} className="relative flex flex-col justify-between border-neutral-200 bg-white p-5 rounded-none shadow-none">
              <CardHeader className="p-0 space-y-2">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs font-bold text-neutral-950">{s.num}</span>
                  <Badge variant="outline" className="text-[10px] py-0 border-neutral-300 font-mono text-neutral-600">
                    {s.label}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-neutral-950 font-sans pt-1">
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 mt-2">
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">{s.desc}</p>
              </CardContent>

              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-white px-0.5 font-mono text-xs text-neutral-400 font-bold">
                  →
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
