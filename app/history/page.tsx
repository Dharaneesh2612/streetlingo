"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface DBHistoryItem {
  _id:         string;
  type:        "translate" | "transliterate" | "scan";
  inputText:   string;
  languages:   string[];
  detectedLang: string;
  results:     { language: string; script: string; roman: string }[];
  isFavorite:  boolean;
  createdAt:   string;
}

type FilterType = "all" | "translate" | "transliterate" | "scan";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const TYPE_CONFIG = {
  translate:      { label: "Translate",      emoji: "✦", color: "var(--accent)" },
  transliterate:  { label: "Transliterate",  emoji: "⟺", color: "hsl(200,80%,65%)" },
  scan:           { label: "Scan",           emoji: "⊙", color: "hsl(152,56%,50%)" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const show = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  }, []);
  return { toast, show };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function HistoryPage() {
  const router = useRouter();
  const [items,      setItems]      = useState<DBHistoryItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchErr,   setFetchErr]   = useState("");
  const [filter,     setFilter]     = useState<FilterType>("all");
  const [search,     setSearch]     = useState("");
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const { toast, show: showToast }  = useToast();

  async function toggleFavorite(id: string) {
    try {
      const res  = await fetch(`/api/history/${id}/favorite`, { method: "PATCH" });
      const json = await res.json();
      if (!json.ok) { showToast("Failed to update.", "error"); return; }
      setItems((prev) => prev.map((i) =>
        i._id === id ? { ...i, isFavorite: json.isFavorite } : i
      ));
      showToast(json.isFavorite ? "★ Added to favorites!" : "Removed from favorites.");
    } catch {
      showToast("Network error.", "error");
    }
  }

  /* ── Fetch from DB or localStorage ── */
  const fetchHistory = useCallback(async () => {
    setLoading(true); setFetchErr("");
    try {
      const res  = await fetch("/api/history");
      const json = await res.json();
      if (!json.ok) { setFetchErr(json.error ?? "Failed to load history."); return; }
      
      // If DB returns data, use it
      if (json.data && json.data.length > 0) {
        setItems(json.data);
        return;
      }
      
      // Fallback: load from localStorage for guests
      const localData = localStorage.getItem("sl_history");
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            const converted: DBHistoryItem[] = parsed.map((item: {
              id: number; text: string; langs: string[]; result: {
                original: string; detectedLang: string; results: { language: string; script: string; roman: string }[];
              }; time: string;
            }) => ({
              _id: item.id.toString(),
              type: "translate",
              inputText: item.text,
              languages: item.langs,
              detectedLang: item.result.detectedLang || "Unknown",
              results: item.result.results || [],
              isFavorite: false,
              createdAt: new Date().toISOString(),
            }));
            setItems(converted);
            return;
          }
        } catch { /* ignore */ }
      }
      
      // No data found
      setItems([]);
    } catch {
      // On network error, try localStorage fallback
      const localData = localStorage.getItem("sl_history");
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            const converted: DBHistoryItem[] = parsed.map((item: {
              id: number; text: string; langs: string[]; result: {
                original: string; detectedLang: string; results: { language: string; script: string; roman: string }[];
              }; time: string;
            }) => ({
              _id: item.id.toString(),
              type: "translate",
              inputText: item.text,
              languages: item.langs,
              detectedLang: item.result.detectedLang || "Unknown",
              results: item.result.results || [],
              isFavorite: false,
              createdAt: new Date().toISOString(),
            }));
            setItems(converted);
            setFetchErr("");
            return;
          }
        } catch { /* ignore */ }
      }
      setFetchErr("Network error. Could not load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  /* ── Delete ── */
  async function deleteItem(id: string) {
    setDeleting(id);
    try {
      const res  = await fetch(`/api/history/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) { showToast(json.error ?? "Delete failed.", "error"); return; }
      setItems((prev) => prev.filter((i) => i._id !== id));
      if (expanded === id) setExpanded(null);
      showToast("Deleted.");
    } catch {
      showToast("Network error.", "error");
    } finally {
      setDeleting(null);
    }
  }

  /* ── Reuse item ── */
  function reuseItem(item: DBHistoryItem) {
    if (item.type === "translate" || item.type === "transliterate") {
      sessionStorage.setItem("sl_reuse", JSON.stringify({
        text: item.inputText, langs: item.languages, type: item.type,
      }));
      router.push(item.type === "translate" ? "/translate" : "/transliterate");
    } else {
      router.push("/scan");
    }
  }

  /* ── Filter + Search ── */
  const filtered = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((i) => i.type === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) =>
        i.inputText.toLowerCase().includes(q) ||
        i.languages.some((l) => l.toLowerCase().includes(q)) ||
        i.detectedLang.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, search]);

  /* ── Counts per type ── */
  const counts = useMemo(() => ({
    all:           items.length,
    translate:     items.filter((i) => i.type === "translate").length,
    transliterate: items.filter((i) => i.type === "transliterate").length,
    scan:          items.filter((i) => i.type === "scan").length,
  }), [items]);

  return (
    <main className="inner-page inner-page--wide">

      {/* Toast */}
      {toast && (
        <div className={`toast toast--${toast.type === "error" ? "info" : "success"}`} role="status">
          {toast.type === "error" ? <WarnIcon /> : <CheckIcon />} {toast.msg}
        </div>
      )}

      {/* Back */}
      <Link href="/" className="back-btn"><ChevronIcon /> Back to Home</Link>

      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">History</h1>
        <p className="page-sub">All your past translations, transliterations and scans — stored in the cloud</p>
      </div>

      {/* Search bar */}
      <div className="hist-search-wrap">
        <SearchIcon />
        <input
          className="hist-search"
          type="text"
          placeholder="Search by text, language…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="hist-search-clear" onClick={() => setSearch("")} title="Clear">✕</button>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="hist-filter-tabs">
        {(["all", "translate", "transliterate", "scan"] as FilterType[]).map((t) => (
          <button
            key={t}
            className={`hist-filter-tab${filter === t ? " hist-filter-tab--on" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t === "all" ? "All" : TYPE_CONFIG[t].emoji + " " + TYPE_CONFIG[t].label}
            <span className="hist-filter-count">{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="hist-loading">
          <Spinner /> Loading history…
        </div>
      )}

      {/* Fetch error */}
      {!loading && fetchErr && (
        <div className="error-box" role="alert">
          <ErrIcon /> <span>{fetchErr}</span>
          <button className="retry-btn" onClick={fetchHistory}>Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchErr && filtered.length === 0 && (
        <div className="hist-empty">
          <span className="hist-empty-icon">🕐</span>
          <p className="hist-empty-title">
            {search ? `No results for "${search}"` : "No history yet"}
          </p>
          <p className="hist-empty-sub">
            {search ? "Try a different search term." : "Start translating to see your history here."}
          </p>
          {!search && (
            <Link href="/translate" className="btn btn--primary" style={{ marginTop: "1rem" }}>
              Start Translating
            </Link>
          )}
        </div>
      )}

      {/* History list */}
      {!loading && !fetchErr && filtered.length > 0 && (
        <div className="hist-list">
          {/* Result count */}
          <div className="hist-meta-row">
            <span className="history-count">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              {search && ` matching "${search}"`}
            </span>
            <button className="selector-ctrl" onClick={fetchHistory}>↻ Refresh</button>
          </div>

          {filtered.map((item) => {
            const cfg       = TYPE_CONFIG[item.type];
            const isOpen    = expanded === item._id;
            const isDeleting = deleting === item._id;

            return (
              <div key={item._id} className={`hist-card${isOpen ? " hist-card--open" : ""}`}>

                {/* Card header — always visible */}
                <div className="hist-card-header" onClick={() => setExpanded(isOpen ? null : item._id)}>

                  {/* Type badge */}
                  <span className="hist-type-badge" style={{ "--htype-color": cfg.color } as React.CSSProperties}>
                    {cfg.emoji} {cfg.label}
                  </span>

                  {/* Input text preview */}
                  <p className="hist-input-text">{item.inputText}</p>

                  {/* Right side: time + chevron */}
                  <div className="hist-card-right">
                    <span className="history-time">{timeAgo(item.createdAt)}</span>
                    <span className={`hist-chevron${isOpen ? " hist-chevron--open" : ""}`}>
                      <ChevronDownIcon />
                    </span>
                  </div>
                </div>

                {/* Language pills */}
                <div className="hist-langs-row">
                  <span className="hist-detected">
                    {item.detectedLang !== "Unknown" && (
                      <><strong>{item.detectedLang}</strong> → </>
                    )}
                  </span>
                  <div className="history-langs">
                    {item.languages.map((l) => (
                      <span key={l} className="history-lang">{l}</span>
                    ))}
                  </div>
                </div>

                {/* Expanded results */}
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

                {/* Actions */}
                <div className="hist-card-actions">
                  <button
                    className="btn btn--ghost hist-action-btn"
                    onClick={() => reuseItem(item)}
                    title="Reuse this translation"
                  >
                    <ReuseIcon /> Reuse
                  </button>
                  <button
                    className={`btn btn--ghost hist-action-btn hist-action-btn--fav${item.isFavorite ? " hist-action-btn--fav-on" : ""}`}
                    onClick={() => toggleFavorite(item._id)}
                    title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    {item.isFavorite ? "★" : "☆"} {item.isFavorite ? "Favorited" : "Favorite"}
                  </button>
                  <button
                    className="btn btn--ghost hist-action-btn hist-action-btn--delete"
                    onClick={() => deleteItem(item._id)}
                    disabled={isDeleting}
                    title="Delete"
                  >
                    {isDeleting ? <Spinner /> : <TrashIcon />}
                    {isDeleting ? "Deleting…" : "Delete"}
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

/* ── Icons ───────────────────────────────────────────────────────────────── */
function ChevronIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function ChevronDownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
}
function ReuseIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" /></svg>;
}
function CheckIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function WarnIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
function ErrIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
