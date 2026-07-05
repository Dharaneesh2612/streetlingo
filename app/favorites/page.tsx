"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FavItem {
  _id:         string;
  type:        "translate" | "transliterate" | "scan";
  inputText:   string;
  languages:   string[];
  detectedLang: string;
  results:     { language: string; script: string; roman: string }[];
  createdAt:   string;
}

const TYPE_CONFIG = {
  translate:     { label: "Translate",     emoji: "✦" },
  transliterate: { label: "Transliterate", emoji: "⟺" },
  scan:          { label: "Scan",          emoji: "⊙" },
};

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function FavoritesPage() {
  const router = useRouter();
  const [items,    setItems]    = useState<FavItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [toast,    setToast]    = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const fetchFavorites = useCallback(async () => {
    setLoading(true); setFetchErr("");
    try {
      const res  = await fetch("/api/history?favorites=1");
      const json = await res.json();
      if (!json.ok) { setFetchErr(json.error ?? "Failed to load."); return; }
      setItems(json.data.filter((i: FavItem & { isFavorite: boolean }) => i.isFavorite));
    } catch {
      setFetchErr("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  async function unfavorite(id: string) {
    setRemoving(id);
    try {
      const res  = await fetch(`/api/history/${id}/favorite`, { method: "PATCH" });
      const json = await res.json();
      if (!json.ok) { showToast("Failed to update."); return; }
      setItems((prev) => prev.filter((i) => i._id !== id));
      showToast("Removed from favorites.");
    } catch {
      showToast("Network error.");
    } finally {
      setRemoving(null);
    }
  }

  function reuseItem(item: FavItem) {
    sessionStorage.setItem("sl_reuse", JSON.stringify({
      text: item.inputText, langs: item.languages, type: item.type,
    }));
    router.push(item.type === "scan" ? "/scan" : `/${item.type}`);
  }

  return (
    <main className="inner-page inner-page--wide">

      {toast && (
        <div className="toast toast--success" role="status">⭐ {toast}</div>
      )}

      <Link href="/" className="back-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Home
      </Link>

      <div className="page-header">
        <h1 className="page-title">⭐ Favorites</h1>
        <p className="page-sub">Your starred translations saved for quick access</p>
      </div>

      {loading && (
        <div className="hist-loading">
          <span className="spinner" /> Loading favorites…
        </div>
      )}

      {!loading && fetchErr && (
        <div className="error-box" role="alert">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>{fetchErr}</span>
          <button className="retry-btn" onClick={fetchFavorites}>Retry</button>
        </div>
      )}

      {!loading && !fetchErr && items.length === 0 && (
        <div className="hist-empty">
          <span className="hist-empty-icon">⭐</span>
          <p className="hist-empty-title">No favorites yet</p>
          <p className="hist-empty-sub">
            Star any translation from the History page to save it here.
          </p>
          <Link href="/history" className="btn btn--primary" style={{ marginTop: "1rem" }}>
            Go to History
          </Link>
        </div>
      )}

      {!loading && !fetchErr && items.length > 0 && (
        <div className="hist-list">
          <div className="hist-meta-row">
            <span className="history-count">
              {items.length} favorite{items.length !== 1 ? "s" : ""}
            </span>
          </div>

          {items.map((item) => {
            const cfg    = TYPE_CONFIG[item.type];
            const isOpen = expanded === item._id;

            return (
              <div key={item._id} className={`hist-card${isOpen ? " hist-card--open" : ""}`}>

                <div className="hist-card-header" onClick={() => setExpanded(isOpen ? null : item._id)}>
                  <span className="hist-type-badge" style={{ "--htype-color": "hsl(45,90%,55%)" } as React.CSSProperties}>
                    {cfg.emoji} {cfg.label}
                  </span>
                  <p className="hist-input-text">{item.inputText}</p>
                  <div className="hist-card-right">
                    <span className="history-time">{timeAgo(item.createdAt)}</span>
                    <span className={`hist-chevron${isOpen ? " hist-chevron--open" : ""}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </span>
                  </div>
                </div>

                <div className="hist-langs-row">
                  {item.detectedLang !== "Unknown" && (
                    <span className="hist-detected"><strong>{item.detectedLang}</strong> → </span>
                  )}
                  <div className="history-langs">
                    {item.languages.map((l) => <span key={l} className="history-lang">{l}</span>)}
                  </div>
                </div>

                {isOpen && item.results.length > 0 && (
                  <div className="hist-results">
                    {item.results.map((r) => (
                      <div key={r.language} className="hist-result-row">
                        <span className="hist-result-lang">{r.language}</span>
                        <div className="hist-result-body">
                          <p className="hist-result-script">{r.script}</p>
                          {r.roman && <p className="hist-result-roman">{r.roman}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="hist-card-actions">
                  <button className="btn btn--ghost hist-action-btn" onClick={() => reuseItem(item)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" /></svg>
                    Reuse
                  </button>
                  <button
                    className="btn btn--ghost hist-action-btn hist-action-btn--delete"
                    onClick={() => unfavorite(item._id)}
                    disabled={removing === item._id}
                  >
                    {removing === item._id ? <span className="spinner" /> : "★"}
                    {removing === item._id ? "Removing…" : "Unfavorite"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
