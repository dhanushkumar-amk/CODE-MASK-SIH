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
    if (ext === "pptx" || ext === "ppt") return <Presentation className="h-5 w-5 text-blue-600" />;
    if (ext === "csv" || ext === "xlsx" || ext === "xls") return <FileSpreadsheet className="h-5 w-5 text-blue-600" />;
    if (ext === "py" || ext === "js" || ext === "ts" || ext === "json" || ext === "sh") return <FileCode className="h-5 w-5 text-blue-600" />;
    return <FileText className="h-5 w-5 text-blue-600" />;
  };

  return (
    <div className="w-full flex flex-col gap-4 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-mono text-xs text-slate-500 font-semibold uppercase tracking-wider">
        <span className="font-extrabold text-slate-900">
          FINAL DELIVERABLE <span className="text-blue-600">//</span> VERIFIED OUTPUT
        </span>
        <span className="flex items-center gap-1.5 text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <span>TASK COMPLETED</span>
        </span>
      </div>

      {filename && (
        <Card className="w-full border-blue-100/90 bg-white p-5 sm:p-6 rounded-2xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-200/80 bg-blue-50/80">
                {getFileIcon(filename)}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs text-blue-600 font-bold uppercase tracking-wider">
                  WORKSPACE FILE GENERATED:
                </span>
                <span className="font-mono text-sm font-bold text-slate-900 break-all">
                  {filename}
                </span>
              </div>
            </div>
            <a
              href={getDownloadUrl(filename)}
              download
              className="inline-flex h-10 items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 rounded-xl font-mono text-xs font-bold uppercase tracking-wider text-white hover:from-blue-700 hover:to-indigo-700 transition-all w-full sm:w-auto shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download File</span>
            </a>
          </div>
        </Card>
      )}

      {codeResult && (
        <Card className="w-full border-blue-100/90 bg-white p-5 sm:p-6 rounded-2xl shadow-xs">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-blue-600 font-bold">
              EXECUTED CODE / OUTPUT READOUT
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="overflow-x-auto border border-slate-800 bg-slate-950 p-4.5 rounded-xl font-mono text-xs leading-relaxed text-slate-100 selection:bg-blue-600 selection:text-white">
              <code>{codeResult}</code>
            </pre>
          </CardContent>
        </Card>
      )}

      {output && !filename && !codeResult && (
        <Card className="w-full border-blue-100/90 bg-white p-5 sm:p-6 rounded-2xl shadow-xs">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-blue-600 font-bold">
              SUMMARY & SYNTHESIS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-sm leading-relaxed text-slate-900 font-sans whitespace-pre-wrap">
              {output}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

