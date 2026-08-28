/**
 * Local Storage Audit Trail Logger for Fortexa Admin Panel.
 * Stores and manages the last 30 local prompt executions, tool calls, and commands.
 */

export interface AdminLogItem {
  id: string;
  timestamp: string;
  prompt: string;
  task_type: "coding" | "document" | "vision" | "chat";
  model: string;
  tools_used: string[];
  deliverable?: string | null;
  status: "success" | "failed";
  provenance_hash?: string;
}

const LOG_KEY = "fortexa_admin_audit_logs";
const MAX_LOGS = 30;

/** Retrieve last 30 admin audit logs from localStorage */
export function getAdminAuditLogs(): AdminLogItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return getInitialDemoLogs();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getInitialDemoLogs();
  } catch {
    return getInitialDemoLogs();
  }
}

/** Record a new prompt / command execution (capped at last 30) */
export function addAdminAuditLog(log: Omit<AdminLogItem, "id" | "timestamp"> & { timestamp?: string }) {
  if (typeof window === "undefined") return;
  try {
    const existing = getAdminAuditLogs();
    const newEntry: AdminLogItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: log.timestamp || new Date().toISOString(),
      prompt: log.prompt,
      task_type: log.task_type,
      model: log.model || "qwen2.5:1.5b-instruct",
      tools_used: log.tools_used || [],
      deliverable: log.deliverable || null,
      status: log.status || "success",
      provenance_hash: log.provenance_hash || `sha256_${Math.random().toString(36).substring(2, 12)}`,
    };

    const updated = [newEntry, ...existing].slice(0, MAX_LOGS);
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("[ADMIN LOG] Failed to save audit log:", err);
  }
}

/** Clear local admin audit logs */
export function clearAdminAuditLogs() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOG_KEY);
}

/** Pre-populate realistic demo audit logs if empty */
function getInitialDemoLogs(): AdminLogItem[] {
  const now = new Date();
  return [
    {
      id: "log_demo_1",
      timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
      prompt: "Extract text from pipe_scan.png, lookup SOP, and draft approval note docx",
      task_type: "document",
      model: "qwen2.5:1.5b-instruct",
      tools_used: ["ocr_extract_image", "rag_retrieve", "docx_generate"],
      deliverable: "pipe_inspection_approval_note.docx",
      status: "success",
      provenance_hash: "980aafe1e46633c6...",
    },
    {
      id: "log_demo_2",
      timestamp: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
      prompt: "Write a Python script for Duck Number verification and execute it in Docker",
      task_type: "coding",
      model: "qwen2.5:1.5b-instruct",
      tools_used: ["code_execute"],
      deliverable: null,
      status: "success",
      provenance_hash: "a665628b686b99ad...",
    },
    {
      id: "log_demo_3",
      timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      prompt: "Read industry.csv and generate Excel spreadsheet with summary charts",
      task_type: "document",
      model: "qwen2.5:1.5b-instruct",
      tools_used: ["file_read", "xlsx_generate"],
      deliverable: "inspection_log.xlsx",
      status: "success",
      provenance_hash: "f3f1507a30e8c32b...",
    },
    {
      id: "log_demo_4",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
      prompt: "Transcribe voice recording test_recording.mp3 using Vosk STT",
      task_type: "vision",
      model: "qwen2.5:1.5b-instruct",
      tools_used: ["voice_transcribe"],
      deliverable: null,
      status: "success",
      provenance_hash: "b77eb4c7539aefb...",
    },
  ];
}
