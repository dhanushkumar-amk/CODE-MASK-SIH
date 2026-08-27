import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

export default function ProblemSection() {
  const problems = [
    {
      title: "Manual work",
      eyebrow: "COST // PRODUCTIVITY BOTTLENECK",
      description:
        "Engineers lose thousands of hours manually reviewing 200-page specs, extracting data from PDF scans, and writing compliance reports because cloud AI tools are banned.",
    },
    {
      title: "Shadow IT",
      eyebrow: "RISK // DATA LEAKAGE",
      description:
        "Unchecked staff secretly paste confidential operating logs, chemical formulas, and refinery schematics into public LLMs, risking catastrophic regulatory penalties.",
    },
    {
      title: "No alternative",
      eyebrow: "IMPASSE // CLOUD ENFORCEMENT",
      description:
        "Traditional enterprise AI SaaS vendors require continuous cloud telemetry and API keys, offering no true air-gapped deployment model for zero-trust facilities.",
    },
  ];

  return (
    <section id="problem" className="w-full border-t border-neutral-200 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col gap-2 max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 font-semibold">
            THE IMPASSE // CONFIDENTIAL DATA AT RISK
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 font-sans">
            Critical infrastructure cannot compromise on data sovereignty.
          </h2>
        </div>

        {/* 3 Short Columns using shadcn Card */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((p) => (
            <Card
              key={p.title}
              className="flex flex-col justify-between border-neutral-200 bg-white p-6 transition-colors hover:border-neutral-400 rounded-none shadow-none"
            >
              <CardHeader className="p-0 space-y-2">
                <span className="font-mono text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                  {p.eyebrow}
                </span>
                <CardTitle className="text-lg font-bold text-neutral-950 font-sans tracking-tight">
                  {p.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 mt-3">
                <p className="text-sm text-neutral-600 leading-relaxed font-sans">
                  {p.description}
                </p>
              </CardContent>
              <CardFooter className="p-0 mt-6 pt-4 border-t border-neutral-100 font-mono text-[10px] text-neutral-400 uppercase tracking-widest bg-transparent">
                VERIFIED INDUSTRIAL THREAT
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
