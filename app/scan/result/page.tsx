"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface OCRResult {
  extractedText:    string;
  detectedLanguage: string;
  signType:         string;
  contextHint:      string;
  confidence:       string;
  didYouMean:       string;
}

interface LangResult {
  language: string;
  script:   string;
  roman:    string;
}

interface ScanResultData {
  ocr:          OCRResult;
  preview:      string | null;
  detectedLang: string;
  translations: LangResult[];
  selectedLangs: string[];
}

type SpeakSpd = 0.75 | 1 | 1.25;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const LANG_FLAGS: Record<string, string> = {
  English:"🇬🇧", French:"🇫🇷", German:"🇩🇪", Spanish:"🇪🇸",
  Chinese:"🇨🇳", Japanese:"🇯🇵", Russian:"🇷🇺", Arabic:"🇸🇦",
};

const SIGN_ICONS: Record<string, string> = {
  direction:"🧭", warning:"⚠️", shop:"🏪", place:"📍",
  informational:"ℹ️", religious:"🛕", transport:"🚉", unknown:"🔍",
};

const LANG_BCP47: Record<string, string> = {
  Tamil:"ta", Hindi:"hi", Telugu:"te", Malayalam:"ml", Kannada:"kn",
  Bengali:"bn", Marathi:"mr", Gujarati:"gu", Punjabi:"pa", Urdu:"ur",
  English:"en", French:"fr", German:"de", Spanish:"es",
  Chinese:"zh", Japanese:"ja", Russian:"ru", Arabic:"ar",
};

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);
  return { toast, show };
}

