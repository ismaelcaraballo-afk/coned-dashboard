import { useState } from "react";

/**
 * Download / Email actions for the reasoning report.
 *
 * Follows the digest compose pattern (DigestPage.jsx): no SMTP, no server
 * send. Download hits /api/report/:bbl.pdf with the bearer token and saves
 * the returned Buffer as a blob. Email downloads first, then opens
 * mailto: so the user can drag the freshly-saved PDF into the compose
 * window. `mailto:` URLs cannot carry attachments — this is the honest
 * two-step (D5, "the email comes from you").
 */
export default function ReportActions({ bbl, address, reportId }) {
  const [state, setState] = useState(null); // { kind: "info"|"error", msg: string }

  async function fetchPdf() {
    const token = sessionStorage.getItem("coned_token");
    if (!token) throw new Error("Session expired — sign in again.");
    const res = await fetch(`/api/report/${encodeURIComponent(bbl)}.pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`PDF render failed (HTTP ${res.status})`);
    return res.blob();
  }

  function saveBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${bbl}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onDownload() {
    setState({ kind: "info", msg: "Rendering PDF…" });
    try {
      const blob = await fetchPdf();
      saveBlob(blob);
      setState({ kind: "info", msg: "Saved to Downloads." });
    } catch (err) {
      setState({ kind: "error", msg: err.message });
    }
  }

  async function onEmail() {
    setState({ kind: "info", msg: "Rendering PDF…" });
    try {
      const blob = await fetchPdf();
      saveBlob(blob);
      const subject = `Reasoning report · ${address ?? bbl}${reportId ? ` · ${reportId}` : ""}`;
      const body = [
        `Attaching the reasoning report for ${address ?? bbl}.`,
        "",
        `File: report-${bbl}.pdf (just saved to your Downloads folder — drag into this window to attach).`,
        "",
        "— Pursuit × ConEd Steam Ops",
      ].join("\n");
      const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = href;
      setState({ kind: "info", msg: "PDF saved. Drag it into the Mail window to attach." });
    } catch (err) {
      setState({ kind: "error", msg: err.message });
    }
  }

  return (
    <div className="rp-actions">
      <button type="button" className="rp-action" onClick={onDownload}>
        Download PDF
      </button>
      <button type="button" className="rp-action" onClick={onEmail}>
        Email PDF
      </button>
      {state && (
        <span className={`rp-action-flash ${state.kind === "error" ? "rp-action-flash--err" : ""}`}>
          {state.msg}
        </span>
      )}
    </div>
  );
}
