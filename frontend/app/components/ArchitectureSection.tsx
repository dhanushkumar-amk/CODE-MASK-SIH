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
    <section id="how-it-works" className="w-full border-t border-[#26272D] bg-[#08090A] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col gap-2 max-w-2xl">
          <Badge variant="secondary" className="w-fit bg-[#1A1B22] text-[#E2E8F0] border-[#2E303A] font-mono text-[10px]">
            HOW IT WORKS // ZERO-CLOUD ARCHITECTURE
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            End-to-end processing pipeline bounded inside your local host.
          </h2>
          <p className="text-xs sm:text-sm text-[#8A8F98] font-sans leading-relaxed mt-1">
            Real-time step sequence executed strictly on local hardware with zero external dependencies.
          </p>
        </div>

        {/* Horizontal Flow Steps */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((s, idx) => (
            <Card key={s.num} className="relative flex flex-col justify-between border-[#26272D] bg-[#14151A] p-5 rounded-2xl shadow-xl shadow-black/40 hover:border-white/20 transition-all duration-300">
              <CardHeader className="p-0 space-y-2">
                <div className="flex items-center justify-between border-b border-[#202128] pb-2.5">
                  <span className="font-mono text-xs font-bold text-white">{s.num}</span>
                  <Badge variant="outline" className="text-[9px] py-0 border-[#2E303A] font-mono text-[#8A8F98] bg-[#181920] rounded-full">
                    {s.label}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-white font-sans pt-1">
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 mt-2">
                <p className="text-xs text-[#8A8F98] leading-relaxed font-sans">{s.desc}</p>
              </CardContent>

              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 bg-[#1A1B22] p-1 rounded-full border border-[#2E303A] font-mono text-xs text-[#8A8F98] font-bold shadow-md">
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
