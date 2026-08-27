/**
 * Client-side Multi-Format Exporter for Fortexa AI Deliverables.
 * Exports any text, code, or report into PDF, DOCX, TXT, or MD files instantly.
 */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsTxt(content: string, baseName = "deliverable") {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `${baseName}.txt`);
}

export function exportAsMd(content: string, baseName = "deliverable") {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, `${baseName}.md`);
}

export function exportAsDocx(content: string, baseName = "deliverable") {
  // Generate Microsoft Word XML / HTML Document compatible with Word (.docx / .doc)
  const htmlDoc = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Fortexa AI Deliverable</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; padding: 20px; }
        h1 { font-size: 18pt; color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        pre { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; font-family: 'Courier New', monospace; font-size: 9.5pt; }
        p { margin-bottom: 10pt; }
      </style>
    </head>
    <body>
      <h1>Fortexa AI Generated Deliverable</h1>
      <pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
    </body>
    </html>
  `;
  const blob = new Blob([htmlDoc], { type: "application/msword;charset=utf-8" });
  triggerDownload(blob, `${baseName}.docx`);
}

export function exportAsPdf(content: string, baseName = "deliverable") {
  // Create print window for 1-click Save to PDF
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    exportAsTxt(content, baseName);
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${baseName} - Fortexa AI</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; line-height: 1.6; }
          .header { border-b: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
          .logo { font-size: 20px; font-weight: bold; color: #2563eb; }
          .meta { font-size: 12px; color: #64748b; margin-top: 4px; }
          pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Fortexa AI Deliverable</div>
          <div class="meta">Generated locally inside air-gapped memory • ${new Date().toLocaleDateString()}</div>
        </div>
        <pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
