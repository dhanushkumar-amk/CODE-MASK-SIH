"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDownloadUrl } from "@/lib/api";
import { FileText, FileSpreadsheet, Presentation, FileCode, Download, CheckSquare } from "lucide-react";

export default function OutputPanel({
  output,
  filename,
  codeResult,
}: {
  output?: string;
  filename?: string | null;
  codeResult?: string | null;
}) {
  // Determine file icon based on extension
  const getFileIcon = (fname: string) => {
    const ext = fname.split(".").pop()?.toLowerCase();
    if (ext === "pptx" || ext === "ppt") return <Presentation className="h-5 w-5 text-neutral-950" />;
    if (ext === "csv" || ext === "xlsx" || ext === "xls") return <FileSpreadsheet className="h-5 w-5 text-neutral-950" />;
    if (ext === "py" || ext === "js" || ext === "ts" || ext === "json" || ext === "sh") return <FileCode className="h-5 w-5 text-neutral-950" />;
    return <FileText className="h-5 w-5 text-neutral-950" />;
  };

  return (
    <div className="w-full flex flex-col gap-4 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2 font-mono text-xs text-neutral-500 font-semibold uppercase tracking-wider">
        <span>FINAL DELIVERABLE // VERIFIED OUTPUT</span>
        <span className="flex items-center gap-1.5 text-neutral-950">
          <CheckSquare className="h-3.5 w-3.5" />
          <span>TASK COMPLETED</span>
        </span>
      </div>

      {filename && (
        <Card className="w-full border-neutral-300 bg-white p-4 sm:p-5 rounded-none shadow-none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-300 bg-neutral-100">
                {getFileIcon(filename)}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs text-neutral-500 font-semibold uppercase">
                  WORKSPACE FILE GENERATED:
                </span>
                <span className="font-mono text-sm font-bold text-neutral-950 break-all">
                  {filename}
                </span>
              </div>
            </div>
            <a
              href={getDownloadUrl(filename)}
              download
              className="inline-flex h-9 items-center justify-center gap-2 bg-neutral-950 px-4 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors w-full sm:w-auto"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File</span>
            </a>
          </div>
        </Card>
      )}

      {codeResult && (
        <Card className="w-full border-neutral-300 bg-white p-4 sm:p-5 rounded-none shadow-none">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-neutral-500 font-semibold">
              EXECUTED CODE / OUTPUT READOUT
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="overflow-x-auto border border-neutral-300 bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-100 selection:bg-neutral-800 selection:text-white">
              <code>{codeResult}</code>
            </pre>
          </CardContent>
        </Card>
      )}

      {output && !filename && !codeResult && (
        <Card className="w-full border-neutral-300 bg-white p-4 sm:p-5 rounded-none shadow-none">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-neutral-500 font-semibold">
              SUMMARY & SYNTHESIS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-sm leading-relaxed text-neutral-900 font-sans whitespace-pre-wrap">
              {output}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
