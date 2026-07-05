"use client";

import { useRef, useState, useCallback, useEffect } from "react";
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

type Step      = "upload" | "ocr-done" | "translating" | "translated" | "error";
type InputMode = "upload" | "camera";
type SpeakSpd  = 0.75 | 1 | 1.25;

/* ── Language lists ──────────────────────────────────────────────────────── */
const INDIAN_LANGS        = ["Tamil","Hindi","Telugu","Malayalam","Kannada","Bengali","Marathi","Gujarati","Punjabi","Urdu"];
const INTERNATIONAL_LANGS = ["English","French","German","Spanish","Chinese","Japanese","Russian","Arabic"];
const LANG_FLAGS: Record<string,string> = {
  English:"🇬🇧", French:"🇫🇷", German:"🇩🇪", Spanish:"🇪🇸",
  Chinese:"🇨🇳", Japanese:"🇯🇵", Russian:"🇷🇺", Arabic:"🇸🇦",
};

const SIGN_ICONS: Record<string,string> = {
  direction:"🧭", warning:"⚠️", shop:"🏪", place:"📍",
  informational:"ℹ️", religious:"🛕", transport:"🚉", unknown:"🔍",
};

/* ── Toast ───────────────────────────────────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);
  return { toast, show };
}

/* ── TTS ─────────────────────────────────────────────────────────────────── */
const LANG_BCP47: Record<string,string> = {
  Tamil:"ta", Hindi:"hi", Telugu:"te", Malayalam:"ml", Kannada:"kn",
  Bengali:"bn", Marathi:"mr", Gujarati:"gu", Punjabi:"pa", Urdu:"ur",
  English:"en", French:"fr", German:"de", Spanish:"es",
  Chinese:"zh", Japanese:"ja", Russian:"ru", Arabic:"ar",
};

