"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getDownloadUrl } from "@/lib/api";
import { FileText, FileSpreadsheet, Presentation, FileCode, Download, CheckCircle2 } from "lucide-react";

export default function OutputPanel({
  output,
  filename,
  codeResult,
}: {
  output?: string;
  filename?: string | null;
  codeResult?: string | null;
}) {
  const getFileIcon = (fname: string) => {
    const ext = fname.split(".").pop()?.toLowerCase();
    if (ext === "pptx" || ext === "ppt") return <Presentation className="h-5 w-5 text-white" />;
    if (ext === "csv" || ext === "xlsx" || ext === "xls") return <FileSpreadsheet className="h-5 w-5 text-white" />;
    if (ext === "py" || ext === "js" || ext === "ts" || ext === "json" || ext === "sh") return <FileCode className="h-5 w-5 text-white" />;
    return <FileText className="h-5 w-5 text-white" />;
  };

  return (
    <div className="w-full flex flex-col gap-4 font-sans">
      <div className="flex items-center justify-between border-b border-[#26272D] pb-2.5 font-mono text-xs text-[#8A8F98] font-semibold uppercase tracking-wider">
        <span>FINAL DELIVERABLE // VERIFIED OUTPUT</span>
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <CheckCircle2 className="h-4 w-4" />
          <span>TASK COMPLETED</span>
        </span>
      </div>

      {filename && (
        <Card className="w-full border-[#26272D] bg-[#14151A] p-5 sm:p-6 rounded-2xl shadow-xl shadow-black/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2E303A] bg-[#1C1D24]">
                {getFileIcon(filename)}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs text-[#8A8F98] font-semibold uppercase">
                  WORKSPACE FILE GENERATED:
                </span>
                <span className="font-mono text-sm font-bold text-white break-all">
                  {filename}
                </span>
              </div>
            </div>
            <a
              href={getDownloadUrl(filename)}
              download
              className="inline-flex h-10 items-center justify-center gap-2 bg-white px-5 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors w-full sm:w-auto shadow-md cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download File</span>
            </a>
          </div>
        </Card>
      )}

      {codeResult && (
        <Card className="w-full border-[#26272D] bg-[#14151A] p-5 sm:p-6 rounded-2xl shadow-xl shadow-black/40">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-[#8A8F98] font-semibold">
              EXECUTED CODE / OUTPUT READOUT
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="overflow-x-auto border border-[#26272D] bg-[#0A0B0E] p-4.5 rounded-xl font-mono text-xs leading-relaxed text-[#E2E8F0] selection:bg-white selection:text-black">
              <code>{codeResult}</code>
            </pre>
          </CardContent>
        </Card>
      )}

      {output && !filename && !codeResult && (
        <Card className="w-full border-[#26272D] bg-[#14151A] p-5 sm:p-6 rounded-2xl shadow-xl shadow-black/40">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-[#8A8F98] font-semibold">
              SUMMARY & SYNTHESIS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-sm leading-relaxed text-[#E2E8F0] font-sans whitespace-pre-wrap">
              {output}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
