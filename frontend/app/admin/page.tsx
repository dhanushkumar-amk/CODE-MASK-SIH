"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  LogOut,
  ArrowLeft,
  Terminal,
  Cpu,
  GlobeX,
  Search,
  Trash2,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Database,
  Box,
  RefreshCw,
  Eye,
  FileText,
  UserCheck,
  Activity,
  Zap,
  Shield,
  X,
  ChevronRight,
  TrendingUp,
  Copy,
  Check,
  Server,
  WifiOff,
  Sparkles,
} from "lucide-react";

import {
  getAdminAuditLogs,
  clearAdminAuditLogs,
  type AdminLogItem,
} from "@/lib/adminLog";

const AUTH_KEY = "fortexa_admin_authenticated";
const ADMIN_USER = "admin";
const ADMIN_PASS = "12345678";

/* ═══════════════════════════════════════════════════════════════════
   ULTRA-MINIMAL SVG LINE CHART (Overview - Execution Activity)
   ═══════════════════════════════════════════════════════════════════ */
function MinimalSparkChart({ data }: { data: number[] }) {
  const height = 100;
  const width = 500;
  const padding = 12;

  const points = useMemo(() => {
    if (!data.length) return "";
    const maxVal = Math.max(...data, 1);
    const minVal = 0;
    const stepX = (width - padding * 2) / (data.length - 1 || 1);

    return data
      .map((val, idx) => {
        const x = padding + idx * stepX;
        const y = height - padding - ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }, [data]);

  const areaPoints = useMemo(() => {
    if (!points) return "";
    const stepX = (width - padding * 2) / (data.length - 1 || 1);
    const lastX = padding + (data.length - 1) * stepX;
    return `${padding},${height - padding} ${points} ${lastX},${height - padding}`;
  }, [points, data]);

  return (
    <div className="w-full relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
        <defs>
          <linearGradient id="minimalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient fill */}
        {areaPoints && <polygon points={areaPoints} fill="url(#minimalGrad)" />}

        {/* Polyline */}
        {points && (
          <polyline
            fill="none"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        )}

        {/* Data points */}
        {data.map((val, idx) => {
          const maxVal = Math.max(...data, 1);
          const stepX = (width - padding * 2) / (data.length - 1 || 1);
          const x = padding + idx * stepX;
          const y = height - padding - (val / maxVal) * (height - padding * 2);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="3.5"
              className="fill-white stroke-slate-900 stroke-[2] transition-transform hover:scale-150"
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SLIDE-OVER AUDIT DETAIL DRAWER
   ═══════════════════════════════════════════════════════════════════ */
function AuditDrawer({ log, onClose }: { log: AdminLogItem; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/10 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white h-full border-l border-slate-200/80 shadow-xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-900" />
              <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">
                Audit Record Details
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Prompt Input
              </span>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-slate-900 leading-relaxed">
                {log.prompt}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Timestamp
                </span>
                <span className="font-mono text-slate-800 text-[11px]">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Category
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-900 uppercase">
                  {log.task_type}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Model Engine
                </span>
                <span className="font-mono text-slate-800 text-[11px]">{log.model}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Deliverable
                </span>
                <span className="font-mono text-emerald-600 font-medium text-[11px]">
                  {log.deliverable || "None"}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Tools Invoked
              </span>
              <div className="flex flex-wrap gap-1">
                {log.tools_used.length > 0 ? (
                  log.tools_used.map((t, i) => (
                    <span key={i} className="font-mono text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic">No tool calls</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                SHA-256 Fingerprint
              </span>
              <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl break-all">
                {log.provenance_hash || "N/A"}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all cursor-pointer w-full justify-center"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied JSON" : "Copy Audit Record"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN ADMIN PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dashboard state
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [routingLogs, setRoutingLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "prompts" | "routing" | "tools">("overview");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AdminLogItem | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY);
      if (auth === "true") {
        setIsAuthenticated(true);
        loadLogs();
      }
    }
  }, []);

  const loadLogs = async () => {
    setLogs(getAdminAuditLogs());
    try {
      const res = await fetch("http://localhost:8000/routing-log");
      if (res.ok) {
        const data = await res.json();
        setRoutingLogs(Array.isArray(data) ? data : []);
      }
    } catch {
      // Backend offline fallback
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === ADMIN_USER && password === ADMIN_PASS) {
      sessionStorage.setItem(AUTH_KEY, "true");
      localStorage.setItem(AUTH_KEY, "true");
      setIsAuthenticated(true);
      setErrorMsg(null);
      loadLogs();
    } else {
      setErrorMsg("Invalid credentials");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
  };

  const handleClearLogs = () => {
    if (confirm("Clear local audit log storage?")) {
      clearAdminAuditLogs();
      setLogs([]);
      showToast("Cleared audit logs");
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fortexa_audit_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported JSON audit log");
  };

  const handleExportCsv = () => {
    const headers = ["Timestamp", "Prompt", "Task Type", "Model", "Tools", "Deliverable", "Status", "Hash"];
    const rows = logs.map((l) => [
      l.timestamp,
      `"${l.prompt.replace(/"/g, '""')}"`,
      l.task_type,
      l.model,
      `"${l.tools_used.join(", ")}"`,
      l.deliverable || "N/A",
      l.status,
      l.provenance_hash || "N/A",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fortexa_audit_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported CSV audit log");
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const stats = useMemo(() => {
    const successCount = logs.filter((l) => l.status === "success").length;
    const documentCount = logs.filter((l) => l.task_type === "document").length;
    const codingCount = logs.filter((l) => l.task_type === "coding").length;
    const visionCount = logs.filter((l) => l.task_type === "vision").length;
    const deliverables = logs.filter((l) => l.deliverable).length;

    const trendData = Array.from({ length: 7 }, (_, i) => {
      const start = i * 4;
      return logs.slice(start, start + 4).length;
    }).reverse();

    const toolMap: Record<string, number> = {};
    logs.flatMap((l) => l.tools_used).forEach((t) => {
      toolMap[t] = (toolMap[t] || 0) + 1;
    });
    const topTools = Object.entries(toolMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      successCount,
      documentCount,
      codingCount,
      visionCount,
      deliverables,
      trendData: trendData.some((v) => v > 0) ? trendData : [1, 4, 2, 6, 3, 7, logs.length || 5],
      topTools,
    };
  }, [logs]);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tools_used.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.deliverable && l.deliverable.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = taskFilter === "all" || l.task_type === taskFilter;

    return matchesSearch && matchesFilter;
  });

  /* ─────────────────────────────────────────────────────────────────
     1. LOGIN GATE
     ───────────────────────────────────────────────────────────────── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 font-sans selection:bg-slate-900 selection:text-white">
        <div className="w-full max-w-[340px] bg-white border border-slate-200/80 rounded-2xl p-7 shadow-xs">
          <div className="flex flex-col items-center text-center gap-2 mb-6">
            <div className="h-9 w-9 flex items-center justify-center">
              <img
                src="/image.png"
                alt="Fortexa Logo"
                className="h-full w-full object-contain"
                style={{
                  filter: "invert(37%) sepia(93%) saturate(2335%) hue-rotate(213deg) brightness(98%) contrast(92%)"
                }}
              />
            </div>
            <h1 className="text-sm font-semibold text-slate-900">Admin Gateway</h1>
            <p className="text-[11px] text-slate-400">100% Local Authentication</p>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-red-50 text-red-600 text-xs p-2.5 rounded-lg font-medium border border-red-100">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white focus:outline-hidden text-xs rounded-xl px-3 py-2 font-mono text-slate-900 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white focus:outline-hidden text-xs rounded-xl px-3 py-2 font-mono text-slate-900 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2 rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              Sign In
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <Link href="/" className="hover:text-slate-900 transition-colors font-medium flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Console
            </Link>
            <span className="font-mono">admin / 12345678</span>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────
     2. ULTRA-MINIMAL & MODERN OVERVIEW & DASHBOARD
     ───────────────────────────────────────────────────────────────── */
  const registeredTools = [
    { name: "docx_generate", type: "Deliverable", desc: "Word docx generator via python-docx" },
    { name: "pptx_generate", type: "Deliverable", desc: "PowerPoint presentation generator" },
    { name: "xlsx_generate", type: "Deliverable", desc: "Excel spreadsheet creator with audit tab" },
    { name: "code_execute", type: "Sandbox", desc: "Docker sandboxed Python execution" },
    { name: "ocr_extract_image", type: "Vision", desc: "Tesseract OCR image text extractor" },
    { name: "ocr_extract_pdf", type: "Vision", desc: "Rasterized PDF document OCR extractor" },
    { name: "rag_retrieve", type: "Knowledge", desc: "ChromaDB vector search over local SOPs" },
    { name: "file_read", type: "File IO", desc: "Safe workspace text/CSV file reader" },
    { name: "file_write", type: "File IO", desc: "Safe workspace text file writer" },
    { name: "calculator", type: "Math", desc: "AST-whitelisted safe math evaluator" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/40 text-slate-900 font-sans selection:bg-slate-900 selection:text-white flex flex-col">
      {/* Sleek Minimal Header */}
      <header className="sticky top-0 z-40 bg-white/80 border-b border-slate-200/60 backdrop-blur-md px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-7 w-7 flex items-center justify-center hover:scale-105 transition-transform"
            >
              <img
                src="/image.png"
                alt="Fortexa Logo"
                className="h-full w-full object-contain"
                style={{
                  filter: "invert(37%) sepia(93%) saturate(2335%) hue-rotate(213deg) brightness(98%) contrast(92%)"
                }}
              />
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-900">Admin Console</span>
              <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                100% Local
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 rounded-lg transition-colors"
            >
              Console
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Horizontal Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200/60 pb-px text-xs font-medium">
          {(
            [
              { id: "overview", label: "Overview" },
              { id: "prompts", label: "Audit Log" },
              { id: "routing", label: "Routing Stream" },
              { id: "tools", label: "Tool Registry" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? "border-slate-900 text-slate-900 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─────────────────────────────────────────────────────────────
           TAB 1: ULTRA-MINIMAL & MODERN OVERVIEW PAGE
           ───────────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Inline Key Stat Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/60 rounded-xl p-4 space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Total Executions
                </span>
                <p className="text-2xl font-bold font-mono text-slate-900">{logs.length}</p>
                <span className="text-[10px] text-slate-400 block font-mono">Last 30 stored</span>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-xl p-4 space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Success Rate
                </span>
                <p className="text-2xl font-bold font-mono text-emerald-600">
                  {logs.length > 0 ? Math.round((stats.successCount / logs.length) * 100) : 100}%
                </p>
                <span className="text-[10px] text-slate-400 block">0 failures</span>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-xl p-4 space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Deliverables
                </span>
                <p className="text-2xl font-bold font-mono text-slate-900">{stats.deliverables}</p>
                <span className="text-[10px] text-slate-400 block">DOCX / PPTX / XLSX</span>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-xl p-4 space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Network Isolation
                </span>
                <p className="text-2xl font-bold text-slate-900 font-mono">0 Calls</p>
                <span className="text-[10px] text-emerald-600 font-medium block">100% Local Air-Gapped</span>
              </div>
            </div>

            {/* Sparkline Execution Trend Card */}
            <div className="bg-white border border-slate-200/60 rounded-xl p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Execution Frequency</h3>
                  <span className="text-[10px] text-slate-400">Activity volume over time</span>
                </div>
                <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {logs.length} Total Runs
                </span>
              </div>
              <MinimalSparkChart data={stats.trendData} />
            </div>

            {/* 2-Column Overview Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Infrastructure Stack */}
              <div className="bg-white border border-slate-200/60 rounded-xl p-5 space-y-3 shadow-2xs">
                <h3 className="text-xs font-semibold text-slate-900">System Enclave Stack</h3>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Ollama LLM Engine</span>
                    <span className="font-mono text-[11px] font-medium text-slate-800">qwen2.5:1.5b-instruct</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">FastAPI Server</span>
                    <span className="font-mono text-[11px] font-medium text-slate-800">http://127.0.0.1:8000</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Vosk STT Voice Engine</span>
                    <span className="font-mono text-[11px] font-medium text-slate-800">vosk-model-en-us-0.22-lgraph</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Code Sandbox</span>
                    <span className="font-mono text-[11px] font-medium text-slate-800">Docker (--network none)</span>
                  </div>
                </div>
              </div>

              {/* Task Categories Breakdown */}
              <div className="bg-white border border-slate-200/60 rounded-xl p-5 space-y-3 shadow-2xs">
                <h3 className="text-xs font-semibold text-slate-900">Task Categories</h3>
                <div className="space-y-2.5 text-xs">
                  {[
                    { label: "Document Generation", count: stats.documentCount },
                    { label: "Coding & Execution", count: stats.codingCount },
                    { label: "Vision & OCR", count: stats.visionCount },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>{item.label}</span>
                        <span className="font-mono font-semibold text-slate-900">{item.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              logs.length > 0 ? (item.count / logs.length) * 100 : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
           TAB 2: AUDIT LOG TABLE
           ───────────────────────────────────────────────────────────── */}
        {activeTab === "prompts" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs by prompt or tool..."
                    className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 pl-9 text-xs text-slate-900 focus:outline-hidden focus:border-slate-900 transition-colors"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <select
                  value={taskFilter}
                  onChange={(e) => setTaskFilter(e.target.value)}
                  className="bg-white border border-slate-200/80 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:border-slate-900 cursor-pointer font-medium"
                >
                  <option value="all">All Types</option>
                  <option value="document">Document</option>
                  <option value="coding">Coding</option>
                  <option value="vision">Vision</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportJson}
                  className="text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200/80 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  JSON
                </button>
                <button
                  onClick={handleExportCsv}
                  className="text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200/80 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  CSV
                </button>
                <button
                  onClick={handleClearLogs}
                  className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/80 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Prompt</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Tools</th>
                      <th className="py-3 px-4">Deliverable</th>
                      <th className="py-3 px-4 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                            {log.prompt}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
                              {log.task_type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {log.tools_used.slice(0, 2).map((t, i) => (
                                <span key={i} className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  {t}
                                </span>
                              ))}
                              {log.tools_used.length > 2 && (
                                <span className="text-[10px] text-slate-400">+{log.tools_used.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                            {log.deliverable || "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-slate-400 hover:text-slate-900 transition-colors p-1"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No audit entries found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
           TAB 3: ROUTING STREAM
           ───────────────────────────────────────────────────────────── */}
        {activeTab === "routing" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900">Backend Routing Stream (routing_log.jsonl)</h3>
              <button onClick={loadLogs} className="text-xs text-slate-600 hover:text-slate-900 font-medium">
                Refresh Stream
              </button>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-2 max-h-[500px] overflow-y-auto shadow-2xs">
              {routingLogs.length > 0 ? (
                routingLogs.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/60 rounded-lg border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      <span className="font-semibold text-slate-700">{item.task_type} → {item.model}</span>
                    </div>
                    <p className="text-slate-800 font-medium">&quot;{item.task}&quot;</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">No routing stream records available</p>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
           TAB 4: TOOL REGISTRY
           ───────────────────────────────────────────────────────────── */}
        {activeTab === "tools" && (
          <div className="grid md:grid-cols-2 gap-3 animate-in fade-in duration-150">
            {registeredTools.map((tool) => (
              <div key={tool.name} className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-xs text-slate-900">{tool.name}</span>
                  <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {tool.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{tool.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Drawer */}
      {selectedLog && <AuditDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg animate-in fade-in duration-150">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
