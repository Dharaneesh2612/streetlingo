"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { TRANSLITERATE_LANGUAGES, type TransliterateResult } from "@/lib/gemini";

type Status = "idle" | "loading" | "success" | "error";

const INDIAN_LANGS       = ["Tamil","Hindi","Telugu","Malayalam","Kannada","Bengali","Marathi","Gujarati","Punjabi","Urdu"];
const INTERNATIONAL_LANGS = ["English","French","German","Spanish","Chinese","Japanese","Russian","Arabic"];

const EXAMPLES = [
  { text: "Hello" },
  { text: "தமிழ்" },
  { text: "नमस्ते" },
  { text: "Bonjour" },
  { text: "مرحبا" },
  { text: "ありがとう" },
  { text: "Vanakkam" },
];

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    });
  }, []);
  return { copied, copy };
}

export default function TransliteratePage() {
  const [text,     setText]     = useState("");
  const [selected, setSelected] = useState<string[]>(["Tamil", "Hindi", "English", "French"]);
  const [status,   setStatus]   = useState<Status>("idle");
  const [result,   setResult]   = useState<TransliterateResult | null>(null);
  const [errMsg,   setErrMsg]   = useState("");
  const { copied, copy }        = useCopy();

  function toggleLang(lang: string) {
    setSelected((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
    setResult(null); setStatus("idle");
  }

  async function onTransliterate() {
    if (!text.trim() || selected.length === 0 || status === "loading") return;
    setStatus("loading"); setResult(null); setErrMsg("");
    try {
      const res  = await fetch("/api/transliterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), languages: selected }),
      });
      const json = await res.json();
      if (!json.ok) { setErrMsg(json.error ?? "Something went wrong."); setStatus("error"); return; }
      setResult(json.data); setStatus("success");
    } catch {
      setErrMsg("Network error. Please check your connection."); setStatus("error");
    }
  }

  function speak(t: string) {
    if (!("speechSynthesis" in window) || !t) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.rate = 0.82;
    window.speechSynthesis.speak(u);
  }

  const canRun = text.trim().length > 0 && selected.length > 0 && status !== "loading";

  return (
    <main className="inner-page inner-page--wide">

      {/* Back */}
      <Link href="/" className="back-btn">
        <BackIcon /> Back to Home
      </Link>

      {/* Header */}
      <div className="page-header">
        <div className="tl-header-row">
          <h1 className="page-title">Transliteration</h1>
          <span className="tl-badge-info">ஒலிபெயர்ப்பு</span>
        </div>
        <p className="page-sub">
          Convert the <em>sound</em> of any text into another script — not the meaning.
          &ldquo;Hello&rdquo; becomes ஹலோ, not a translation.
        </p>
      </div>

      {/* Explainer banner */}
      <div className="tl-explainer">
        <div className="tl-explainer-icon">🔤</div>
        <div className="tl-explainer-body">
          <strong>What is Transliteration?</strong>
          <p>
            Transliteration maps the <em>sound (ஒலி)</em> of a word into a different script —
            without changing its meaning. It helps you <em>read and pronounce</em> words in
            unfamiliar scripts. Works for Indian languages <em>and</em> international languages.
          </p>
          <div className="tl-examples-row">
            <span className="tl-ex"><span className="tl-ex-in">&ldquo;தமிழ்&rdquo;</span> → <span className="tl-ex-out">Tamil</span> <span className="tl-ex-tag">Roman</span></span>
            <span className="tl-ex"><span className="tl-ex-in">&ldquo;Hello&rdquo;</span> → <span className="tl-ex-out">ஹலோ</span> <span className="tl-ex-tag">Tamil script</span></span>
            <span className="tl-ex"><span className="tl-ex-in">&ldquo;Bonjour&rdquo;</span> → <span className="tl-ex-out">बोंजूर</span> <span className="tl-ex-tag">Hindi script</span></span>
            <span className="tl-ex"><span className="tl-ex-in">&ldquo;مرحبا&rdquo;</span> → <span className="tl-ex-out">Marhaba</span> <span className="tl-ex-tag">Roman</span></span>
          </div>
        </div>
      </div>

      {/* Quick examples */}
      <div className="tl-quick-row">
        <span className="tl-quick-label">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.text}
            className="tl-quick-btn"
            onClick={() => { setText(ex.text); setResult(null); setStatus("idle"); }}
          >
            {ex.text}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="translate-card">
        <textarea
          className="translate-input"
          placeholder={`Type any text… e.g. "Hello", "தமிழ்", "नमस्ते", "Bonjour", "مرحبا"`}
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); setStatus("idle"); }}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onTransliterate(); }}
          rows={3}
          maxLength={500}
        />
        <div className="translate-bar">
          <span className="char-count">{text.length} / 500</span>
          <div className="translate-actions">
            {text && (
              <button className="btn btn--ghost" onClick={() => { setText(""); setResult(null); setStatus("idle"); }}>
                Clear
              </button>
            )}
          </div>
        </div>
        <p className="input-hint">Ctrl + Enter to run · Works both ways: Roman ↔ Native script</p>
      </div>

      {/* Language selector */}
      <div className="lang-selector">
        <div className="lang-selector-header">
          <span className="lang-selector-label">Transliterate into</span>
          <div className="lang-selector-controls">
            <button className="selector-ctrl" onClick={() => setSelected([...TRANSLITERATE_LANGUAGES])}>All</button>
            <span className="selector-sep">·</span>
            <button className="selector-ctrl" onClick={() => setSelected([])}>None</button>
          </div>
        </div>

        {/* Indian languages group */}
        <div className="lang-group">
          <span className="lang-group-label">🇮🇳 Indian Languages</span>
          <div className="lang-chips">
            {INDIAN_LANGS.map((lang) => (
              <button
                key={lang}
                className={`lang-chip${selected.includes(lang) ? " lang-chip--on" : ""}`}
                onClick={() => toggleLang(lang)}
                aria-pressed={selected.includes(lang)}
              >
                {selected.includes(lang) && <CheckIcon />}
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* International languages group */}
        <div className="lang-group">
          <span className="lang-group-label">🌍 International (Top visitors to India)</span>
          <div className="lang-chips">
            {INTERNATIONAL_LANGS.map((lang) => (
              <button
                key={lang}
                className={`lang-chip lang-chip--intl${selected.includes(lang) ? " lang-chip--on" : ""}`}
                onClick={() => toggleLang(lang)}
                aria-pressed={selected.includes(lang)}
              >
                {selected.includes(lang) && <CheckIcon />}
                {LANG_FLAGS[lang]} {lang}
              </button>
            ))}
          </div>
        </div>

        {selected.length === 0 && <p className="selector-warn">Select at least one language.</p>}
      </div>

      {/* Run button */}
      <button className="btn btn--primary btn--full" onClick={onTransliterate} disabled={!canRun}>
        {status === "loading"
          ? <><Spinner /> Transliterating…</>
          : <>🔤 Transliterate into {selected.length} script{selected.length !== 1 ? "s" : ""}</>}
      </button>

      {/* Error */}
      {status === "error" && (
        <div className="error-box" role="alert"><ErrorIcon /><span>{errMsg}</span></div>
      )}

      {/* Results */}
      {status === "success" && result && (
        <div className="results-wrap">

          {/* Meta bar */}
          <div className="tl-result-meta">
            <span className="detected-lang">Detected: <strong>{result.detectedLang}</strong></span>
            <span className={`tl-direction-badge tl-direction-badge--${result.direction}`}>
              {result.direction === "to-roman" ? "→ Roman" : "→ Native Script"}
            </span>
            <span className="original-text">&ldquo;{result.original}&rdquo;</span>
          </div>

          {/* Cards grid */}
          <div className="tr-grid">
            {result.results.map((r) => (
              <div key={r.language} className="tl-card">
                <div className="tr-card-header">
                  <span className="tr-lang">
                    {LANG_FLAGS[r.language] && <span style={{ marginRight: "0.3rem" }}>{LANG_FLAGS[r.language]}</span>}
                    {r.language}
                  </span>
                  <div className="tr-card-actions">
                    <button
                      className="tr-action-btn"
                      onClick={() => speak(r.script || r.roman)}
                      title={`Speak in ${r.language}`}
                    >
                      <SpeakerIcon />
                    </button>
                    <button
                      className={`tr-action-btn${copied === r.language ? " tr-action-btn--copied" : ""}`}
                      onClick={() => copy(`${r.script}\n${r.roman}`, r.language)}
                      title="Copy"
                    >
                      {copied === r.language ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>
                </div>

                <p className="tl-script">{r.script}</p>
                <p className="tl-roman">{r.roman}</p>

                {r.note && (
                  <p className="tl-note">
                    <NoteIcon /> {r.note}
                  </p>
                )}

                <div className="tl-direction-row">
                  <span className="tl-dir-from">{result.original}</span>
                  <span className="tl-dir-arrow">→</span>
                  <span className="tl-dir-to">{r.script}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

const LANG_FLAGS: Record<string, string> = {
  English:  "🇬🇧",
  French:   "🇫🇷",
  German:   "🇩🇪",
  Spanish:  "🇪🇸",
  Chinese:  "🇨🇳",
  Japanese: "🇯🇵",
  Russian:  "🇷🇺",
  Arabic:   "🇸🇦",
};

/* ── Icons ───────────────────────────────────────────────────────────────── */
function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function SpeakerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline", marginRight: "0.25rem", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
function ErrorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
