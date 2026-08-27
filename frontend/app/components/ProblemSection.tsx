import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ShieldAlert, Lock } from "lucide-react";

export default function ProblemSection() {
  const problems = [
    {
      title: "Manual work",
      eyebrow: "COST // PRODUCTIVITY BOTTLENECK",
      icon: Clock,
      description:
        "Engineers lose thousands of hours manually reviewing 200-page specs, extracting data from PDF scans, and writing compliance reports because cloud AI tools are banned.",
    },
    {
      title: "Shadow IT",
      eyebrow: "RISK // DATA LEAKAGE",
      icon: ShieldAlert,
      description:
        "Unchecked staff secretly paste confidential operating logs, chemical formulas, and refinery schematics into public LLMs, risking catastrophic regulatory penalties.",
    },
    {
      title: "No alternative",
      eyebrow: "IMPASSE // CLOUD ENFORCEMENT",
      icon: Lock,
      description:
        "Traditional enterprise AI SaaS vendors require continuous cloud telemetry and API keys, offering no true air-gapped deployment model for zero-trust facilities.",
    },
  ];

  return (
    <section id="problem" className="w-full border-t border-[#26272D] bg-[#0C0D0E] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col gap-2 max-w-2xl">
          <Badge variant="secondary" className="w-fit bg-[#1A1B22] text-[#E2E8F0] border-[#2E303A] font-mono text-[10px]">
            THE IMPASSE // CONFIDENTIAL DATA AT RISK
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Critical infrastructure cannot compromise on data sovereignty.
          </h2>
          <p className="text-xs sm:text-sm text-[#8A8F98] font-sans leading-relaxed mt-1">
            Why traditional enterprise SaaS fails in air-gapped refineries, power plants, and defense sites.
          </p>
        </div>

        {/* 3 Modern Dark Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((p) => {
            const IconComponent = p.icon;
            return (
              <Card
                key={p.title}
                className="flex flex-col justify-between border-[#26272D] bg-[#14151A] p-6 rounded-2xl shadow-xl shadow-black/40 hover:border-white/20 transition-all duration-300"
              >
                <CardHeader className="p-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold tracking-wider text-[#8A8F98] uppercase">
                      {p.eyebrow}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1C1D24] border border-[#2E303A] text-white">
                      <IconComponent className="h-4 w-4" />
                    </div>
                  </div>
                  <CardTitle className="text-lg font-bold text-white font-sans tracking-tight">
                    {p.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 mt-3">
                  <p className="text-xs sm:text-sm text-[#8A8F98] leading-relaxed font-sans">
                    {p.description}
                  </p>
                </CardContent>
                <CardFooter className="p-0 mt-6 pt-4 border-t border-[#1F2026] font-mono text-[10px] text-[#70757E] uppercase tracking-widest bg-transparent">
                  VERIFIED INDUSTRIAL RISK
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
