"use client";

import { useState } from "react";
import { getDownloadUrl } from "@/lib/api";
import { FileText, FileSpreadsheet, Presentation, FileCode, Download, Bot, Copy, Check } from "lucide-react";

export default function OutputPanel({
  output,
  filename,
  codeResult,
}: {
  output?: string;
  filename?: string | null;
  codeResult?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const getFileIcon = (fname: string) => {
    const ext = fname.split(".").pop()?.toLowerCase();
    if (ext === "pptx" || ext === "ppt") return <Presentation className="h-4 w-4 text-blue-600" />;
    if (ext === "csv" || ext === "xlsx" || ext === "xls") return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
    if (ext === "py" || ext === "js" || ext === "ts" || ext === "json" || ext === "sh") return <FileCode className="h-4 w-4 text-indigo-600" />;
    return <FileText className="h-4 w-4 text-blue-600" />;
  };

  const handleCopyCode = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Detect code snippet from string content
  const isCodeSnippet = (text: string) => {
    if (text.includes("```")) return true;
    const codeKeywords = ["def ", "import ", "if __name__", "print(", "class ", "public class", "void main", "System.out.print", "num = ", "% 2 ==", "return "];
    const matchCount = codeKeywords.filter((kw) => text.includes(kw)).length;
    return matchCount >= 2;
  };

  const displayCode = codeResult || (output && isCodeSnippet(output) ? output : null);
  const displayText = output && !isCodeSnippet(output) && !codeResult ? output : null;

  // Clean raw markdown backticks if present
  const cleanCode = displayCode ? displayCode.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim() : "";

  // Guess language
  const guessLanguage = (code: string) => {
    if (code.includes("public class") || code.includes("System.out") || code.includes("void main")) return "java";
    if (code.includes("def ") || code.includes("print(") || code.includes("import os")) return "python";
    if (code.includes("const ") || code.includes("function") || code.includes("console.log")) return "javascript";
    return "code";
  };

  return (
    <div className="w-full flex gap-3 text-slate-900 font-sans pt-1">
      {/* Bot Avatar Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs mt-0.5">
        <Bot className="h-4.5 w-4.5" />
      </div>

      <div className="flex flex-col gap-3 flex-1 min-w-0">
        {/* Regular Text Response */}
        {displayText && (
          <div className="text-sm leading-relaxed text-slate-800 font-sans whitespace-pre-wrap">
            {displayText}
          </div>
        )}

        {/* 100% Light Theme Code Block Container */}
        {displayCode && (
          <div className="w-full flex flex-col rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs my-1 font-mono text-xs">
            {/* Light Header bar with language & copy button */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 text-[11px] text-slate-700">
              <span className="font-semibold text-slate-800 uppercase tracking-wider font-mono">
                {guessLanguage(cleanCode)}
              </span>
              <button
                onClick={() => handleCopyCode(cleanCode)}
                className="flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer text-slate-600 font-medium"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied!" : "Copy code"}</span>
              </button>
            </div>

            {/* Light Syntax Highlighted Code Content */}
            <HighlightedCode code={cleanCode} />
          </div>
        )}

        {/* Generated Workspace File Download Card */}
        {filename && (
          <div className="w-fit border border-slate-200 bg-white p-3 rounded-xl shadow-2xs hover:border-slate-300 transition-all mt-1">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 border border-slate-200">
                {getFileIcon(filename)}
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold text-slate-900 truncate max-w-xs">
                  {filename}
                </span>
                <span className="text-[10px] text-slate-400">Generated File</span>
              </div>
              <a
                href={getDownloadUrl(filename)}
                download
                className="ml-2 inline-flex h-8 items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 px-3.5 rounded-lg text-xs font-medium text-white transition-all shadow-2xs cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Download</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightedCode({ code }: { code: string }) {
  const lines = code.split("\n");

  return (
    <div className="font-mono text-xs leading-relaxed overflow-x-auto p-4 bg-slate-50/60 text-slate-900 select-text">
      {lines.map((line, idx) => (
        <div key={idx} className="flex gap-4 min-w-max hover:bg-slate-200/40 px-1 rounded transition-colors">
          <span className="w-6 text-right select-none text-[11px] text-slate-400 font-normal shrink-0">
            {idx + 1}
          </span>
          <pre className="font-mono text-slate-900 leading-normal whitespace-pre font-normal">
            {tokenizeLine(line)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function tokenizeLine(line: string) {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
    return <span className="text-slate-400 italic font-sans">{line}</span>;
  }

  // Tokens: Strings, Keywords, Builtins/Types, Numbers
  const regex = /(".*?"|'.*?'|\/\/.*$|#.*$|\b(?:public|class|static|void|int|double|float|boolean|String|if|else|return|import|package|def|for|while|try|catch|new|const|let|var|function|true|false|null)\b|\b(?:System|out|println|print|Math|Scanner)\b|\b\d+\b)/g;

  const parts = line.split(regex);
  return parts.map((part, i) => {
    if (!part) return null;

    if (part.startsWith("//") || part.startsWith("#")) {
      return <span key={i} className="text-slate-400 italic">{part}</span>;
    }
    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
      return <span key={i} className="text-emerald-700 font-semibold">{part}</span>;
    }
    if (/^\b(?:public|class|static|void|int|double|float|boolean|String|if|else|return|import|package|def|for|while|try|catch|new|const|let|var|function|true|false|null)\b$/.test(part)) {
      return <span key={i} className="text-blue-700 font-bold">{part}</span>;
    }
    if (/^\b(?:System|out|println|print|Math|Scanner)\b$/.test(part)) {
      return <span key={i} className="text-indigo-600 font-semibold">{part}</span>;
    }
    if (/^\d+$/.test(part)) {
      return <span key={i} className="text-amber-700 font-semibold">{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}