function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [speed,    setSpeed]    = useState<SpeakSpd>(1);
  const [activeId, setActiveId] = useState<string | null>(null);

  const speak = useCallback((text: string, id: string, lang?: string) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = speed;
    const voices = window.speechSynthesis.getVoices();
    if (lang) {
      const v = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
      if (v) utt.voice = v;
    }
    utt.onstart = () => { setSpeaking(true); setActiveId(id); };
    utt.onend   = () => { setSpeaking(false); setActiveId(null); };
    utt.onerror = () => { setSpeaking(false); setActiveId(null); };
    window.speechSynthesis.speak(utt);
  }, [speed]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false); setActiveId(null);
  }, []);

  return { speaking, speed, setSpeed, speak, stop, activeId };
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESULT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ScanResultPage() {
  const router = useRouter();
  const [data, setData] = useState<ScanResultData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast, show: showToast } = useToast();
  const { speed, setSpeed, speak, stop, activeId } = useSpeech();

  useEffect(() => {
    const raw = sessionStorage.getItem("sl_scan_result");
    if (!raw) { router.replace("/scan"); return; }
    try { setData(JSON.parse(raw)); }
    catch { router.replace("/scan"); }
  }, [router]);

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      showToast("Copied!");
      setTimeout(() => setCopied(null), 1800);
    });
  }

  function shareAll() {
    if (!data) return;
    const lines = data.translations.map((r) => `${r.language}: ${r.script} (${r.roman})`).join("\n");
    const text  = `Sign: "${data.ocr.extractedText}"\nLanguage: ${data.ocr.detectedLanguage}\n\n${lines}\n\nShared via StreetLingo`;
    if (navigator.share) navigator.share({ title: "StreetLingo Scan Result", text }).catch(() => {});
    else navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard!"));
  }

  function retranslate() {
    router.push("/scan");
  }

  if (!data) {
    return (
      <main className="inner-page" style={{ alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="result-loading"><Spinner /> Loading result…</div>
      </main>
    );
  }

  const { ocr, preview, detectedLang, translations } = data;
  const signIcon = SIGN_ICONS[ocr.signType] || "🔍";

  return (
    <main className="inner-page inner-page--wide">

      {/* Toast */}
      {toast && <div className="toast toast--success" role="status"><CheckIcon /> {toast}</div>}

      {/* Back */}
      <div className="result-nav">
        <Link href="/scan" className="back-btn"><ChevronIcon /> Back to Scan</Link>
        <button className="btn btn--ghost" onClick={retranslate} style={{ fontSize: "0.8rem" }}>
          🔄 Scan Another
        </button>
      </div>

      {/* ── RESULT HERO ── */}
      <div className="result-hero">

        {/* Image thumbnail */}
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Scanned sign" className="result-thumb" />
        )}

        {/* Sign info */}
        <div className="result-hero-body">
          <div className="result-hero-meta">
            <span className={`confidence confidence--${ocr.confidence.toLowerCase()}`}>
              {ocr.confidence} confidence
            </span>
            {ocr.signType && ocr.signType !== "unknown" && (
              <span className="sign-type-badge-sm">{signIcon} {ocr.signType}</span>
            )}
            <span className="detected-lang">
              Language: <strong>{ocr.detectedLanguage}</strong>
            </span>
          </div>

          {/* Extracted text — big and prominent */}
          <div className="result-original-block">
            <span className="result-section-label">📄 Extracted Text</span>
            <div className="result-original-row">
              <p className="result-original-text">{ocr.extractedText}</p>
              <button
                className="tr-action-btn"
                onClick={() => copyText(ocr.extractedText, "original")}
                title="Copy original text"
              >
                {copied === "original" ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
          </div>

          {/* Context hint */}
          {ocr.contextHint && (
            <div className="scan-context-hint">
              💡 {ocr.contextHint}
            </div>
          )}
        </div>
      </div>

      {/* ── TTS SPEED ── */}
      <div className="result-tts-bar">
        <span className="tts-speed-label">Speech speed</span>
        <div className="tts-speed">
          {([0.75, 1, 1.25] as SpeakSpd[]).map((s) => (
            <button key={s} className={`speed-btn${speed === s ? " speed-btn--on" : ""}`}
              onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
        {activeId && (
          <button className="btn btn--ghost" style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }} onClick={stop}>
            ⏹ Stop
          </button>
        )}
        <div style={{ marginLeft: "auto" }}>
          <span className="detected-lang">
            Translated into <strong>{translations.length}</strong> language{translations.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── TRANSLATION CARDS ── */}
      <div className="result-grid">
        {translations.map((r) => {
          const cardId  = `card-${r.language}`;
          const isSpeaking = activeId === cardId;
          const isCopied   = copied === cardId;
          return (
            <div key={r.language} className={`result-card${isSpeaking ? " result-card--speaking" : ""}`}>

              {/* Card header */}
              <div className="result-card-header">
                <div className="result-card-lang">
                  {LANG_FLAGS[r.language] && (
                    <span className="result-card-flag">{LANG_FLAGS[r.language]}</span>
                  )}
                  <span className="tr-lang">{r.language}</span>
                </div>
                <div className="tr-card-actions">
                  <button
                    className={`tr-action-btn${isSpeaking ? " tr-action-btn--speaking" : ""}`}
                    onClick={() => isSpeaking ? stop() : speak(r.script, cardId, LANG_BCP47[r.language])}
                    title={isSpeaking ? "Stop" : `Speak in ${r.language}`}
                  >
                    {isSpeaking ? <StopIcon /> : <SpeakerIcon />}
                  </button>
                  <button
                    className={`tr-action-btn${isCopied ? " tr-action-btn--copied" : ""}`}
                    onClick={() => copyText(`${r.script}\n${r.roman}`, cardId)}
                    title="Copy"
                  >
                    {isCopied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              </div>

              {/* Native script — large */}
              <p className="result-card-script">{r.script}</p>

              {/* Romanization */}
              <p className="result-card-roman">{r.roman}</p>

              {/* Original for reference */}
              <div className="result-card-ref">
                <span className="result-card-ref-label">Original</span>
                <span className="result-card-ref-text">{ocr.extractedText}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ACTIONS ── */}
      <div className="result-actions">
        <button className="btn btn--outline" onClick={shareAll}>
          <ShareIcon /> Share All
        </button>
        <button className="btn btn--ghost" onClick={retranslate}>
          🔄 Scan Another Sign
        </button>
        <Link href="/translate" className="btn btn--ghost">
          ✦ Text Translate
        </Link>
      </div>

    </main>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
function ChevronIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function CheckIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function CopyIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}
function SpeakerIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>;
}
function StopIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
}
function ShareIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
}
function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
