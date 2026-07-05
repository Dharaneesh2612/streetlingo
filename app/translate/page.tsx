"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { TranslateResult, LanguageResult } from "@/lib/gemini";
import { ALL_LANGUAGES } from "@/lib/gemini";

const INDIAN_LANGS        = ["Tamil","Hindi","Telugu","Malayalam","Kannada","Bengali","Marathi","Gujarati","Punjabi","Urdu"];
const INTERNATIONAL_LANGS = ["English","French","German","Spanish","Chinese","Japanese","Russian","Arabic"];
const LANG_FLAGS: Record<string,string> = {
  English:"🇬🇧", French:"🇫🇷", German:"🇩🇪", Spanish:"🇪🇸",
  Chinese:"🇨🇳", Japanese:"🇯🇵", Russian:"🇷🇺", Arabic:"🇸🇦",
};

/* BCP-47 codes for language-specific TTS voice selection */
const LANG_BCP47: Record<string, string> = {
  Tamil:"ta-IN", Hindi:"hi-IN", Telugu:"te-IN", Malayalam:"ml-IN", Kannada:"kn-IN",
  Bengali:"bn-IN", Marathi:"mr-IN", Gujarati:"gu-IN", Punjabi:"pa-IN", Urdu:"ur-PK",
  English:"en-US", French:"fr-FR", German:"de-DE", Spanish:"es-ES",
  Chinese:"zh-CN", Japanese:"ja-JP", Russian:"ru-RU", Arabic:"ar-SA",
};

type Status   = "idle" | "loading" | "success" | "error";
type Tab      = "translate" | "history" | "phrasebook";
type SpeakSpd = 0.75 | 1 | 1.25;

interface HistoryItem {
  id:     number;
  text:   string;
  langs:  string[];
  result: TranslateResult;
  time:   string;
}

interface PhrasebookItem {
  id:      number;
  text:    string;
  lang:    string;
  script:  string;
  roman:   string;
  savedAt: string;
}

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);
  return { toast, show };
}

/* Language-aware TTS — picks the correct voice for each language */
function useTTS() {
  const [speed,    setSpeed]    = useState<SpeakSpd>(1);
  const [speaking, setSpeaking] = useState<string | null>(null);

  const speak = useCallback((text: string, language?: string) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = speed;

    if (language) {
      const bcp47  = LANG_BCP47[language] ?? "";
      const voices = window.speechSynthesis.getVoices();
      // Try exact BCP-47 match first, then language prefix match
      const voice  =
        voices.find((v) => v.lang === bcp47) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(bcp47.split("-")[0].toLowerCase())) ||
        null;
      if (voice) {
        utt.voice = voice;
        utt.lang  = voice.lang;
      } else {
        utt.lang = bcp47 || "en-US";
      }
    }

    utt.onstart = () => setSpeaking(language ?? "default");
    utt.onend   = () => setSpeaking(null);
    utt.onerror = () => setSpeaking(null);
    window.speechSynthesis.speak(utt);
  }, [speed]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(null);
  }, []);

  return { speed, setSpeed, speak, stop, speaking };
}

function useCopy(onCopied: (msg: string) => void) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      onCopied("Copied to clipboard!");
      setTimeout(() => setCopied(null), 1800);
    });
  }, [onCopied]);
  return { copied, copy };
}