function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [speed,    setSpeed]    = useState<SpeakSpd>(1);

  const speak = useCallback((text: string, lang?: string) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = speed;
    const voices = window.speechSynthesis.getVoices();
    if (lang) {
      const v = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
      if (v) utt.voice = v;
    }
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [speed]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speaking, speed, setSpeed, speak, stop };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);

  const [inputMode,   setInputMode]   = useState<InputMode>("upload");
  const [preview,     setPreview]     = useState<string | null>(null);
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [isDragging,  setIsDragging]  = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraErr,   setCameraErr]   = useState("");

  const [step,        setStep]        = useState<Step>("upload");
  const [errMsg,      setErrMsg]      = useState("");
  const [ocr,         setOcr]         = useState<OCRResult | null>(null);
  const [selected,    setSelected]    = useState<string[]>(["Tamil", "Hindi"]);
  const [translations,setTranslations]= useState<LangResult[]>([]);
  const [detectedLang,setDetectedLang]= useState("");

  const router = useRouter();
  const { toast, show: showToast }          = useToast();
  const { speaking, speed, setSpeed, speak, stop } = useSpeech();

  useEffect(() => () => { stopCamera(); }, []);

  /* ── Camera ── */
  async function startCamera() {
    setCameraErr(""); setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); setCameraReady(true); };
      }
    } catch {
      setCameraErr("Camera not available. Please allow camera access or use file upload.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function captureFrame() {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreview(dataUrl); setImgLoaded(false); setOcr(null);
    setStep("upload"); setErrMsg("");
    stopCamera(); setInputMode("upload");
  }

  function switchToCamera() {
    setInputMode("camera"); setPreview(null); setOcr(null);
    setStep("upload"); setErrMsg(""); startCamera();
  }

  function switchToUpload() { stopCamera(); setInputMode("upload"); setCameraErr(""); }

  /* ── File ── */
  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setErrMsg("Please upload an image file."); setStep("error"); return; }
    if (file.size > 10 * 1024 * 1024)   { setErrMsg("Image too large. Max 10 MB.");  setStep("error"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setImgLoaded(false); setOcr(null); setTranslations([]);
      setStep("upload"); setErrMsg("");
    };
    reader.readAsDataURL(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
  }

  /* ── STEP 1: Scan / OCR ── */
  async function onScan() {
    if (!preview || step === "translating") return;
    stop(); setStep("translating"); setOcr(null); setTranslations([]); setErrMsg("");

    try {
      const res  = await fetch("/api/scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });
      const json = await res.json();
      if (!json.ok) { setErrMsg(json.error ?? "Could not read the image."); setStep("error"); return; }
      const data: OCRResult = json.data;
      if (!data.extractedText) {
        setErrMsg("No text found in this image. Try a clearer photo."); setStep("error"); return;
      }
      setOcr(data); setStep("ocr-done");
    } catch {
      setErrMsg("Network error. Please check your connection."); setStep("error");
    }
  }

  /* ── STEP 2: Translate extracted text → navigate to result page ── */
  async function onTranslate() {
    if (!ocr?.extractedText || selected.length === 0 || step === "translating") return;
    stop(); setStep("translating"); setTranslations([]); setErrMsg("");

    try {
      const res  = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocr.extractedText, languages: selected }),
      });
      const json = await res.json();
      if (!json.ok) { setErrMsg(json.error ?? "Translation failed."); setStep("error"); return; }

      // Store result in sessionStorage and navigate to dedicated result page
      sessionStorage.setItem("sl_scan_result", JSON.stringify({
        ocr,
        preview,
        detectedLang: json.data.detectedLang,
        translations: json.data.results,
        selectedLangs: selected,
      }));
      router.push("/scan/result");
    } catch {
      setErrMsg("Network error. Please check your connection."); setStep("error");
    }
  }

  function toggleLang(lang: string) {
    setSelected((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]);
  }

  function onReset() {
    stop(); setPreview(null); setImgLoaded(false); setOcr(null);
    setTranslations([]); setStep("upload"); setErrMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => showToast("Copied!"));
  }

  const isLoading   = step === "translating";
  const uploadClass = ["upload-zone", preview ? "upload-zone--filled" : "", isDragging ? "upload-zone--dragging" : ""].filter(Boolean).join(" ");

  return (
    <main className="inner-page">

      {/* Toast */}
      {toast && <div className="toast toast--success" role="status"><CheckIcon size={15} /> {toast}</div>}

      {/* Back */}
      <Link href="/" className="back-btn"><ChevronIcon /> Back to Home</Link>

      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Scan a Sign</h1>
        <p className="page-sub">Upload or photograph any sign — AI extracts the text, you choose the language</p>
      </div>

      {/* ── STEP INDICATOR ── */}
      <div className="scan-steps">
        <div className={`scan-step ${["upload","translating","ocr-done","translated","error"].includes(step) ? "scan-step--done" : ""} scan-step--active`}>
          <span className="scan-step-num">1</span>
          <span className="scan-step-label">Upload & Extract Text</span>
        </div>
        <div className="scan-step-line" />
        <div className={`scan-step ${step === "ocr-done" || step === "translated" || (step === "translating" && !!ocr) ? "scan-step--active" : ""} ${step === "translated" ? "scan-step--done" : ""}`}>
          <span className="scan-step-num">2</span>
          <span className="scan-step-label">Choose Language & Translate</span>
        </div>
        <div className="scan-step-line" />
        <div className={`scan-step ${step === "translated" ? "scan-step--active scan-step--done" : ""}`}>
          <span className="scan-step-num">3</span>
          <span className="scan-step-label">View Results</span>
        </div>
      </div>

      {/* ════════ STEP 1: IMAGE INPUT ════════ */}
      <div className="scan-card">

        {/* Mode toggle */}
        <div className="mode-toggle">
          <button className={`mode-btn${inputMode === "upload" ? " mode-btn--on" : ""}`} onClick={switchToUpload}>
            <UploadIcon size={13} /> Upload
          </button>
          <button className={`mode-btn${inputMode === "camera" ? " mode-btn--on" : ""}`} onClick={switchToCamera}>
            <CameraIcon size={13} /> Camera
          </button>
        </div>

        {/* Camera */}
        {inputMode === "camera" && (
          <div className="camera-zone">
            {cameraErr ? (
              <div className="camera-err">
                <ErrIcon /><span>{cameraErr}</span>
                <button className="btn btn--outline" onClick={switchToUpload}>Use Upload Instead</button>
              </div>
            ) : (
              <>
                <div className="camera-frame">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video ref={videoRef} className="camera-video" playsInline autoPlay muted />
                  <div className="camera-corners">
                    <span className="corner corner--tl" /><span className="corner corner--tr" />
                    <span className="corner corner--bl" /><span className="corner corner--br" />
                  </div>
                  {!cameraReady && <div className="camera-loading"><Spinner /> Starting camera…</div>}
                </div>
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <button className="btn btn--primary capture-btn" onClick={captureFrame} disabled={!cameraReady}>
                  <CameraIcon size={15} /> Capture Photo
                </button>
              </>
            )}
          </div>
        )}

        {/* Upload zone */}
        {inputMode === "upload" && (
          <>
            <div
              className={uploadClass}
              onClick={() => !isLoading && !preview && fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              aria-label="Upload sign image"
            >
              {preview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Uploaded sign"
                    className={`preview-img${imgLoaded ? " preview-img--loaded" : ""}`}
                    onLoad={() => setImgLoaded(true)} />
                  {isLoading && <div className="scan-overlay"><span className="scan-line" /></div>}
                </>
              ) : (
                <div className="upload-placeholder">
                  <UploadIcon size={32} />
                  <span className="upload-label">{isDragging ? "Drop to upload" : "Drop a photo or tap to browse"}</span>
                  <span className="upload-hint">JPG · PNG · WEBP · max 10 MB</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </>
        )}

        {/* Action buttons */}
        {inputMode === "upload" && (
          <div className="actions">
            {preview && (
              <button className="btn btn--ghost" onClick={onReset} disabled={isLoading}>
                Clear
              </button>
            )}
            {preview && step !== "ocr-done" && step !== "translated" && (
              <button className="btn btn--primary" onClick={onScan} disabled={isLoading}>
                {isLoading && !ocr ? <><Spinner /> Extracting text…</> : "⚡ Extract Text from Image"}
              </button>
            )}
            {(step === "ocr-done" || step === "translated") && (
              <button className="btn btn--ghost" onClick={onScan} disabled={isLoading}>
                Re-scan
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="error-box" role="alert">
            <ErrIcon /><span>{errMsg}</span>
            <button className="retry-btn" onClick={preview ? onScan : onReset}>
              {preview ? "Retry" : "Reset"}
            </button>
          </div>
        )}
      </div>

      {/* ════════ STEP 2: OCR RESULT + LANGUAGE PICKER ════════ */}
      {ocr && (step === "ocr-done" || (isLoading && !!ocr)) && (
        <div className="scan-ocr-card">

          {/* Extracted text */}
          <div className="scan-ocr-header">
            <span className="result-section-label">📄 Extracted Text</span>
            <button className="tr-action-btn" onClick={() => copyText(ocr.extractedText)} title="Copy text">
              <CopyIcon />
            </button>
          </div>
          <p className="scan-ocr-text">{ocr.extractedText}</p>

          {/* Meta row */}
          <div className="scan-ocr-meta">
            <span className="detected-lang">Language: <strong>{ocr.detectedLanguage}</strong></span>
            <span className={`confidence confidence--${ocr.confidence.toLowerCase()}`}>{ocr.confidence}</span>
            {ocr.signType && ocr.signType !== "unknown" && (
              <span className="sign-type-badge-sm">
                {SIGN_ICONS[ocr.signType] || "🔍"} {ocr.signType}
              </span>
            )}
          </div>

          {/* Context hint */}
          {ocr.contextHint && (
            <div className="scan-context-hint">
              💡 {ocr.contextHint}
            </div>
          )}

          {/* OCR correction */}
          {ocr.didYouMean && (
            <div className="scan-did-you-mean">
              <span className="scan-dym-label">Did you mean?</span>
              <span className="scan-dym-text">{ocr.didYouMean}</span>
              <button className="scan-dym-use" onClick={() => setOcr({ ...ocr, extractedText: ocr.didYouMean, didYouMean: "" })}>
                Use this
              </button>
            </div>
          )}

          {/* ── Language selector ── */}
          <div className="scan-lang-section">
            <div className="scan-lang-header">
              <span className="lang-selector-label">Translate into</span>
              <div className="lang-selector-controls">
                <button className="selector-ctrl" onClick={() => setSelected([...INDIAN_LANGS, ...INTERNATIONAL_LANGS])}>All</button>
                <span className="selector-sep">·</span>
                <button className="selector-ctrl" onClick={() => setSelected([])}>None</button>
              </div>
            </div>

            <div className="lang-group">
              <span className="lang-group-label">🇮🇳 Indian</span>
              <div className="lang-chips">
                {INDIAN_LANGS.map((lang) => (
                  <button key={lang}
                    className={`lang-chip${selected.includes(lang) ? " lang-chip--on" : ""}`}
                    onClick={() => toggleLang(lang)}>
                    {selected.includes(lang) && <CheckIcon size={10} />}{lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="lang-group">
              <span className="lang-group-label">🌍 International</span>
              <div className="lang-chips">
                {INTERNATIONAL_LANGS.map((lang) => (
                  <button key={lang}
                    className={`lang-chip lang-chip--intl${selected.includes(lang) ? " lang-chip--on" : ""}`}
                    onClick={() => toggleLang(lang)}>
                    {selected.includes(lang) && <CheckIcon size={10} />}{LANG_FLAGS[lang]} {lang}
                  </button>
                ))}
              </div>
            </div>

            {selected.length === 0 && <p className="selector-warn">Select at least one language.</p>}
          </div>

          {/* TTS speed + Translate button */}
          <div className="scan-translate-row">
            <div className="tts-speed-row">
              <span className="tts-speed-label">Speed</span>
              <div className="tts-speed">
                {([0.75, 1, 1.25] as SpeakSpd[]).map((s) => (
                  <button key={s} className={`speed-btn${speed === s ? " speed-btn--on" : ""}`}
                    onClick={() => setSpeed(s)}>{s}x</button>
                ))}
              </div>
            </div>
            <button className="btn btn--primary btn--full" onClick={onTranslate}
              disabled={selected.length === 0 || isLoading}>
              {isLoading && !!ocr
                ? <><Spinner /> Translating into {selected.length} language{selected.length > 1 ? "s" : ""}…</>
                : <>Translate into {selected.length} language{selected.length !== 1 ? "s" : ""}</>}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
function ChevronIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function UploadIcon({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
}
function CameraIcon({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
}
function CheckIcon({ size = 11 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function CopyIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}
function SpeakerIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
}
function ShareIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
}
function ErrIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
function Spinner() { return <span className="spinner" aria-hidden="true" />; }
