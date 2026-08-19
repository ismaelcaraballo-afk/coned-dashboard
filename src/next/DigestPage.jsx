import { useEffect, useMemo, useState } from "react";
import { useBuildings } from "../data/useBuildings.js";
import { useEvents } from "../data/useEvents.js";
import { useStatusCounts } from "../data/useStatusCounts.js";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { buildDigest } from "./buildDigest.js";
import "./DigestPage.css";

/**
 * M12 — Weekly digest compose flow (Fable Spec 5).
 *
 * Draft (C1) is deterministic: buildDigest() assembles subject, HTML, and
 * plain-text twin from the same buildings + model_meta the landing reads.
 * Edit (C2) uses the ledger #14 textarea fallback — honest for single-analyst
 * v1; locked-token editor is a later increment. Send (C3) opens mailto with
 * the text twin or copies HTML/text to clipboard. No SMTP.
 *
 * events.json (M7, useEvents hook) folds into "What changed"; when zero
 * events, the section states "Nothing crossed a threshold since your last
 * review" per D2 — a quiet week is a real result.
 */
export default function DigestPage() {
  return (
    <ErrorBoundary
      label="DigestPage"
      fallback={<div className="dg-error">Digest failed to render. Check console for stack.</div>}
    >
      <DigestPageInner />
    </ErrorBoundary>
  );
}

function DigestPageInner() {
  const [token, setToken] = useState(() => sessionStorage.getItem("coned_token") || null);
  const [modelMeta, setModelMeta] = useState(null);
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    const onStorage = () => setToken(sessionStorage.getItem("coned_token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { buildings, loading, error } = useBuildings(token);
  const { events } = useEvents(token);
  const { counts: statusCounts } = useStatusCounts(buildings, token);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/model_meta", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m) => { if (!cancelled) setModelMeta(m); })
      .catch(() => { /* fall back to defaults inside buildDigest */ });
    return () => { cancelled = true; };
  }, [token]);

  const drafted = useMemo(() => {
    if (!buildings || buildings.length === 0) return null;
    return buildDigest({
      buildings,
      modelMeta,
      events,
      contactedCount: statusCounts?.contacted ?? 0,
      dismissedCount: statusCounts?.dismissed ?? 0,
    });
  }, [buildings, modelMeta, events, statusCounts]);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (drafted) {
      setSubject(drafted.subject);
      setBody(drafted.text);
    }
  }, [drafted]);

  function copy(payload, kind) {
    if (!navigator.clipboard) {
      setCopyState("Clipboard API unavailable in this browser.");
      return;
    }
    navigator.clipboard.writeText(payload).then(
      () => { setCopyState(`Copied ${kind} to clipboard.`); },
      (e) => { setCopyState(`Copy failed: ${e.message}`); }
    );
  }

  function copyHtml() {
    if (!drafted) return;
    copy(drafted.html, "HTML");
  }

  function copyText() {
    copy(body, "plain text");
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="dg-page sc-scope">
      {/* Preview-scaffold header retired 2026-08-19 — surface identity
          comes from the global ProvenanceStrip (D37). Page opens on the
          compose title as its first content block. */}
      <header className="dg-header">
        <h1>Compose weekly digest</h1>
        <p className="dg-lede">
          Draft assembled from the same signals as the This Week landing.
          Edit the plain-text twin on the right, preview the Outlook-legal
          HTML on the left, then open in your mail client or copy to the
          clipboard. No SMTP: the email comes from you (D5).
        </p>
      </header>

      {!token && (
        <div className="dg-empty">
          Sign in at <a href="/legacy">/legacy</a> first — this route reads that session.
        </div>
      )}

      {token && loading && <div className="dg-empty">Loading buildings…</div>}

      {token && error && (
        <div className="dg-empty dg-empty--error">
          {error === "UNAUTHORIZED"
            ? <>Session expired. <a href="/legacy">Log in again.</a></>
            : `Failed to load: ${error}`}
        </div>
      )}

      {token && !loading && !error && drafted && (
        <>
          <div className="dg-toolbar">
            <label className="dg-subject">
              <span>Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <div className="dg-actions">
              <a className="dg-btn" href={mailtoHref}>Open in mail client</a>
              <button className="dg-btn" onClick={copyHtml}>Copy HTML</button>
              <button className="dg-btn" onClick={copyText}>Copy plain text</button>
            </div>
          </div>

          {copyState && <div className="dg-flash">{copyState}</div>}

          <div className="dg-workbench">
            <div className="dg-preview">
              <div className="dg-preview-label">HTML preview · as it lands in Outlook</div>
              <div className="dg-preview-frame">
                <div dangerouslySetInnerHTML={{ __html: drafted.html }} />
              </div>
            </div>

            <div className="dg-editor">
              <div className="dg-editor-label">
                Plain-text twin · editable (ledger #14 fallback)
              </div>
              <textarea
                className="dg-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                spellCheck
                rows={40}
              />
              <p className="dg-note">
                V1 trusts the analyst with a plain textarea. Locked-token
                editing (C2) is a later increment — until then, edit numbers
                only if you've verified them against the case files.
              </p>
            </div>
          </div>

          <footer className="dg-footer">
            <div>
              To review: <b>{drafted.toReview}</b> ·
              Critical: <b>{drafted.pulse.critical}</b> ·
              Portfolio: <b>{drafted.pulse.total}</b>
              {Array.isArray(events) && (
                <> · Events: <b>{events.length}</b></>
              )}
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