export default function TranslatePage() {
  const [tab,        setTab]        = useState<Tab>("translate");
  const [text,       setText]       = useState("");
  const [selected,   setSelected]   = useState<string[]>(["Tamil", "Hindi"]);
  const [status,     setStatus]     = useState<Status>("idle");
  const [result,     setResult]     = useState<TranslateResult | null>(null);
  const [errMsg,     setErrMsg]     = useState("");
  const [history,    setHistory]    = useState<HistoryItem[]>([]);
  const [phrasebook, setPhrasebook] = useState<PhrasebookItem[]>([]);
  const [fontSize,   setFontSize]   = useState<"md" | "lg" | "xl">("lg");

  const { toast, show: showToast }             = useToast();
  const { speed, setSpeed, speak, stop, speaking } = useTTS();
  const { copied, copy }                       = useCopy(showToast);

  // Load localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sl_history");
      if (saved) setHistory(JSON.parse(saved));
      const pb = localStorage.getItem("sl_phrasebook");
      if (pb) setPhrasebook(JSON.parse(pb));
    } catch { /* ignore */ }
  }, []);

  // When history tab is opened — also fetch from DB and merge
  useEffect(() => {
    if (tab !== "history") return;
    fetch("/api/history")
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok || !json.data.length) return;
        // Convert DB items to local HistoryItem format and merge
        const dbItems: HistoryItem[] = json.data.map((d: {
          _id: string; inputText: string; languages: string[];
          detectedLang: string; results: { language: string; script: string; roman: string }[];
          createdAt: string;
        }) => ({
          id:     new Date(d.createdAt).getTime(),
          text:   d.inputText,
          langs:  d.languages,
          result: { original: d.inputText, detectedLang: d.detectedLang, results: d.results },
          time:   new Date(d.createdAt).toLocaleTimeString(),
        }));
        setHistory(dbItems);
      })
      .catch(() => { /* fallback to localStorage already loaded */ });
  }, [tab]);

  function saveHistory(item: HistoryItem) {
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, 20);
      localStorage.setItem("sl_history", JSON.stringify(next));
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("sl_history");
  }

  function removeHistoryItem(id: number) {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      localStorage.setItem("sl_history", JSON.stringify(next));
      return next;
    });
  }

  function saveToPhrasebook(lang: string, script: string, roman: string) {
    const item: PhrasebookItem = { id: Date.now(), text: text.trim(), lang, script, roman, savedAt: new Date().toLocaleString() };
    // Save to localStorage
    setPhrasebook((prev) => {
      const next = [item, ...prev].slice(0, 50);
      localStorage.setItem("sl_phrasebook", JSON.stringify(next));
      return next;
    });
    // Save to MongoDB as a translate history item marked as favorite
    fetch("/api/history/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type:        "translate",
        inputText:   text.trim() || script,
        languages:   [lang],
        detectedLang: result?.detectedLang ?? "Unknown",
        results:     [{ language: lang, script, roman }],
        isFavorite:  true,
      }),
    }).catch(() => {});
    showToast("⭐ Saved to Phrasebook!");
  }

  function removeFromPhrasebook(id: number) {
    setPhrasebook((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem("sl_phrasebook", JSON.stringify(next));
      return next;
    });
  }

  function isInPhrasebook(lang: string, script: string) {
    return phrasebook.some((p) => p.lang === lang && p.script === script);
  }

  function shareAll() {
    if (!result) return;
    const lines     = result.results.map((r) => `${r.language}: ${r.script} (${r.roman})`).join("\n");
    const shareText = `"${result.original}" translated via StreetLingo:\n\n${lines}`;
    if (navigator.share) {
      navigator.share({ title: "StreetLingo Translation", text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => showToast("Copied all translations!"));
    }
  }

  function toggleLang(lang: string) {
    setSelected((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]);
    setResult(null); setStatus("idle");
  }

  async function onTranslate() {
    if (!text.trim() || selected.length === 0 || status === "loading") return;
    setStatus("loading"); setResult(null); setErrMsg("");
    try {
      const res  = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), languages: selected }),
      });
      const json = await res.json();
      if (!json.ok) { setErrMsg(json.error ?? "Something went wrong."); setStatus("error"); return; }
      setResult(json.data); setStatus("success");

      const historyItem: HistoryItem = {
        id: Date.now(), text: text.trim(), langs: selected,
        result: json.data, time: new Date().toLocaleTimeString(),
      };
      saveHistory(historyItem);

      // Save to MongoDB (fire-and-forget, non-blocking)
      fetch("/api/history/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:        "translate",
          inputText:   text.trim(),
          languages:   selected,
          detectedLang: json.data.detectedLang,
          results:     json.data.results,
        }),
      }).catch(() => { /* DB save failure is silent — localStorage still works */ });

    } catch {
      setErrMsg("Network error. Please check your connection."); setStatus("error");
    }
  }

  function onClear() { setText(""); setResult(null); setStatus("idle"); setErrMsg(""); stop(); }

  function loadFromHistory(item: HistoryItem) {
    setText(item.text); setSelected(item.langs);
    setResult(item.result); setStatus("success"); setTab("translate");
  }

  const canTranslate = text.trim().length > 0 && selected.length > 0 && status !== "loading";
  const scriptSize   = fontSize === "xl" ? "2.2rem" : fontSize === "lg" ? "1.7rem" : "1.3rem";
  const romanSize    = fontSize === "xl" ? "1.15rem" : fontSize === "lg" ? "1rem" : "0.875rem";
  const isLongText   = text.trim().length > 300;

  return (
    <main className="inner-page inner-page--wide">

      {toast && (
        <div className="toast toast--success" role="status">
          <CheckCircleIcon /> {toast}
        </div>
      )}

      <Link href="/" className="back-btn"><BackIcon /> Back to Home</Link>

      <div className="page-header">
        <h1 className="page-title">Text Translate</h1>
        <p className="page-sub">Type any text — sentences, menus, signs — pick languages, get instant translations with native speech</p>
      </div>

      <div className="tabs">
        <button className={`tab${tab === "translate"  ? " tab--on" : ""}`} onClick={() => setTab("translate")}>Translate</button>
        <button className={`tab${tab === "history"    ? " tab--on" : ""}`} onClick={() => setTab("history")}>
          History {history.length > 0 && <span className="tab-count">{history.length}</span>}
        </button>
        <button className={`tab${tab === "phrasebook" ? " tab--on" : ""}`} onClick={() => setTab("phrasebook")}>
          ⭐ Phrasebook {phrasebook.length > 0 && <span className="tab-count">{phrasebook.length}</span>}
        </button>
      </div>

      {tab === "translate" && (
        <>
          <div className="translate-card">
            <textarea
              className="translate-input"
              placeholder="Type or paste any text… sentences, menus, signs, paragraphs (Tamil, English, Hindi, etc.)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onTranslate(); }}
              rows={6}
              maxLength={5000}
            />
            <div className="translate-bar">
              <span className="char-count">{text.length} / 5000</span>
              <div className="translate-actions">
                {text && <button className="btn btn--ghost" onClick={onClear} disabled={status === "loading"}>Clear</button>}
              </div>
            </div>
            <p className="input-hint">Ctrl + Enter to translate</p>
          </div>

          <div className="lang-selector">
            <div className="lang-selector-header">
              <span className="lang-selector-label">Translate into</span>
              <div className="lang-selector-controls">
                <button className="selector-ctrl" onClick={() => setSelected([...ALL_LANGUAGES])}>All</button>
                <span className="selector-sep">·</span>
                <button className="selector-ctrl" onClick={() => setSelected([])}>None</button>
              </div>
            </div>
            <div className="lang-group">
              <span className="lang-group-label">🇮🇳 Indian Languages</span>
              <div className="lang-chips">
                {INDIAN_LANGS.map((lang) => (
                  <button key={lang} className={`lang-chip${selected.includes(lang) ? " lang-chip--on" : ""}`}
                    onClick={() => toggleLang(lang)} aria-pressed={selected.includes(lang)}>
                    {selected.includes(lang) && <CheckIcon />}{lang}
                  </button>
                ))}
              </div>
            </div>
            <div className="lang-group">
              <span className="lang-group-label">🌍 International (Top visitors to India)</span>
              <div className="lang-chips">
                {INTERNATIONAL_LANGS.map((lang) => (
                  <button key={lang} className={`lang-chip lang-chip--intl${selected.includes(lang) ? " lang-chip--on" : ""}`}
                    onClick={() => toggleLang(lang)} aria-pressed={selected.includes(lang)}>
                    {selected.includes(lang) && <CheckIcon />}{LANG_FLAGS[lang]} {lang}
                  </button>
                ))}
              </div>
            </div>
            {selected.length === 0 && <p className="selector-warn">Select at least one language.</p>}
          </div>

          <div className="translate-action-row">
            <div className="tts-speed-row">
              <span className="tts-speed-label">Speech speed</span>
              <div className="tts-speed">
                {([0.75, 1, 1.25] as SpeakSpd[]).map((s) => (
                  <button key={s} className={`speed-btn${speed === s ? " speed-btn--on" : ""}`}
                    onClick={() => setSpeed(s)}>{s}x</button>
                ))}
              </div>
              {speaking && (
                <button className="btn btn--ghost" style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }} onClick={stop}>
                  ⏹ Stop
                </button>
              )}
            </div>
            <button className="btn btn--primary btn--full" onClick={onTranslate} disabled={!canTranslate}>
              {status === "loading"
                ? <><Spinner /> Translating into {selected.length} language{selected.length > 1 ? "s" : ""}…</>
                : <>Translate into {selected.length} language{selected.length !== 1 ? "s" : ""}</>}
            </button>
          </div>

          {status === "error" && (
            <div className="error-box" role="alert">
              <ErrorIcon /><span>{errMsg}</span>
              <button className="retry-btn" onClick={onTranslate}>Retry</button>
            </div>
          )}

          {status === "loading" && (
            <div className="results-wrap skeleton-wrap">
              <div className="skeleton-results-header">
                <div className="skeleton skeleton--pill" />
                <div className="skeleton skeleton--pill" />
              </div>
              <div className={`tr-grid${isLongText ? " tr-grid--long" : ""}`}>
                {selected.slice(0, 6).map((_, i) => (
                  <div key={i} className="tr-card">
                    <div className="skeleton skeleton--label" style={{ width: "60px" }} />
                    <div className="skeleton skeleton--text-lg" style={{ marginTop: "0.5rem" }} />
                    <div className="skeleton skeleton--text skeleton--short" style={{ marginTop: "0.35rem" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === "success" && result && (
            <div className="results-wrap">
              <div className="results-header">
                <div className="results-meta">
                  <span className="detected-lang">Detected: <strong>{result.detectedLang}</strong></span>
                  <span className="original-text">&ldquo;{result.original}&rdquo;</span>
                </div>
                <div className="results-controls">
                  <div className="font-toggle">
                    <span className="font-toggle-label">Size</span>
                    {(["md","lg","xl"] as const).map((s) => (
                      <button key={s} className={`font-btn${fontSize === s ? " font-btn--on" : ""}`}
                        onClick={() => setFontSize(s)}>
                        {s === "md" ? "A" : s === "lg" ? "A" : "A"}
                        <span className="sr-only">{s}</span>
                      </button>
                    ))}
                  </div>
                  <button className="btn btn--ghost share-btn" onClick={shareAll}>
                    <ShareIcon /> Share All
                  </button>
                </div>
              </div>
              <div className={`tr-grid${isLongText ? " tr-grid--long" : ""}`}>
                {result.results.map((r) => (
                  <ResultCard
                    key={r.language}
                    r={r}
                    scriptSize={scriptSize}
                    romanSize={romanSize}
                    copied={copied}
                    onCopy={copy}
                    onSpeak={() => speak(r.script, r.language)}
                    onStop={stop}
                    isSpeaking={speaking === r.language}
                    onStar={() => saveToPhrasebook(r.language, r.script, r.roman)}
                    isStarred={isInPhrasebook(r.language, r.script)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div className="history-wrap">
          {history.length === 0 ? (
            <div className="history-empty">
              <span>No translations yet.</span>
              <p>Your recent translations will appear here.</p>
            </div>
          ) : (
            <>
              <div className="history-header">
                <span className="history-count">{history.length} recent translation{history.length !== 1 ? "s" : ""}</span>
                <button className="selector-ctrl" onClick={clearHistory}>Clear all</button>
              </div>
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className="history-item" onClick={() => loadFromHistory(item)}>
                    <div className="history-item-top">
                      <span className="history-text">{item.text}</span>
                      <div className="history-item-controls">
                        <span className="history-time">{item.time}</span>
                        <button
                          className="history-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHistoryItem(item.id);
                          }}
                          title="Delete"
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="history-langs">
                      {item.langs.map((l) => <span key={l} className="history-lang">{l}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "phrasebook" && (
        <div className="history-wrap">
          {phrasebook.length === 0 ? (
            <div className="history-empty">
              <span>⭐ Phrasebook is empty.</span>
              <p>Star any translation card to save it here for quick reference.</p>
            </div>
          ) : (
            <>
              <div className="history-header">
                <span className="history-count">{phrasebook.length} saved phrase{phrasebook.length !== 1 ? "s" : ""}</span>
                <button className="selector-ctrl" onClick={() => { setPhrasebook([]); localStorage.removeItem("sl_phrasebook"); }}>Clear all</button>
              </div>
              <div className="history-list">
                {phrasebook.map((item) => (
                  <div key={item.id} className="history-item phrasebook-item">
                    <div className="history-item-top">
                      <span className="history-text">{item.text}</span>
                      <button className="pb-remove-btn" onClick={() => removeFromPhrasebook(item.id)} title="Remove">✕</button>
                    </div>
                    <div className="pb-lang-badge">{item.lang}</div>
                    <p className="pb-script">{item.script}</p>
                    <p className="pb-roman">{item.roman}</p>
                    <span className="history-time" style={{ marginTop: "0.2rem" }}>{item.savedAt}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}

function ResultCard({ r, scriptSize, romanSize, copied, onCopy, onSpeak, onStop, isSpeaking, onStar, isStarred }: {
  r: LanguageResult;
  scriptSize: string;
  romanSize: string;
  copied: string | null;
  onCopy: (t: string, id: string) => void;
  onSpeak: () => void;
  onStop: () => void;
  isSpeaking: boolean;
  onStar: () => void;
  isStarred: boolean;
}) {
  const copyId   = `${r.language}-script`;
  const isCopied = copied === copyId;
  // Format text: normalize line breaks so pre-line renders cleanly
  const scriptText = formatOutputText(r.script);
  const romanText  = formatOutputText(r.roman);

  return (
    <div className={`tr-card${isStarred ? " tr-card--starred" : ""}${isSpeaking ? " tr-card--speaking" : ""}`}>
      <div className="tr-card-header">
        <span className="tr-lang">{r.language}</span>
        <div className="tr-card-actions">
          <button
            className={`tr-action-btn${isStarred ? " tr-action-btn--starred" : ""}`}
            onClick={onStar}
            title={isStarred ? "Saved" : "Save to phrasebook"}
          >
            <StarIcon filled={isStarred} />
          </button>
          <button
            className={`tr-action-btn${isSpeaking ? " tr-action-btn--speaking" : ""}`}
            onClick={() => isSpeaking ? onStop() : onSpeak()}
            title={isSpeaking ? `Stop ${r.language}` : `Speak in ${r.language}`}
          >
            {isSpeaking ? <StopIcon /> : <SpeakerIcon />}
          </button>
          <button
            className={`tr-action-btn${isCopied ? " tr-action-btn--copied" : ""}`}
            onClick={() => onCopy(`${r.script}\n${r.roman}`, copyId)}
            title="Copy"
          >
            {isCopied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>

      <p className="tr-script" style={{ fontSize: scriptSize }}>{scriptText}</p>
      <p className="tr-roman"  style={{ fontSize: romanSize  }}>{romanText}</p>

      {isSpeaking && (
        <div className="tr-speaking-bar">
          <span className="tr-speaking-dot" />
          <span className="tr-speaking-dot" />
          <span className="tr-speaking-dot" />
          <span className="tr-speaking-label">Speaking in {r.language}…</span>
        </div>
      )}
    </div>
  );
}

/* Normalize text for clean pre-line rendering:
   - Collapse 3+ newlines to 2
   - Trim each line
   - Ensure menu items each get their own line */
function formatOutputText(text: string): string {
  if (!text) return text;
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === "")) // remove double blank lines
    .join("\n");
}

function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function CheckCircleIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}
function StarIcon({ filled }: { filled: boolean }) {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}
function ShareIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
}
function CheckIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function CopyIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}
function SpeakerIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
}
function StopIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
}
function Spinner() { return <span className="spinner" aria-hidden="true" />; }
function ErrorIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
