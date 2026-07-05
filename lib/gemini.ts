const GEMINI_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_MODEL   = "llama-3.3-70b-versatile";

/* ── Shared types ────────────────────────────────────────────────────────── */

export interface LanguageResult {
  language: string;
  script:   string;
  roman:    string;
}

export interface TranslateResult {
  original:     string;
  detectedLang: string;
  results:      LanguageResult[];
}

export type SignType = "direction" | "warning" | "shop" | "place" | "informational" | "religious" | "transport" | "unknown";

export interface SignAnalysis {
  originalText:    string;
  language:        string;
  transliteration: string;
  translation:     string;
  confidence:      string;          // "High" | "Medium" | "Low"
  signType:        SignType;
  contextHint:     string;          // e.g. "This sign points to a hospital 500m ahead"
  didYouMean:      string;          // OCR correction suggestion, empty if confident
  uncertainWords:  string[];        // words AI is unsure about
  multiLang:       LanguageResult[];
}

/* ── API key helper ──────────────────────────────────────────────────────── */

async function getKey(): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith("PASTE") || apiKey.startsWith("your_")) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return apiKey;
}

/* ── Raw Gemini call ─────────────────────────────────────────────────────── */

async function callGemini(inputs: object[]): Promise<string> {
  const apiKey = await getKey();

  const content = inputs.map((p) => {
    const part = p as Record<string, unknown>;
    if (typeof part.text === "string") return { type: "text", text: part.text };
    if (part.inline_data) {
      const d = part.inline_data as { mime_type: string; data: string };
      return { type: "image_url", image_url: { url: `data:${d.mime_type};base64,${d.data}` } };
    }
    return { type: "text", text: "" };
  });

  const res = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      messages: [{ role: "user", content }],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/* ── Transliteration ────────────────────────────────────────────────────── */

export interface TransliterateResult {
  original:     string;
  detectedLang: string;
  direction:    "to-roman" | "to-script";
  results: {
    language: string;
    script:   string;
    roman:    string;
    note:     string;
  }[];
}

const TRANSLITERATE_PROMPT = (text: string, targetLangs: string[]) => {
  const langList = targetLangs.join(", ");
  return `You are an expert in phonetic transliteration of Indian and international languages.

Input text: "${text}"

Instructions:
1. Detect the language/script of the input.
2. Determine direction:
   - If input is in Roman/English letters → convert to native script of each target language (sound mapping, NOT translation).
   - If input is in a native script → convert to Roman letters showing how it sounds.
3. For EACH target language provide:
   - "script": the text written in that language's native script (sound-mapped, not translated)
   - "roman": simple English pronunciation guide (no diacritics)
   - "note": one short sentence explaining the sound mapping

Critical rules:
- This is TRANSLITERATION (sound mapping), NOT translation (meaning mapping).
- "Hello" → ஹலோ (Tamil), हेलो (Hindi) — same sound, different script.
- "தமிழ்" → "Thamizh" — same sound in Roman.
- Return ONLY valid JSON. No markdown, no code fences.

Target languages: ${langList}

Required format:
{
  "original": "${text}",
  "detectedLang": "<detected language>",
  "direction": "to-roman" | "to-script",
  "results": [
    { "language": "Tamil", "script": "...", "roman": "...", "note": "..." }
  ]
}`;
};

export const TRANSLITERATE_LANGUAGES = [
  "Tamil", "Hindi", "Telugu", "Malayalam", "Kannada",
  "Bengali", "Marathi", "Gujarati", "Punjabi", "Urdu",
  "English", "French", "German", "Spanish",
  "Chinese", "Japanese", "Russian", "Arabic",
];

export async function transliterateText(text: string, languages: string[]): Promise<TransliterateResult> {
  const raw = await callGemini([{ text: TRANSLITERATE_PROMPT(text, languages) }]);
  return parseTransliterate(raw, text);
}

function parseTransliterate(raw: string, original: string): TransliterateResult {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match   = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return { original, detectedLang: "Unknown", direction: "to-script", results: [] };
  try {
    const p = JSON.parse(match[0]);
    return {
      original:     str(p.original)     || original,
      detectedLang: str(p.detectedLang) || "Unknown",
      direction:    p.direction === "to-roman" ? "to-roman" : "to-script",
      results: Array.isArray(p.results)
        ? p.results.map((r: Record<string, unknown>) => ({
            language: str(r.language),
            script:   str(r.script),
            roman:    str(r.roman),
            note:     str(r.note),
          }))
        : [],
    };
  } catch {
    return { original, detectedLang: "Unknown", direction: "to-script", results: [] };
  }
}

/* ── Text translation ────────────────────────────────────────────────────── */

const TRANSLATE_PROMPT = (text: string, languages: string[]) => {
  const langList = languages.join(", ");
  const examples = languages.map(l => `{ "language": "${l}", "script": "<translated ${l} text>", "roman": "<pronunciation guide>" }`).join(",\n    ");
  return `You are an expert multilingual translator for Indian and international languages.

Input text:
"""
${text}
"""

Instructions:
1. Detect the language of the input.
2. Translate the FULL text into each target language — preserve ALL structure:
   - Keep emojis exactly as they are
   - Keep prices (₹20, ₹100 etc.) exactly as they are
   - Keep line breaks and section headings
   - Translate menu items, labels, and descriptions naturally
   - If input is a menu/list, translate each item name but keep prices unchanged
3. For "roman" field: provide a simple pronunciation guide for the translated script (no diacritics).
4. If the input is already in the target language, return it as-is.

Rules:
- Translate the COMPLETE text, not just a summary.
- Return ONLY valid JSON. No markdown, no code fences, no explanation.
- Keep ₹ prices, numbers, and emojis unchanged in all translations.

Target languages: ${langList}

Required format:
{
  "original": ${JSON.stringify(text.slice(0, 120) + (text.length > 120 ? "..." : ""))},
  "detectedLang": "<language name>",
  "results": [
    ${examples}
  ]
}`;
};

export const ALL_LANGUAGES = [
  "Tamil", "Hindi", "Telugu", "Malayalam", "Kannada",
  "Bengali", "Marathi", "Gujarati", "Punjabi", "Urdu",
  "English", "French", "German", "Spanish",
  "Chinese", "Japanese", "Russian", "Arabic",
];

export async function translateText(text: string, languages: string[]): Promise<TranslateResult> {
  const raw = await callGemini([{ text: TRANSLATE_PROMPT(text, languages) }]);
  return parseTranslate(raw, text);
}

function parseTranslate(raw: string, original: string): TranslateResult {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  // Try to find the outermost JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return translateFallback(original);
  let jsonStr = match[0];
  // If JSON is truncated (common with long menus), try to close it
  try {
    return buildTranslateResult(JSON.parse(jsonStr), original);
  } catch {
    // Attempt to repair truncated JSON by closing open arrays/objects
    try {
      const repaired = repairJSON(jsonStr);
      return buildTranslateResult(JSON.parse(repaired), original);
    } catch {
      return translateFallback(original);
    }
  }
}

function buildTranslateResult(p: Record<string, unknown>, original: string): TranslateResult {
  return {
    original:     str(p.original)     || original,
    detectedLang: str(p.detectedLang) || "Unknown",
    results: Array.isArray(p.results)
      ? p.results.map((r: Record<string, unknown>) => ({
          language: str(r.language),
          script:   str(r.script),
          roman:    str(r.roman),
        }))
      : [],
  };
}

// Close unclosed JSON brackets/braces from truncated responses
function repairJSON(s: string): string {
  const stack: string[] = [];
  let inStr = false; let escape = false;
  for (const ch of s) {
    if (escape)          { escape = false; continue; }
    if (ch === "\\")     { escape = true;  continue; }
    if (ch === '"')      { inStr = !inStr; continue; }
    if (inStr)           continue;
    if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  return s + stack.reverse().join("");
}

function translateFallback(original: string): TranslateResult {
  return { original, detectedLang: "Unknown", results: [] };
}

/* ── Image scan ──────────────────────────────────────────────────────────── */

const SCAN_PROMPT = `You are an expert AI travel assistant analyzing a photo of a sign for a traveler visiting India.

Tasks:
1. Extract ALL visible text from the sign exactly as written.
2. Detect the language of the sign.
3. Classify the sign type — choose ONE from: direction, warning, shop, place, informational, religious, transport, unknown.
4. Provide a short real-world context hint (1 sentence, traveler-friendly, e.g. "This sign points to a hospital 500m ahead").
5. Provide a natural English transliteration (how the original text sounds aloud).
6. Provide a short traveler-friendly English meaning (under 15 words).
7. Rate your confidence in the OCR extraction: High, Medium, or Low.
8. If the extracted text looks uncertain or garbled, provide a "didYouMean" correction suggestion (empty string if confident).
9. List any individual words you are uncertain about in "uncertainWords" array (empty array if none).
10. Translate the sign text into Tamil, Hindi, Telugu, Malayalam, Kannada, English, French, German, Spanish, Chinese, Japanese, Russian, Arabic — each with native script and romanisation.

Rules:
- Return ONLY valid JSON. No markdown, no code fences.
- If no text is visible, set originalText to "" and confidence to "Low".
- signType must be exactly one of: direction, warning, shop, place, informational, religious, transport, unknown.

Required format:
{
  "originalText": "",
  "language": "",
  "signType": "direction | warning | shop | place | informational | religious | transport | unknown",
  "contextHint": "",
  "transliteration": "",
  "translation": "",
  "confidence": "High | Medium | Low",
  "didYouMean": "",
  "uncertainWords": [],
  "multiLang": [
    { "language": "Tamil",     "script": "...", "roman": "..." },
    { "language": "Hindi",     "script": "...", "roman": "..." },
    { "language": "Telugu",    "script": "...", "roman": "..." },
    { "language": "Malayalam", "script": "...", "roman": "..." },
    { "language": "Kannada",   "script": "...", "roman": "..." },
    { "language": "English",   "script": "...", "roman": "..." },
    { "language": "French",    "script": "...", "roman": "..." },
    { "language": "German",    "script": "...", "roman": "..." },
    { "language": "Spanish",   "script": "...", "roman": "..." },
    { "language": "Chinese",   "script": "...", "roman": "..." },
    { "language": "Japanese",  "script": "...", "roman": "..." },
    { "language": "Russian",   "script": "...", "roman": "..." },
    { "language": "Arabic",    "script": "...", "roman": "..." }
  ]
}`;

export async function analyzeImage(imageBase64: string): Promise<SignAnalysis> {
  const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  const mimeType   = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  const raw = await callGemini([
    { text: SCAN_PROMPT },
    { inline_data: { mime_type: mimeType, data: base64Data } },
  ]);

  return parseScan(raw);
}

function parseScan(raw: string): SignAnalysis {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match   = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return scanFallback();
  try {
    const p = JSON.parse(match[0]);
    return {
      originalText:    str(p.originalText),
      language:        str(p.language),
      signType:        normalizeSignType(p.signType),
      contextHint:     str(p.contextHint),
      transliteration: str(p.transliteration),
      translation:     str(p.translation),
      confidence:      normalizeConf(p.confidence),
      didYouMean:      str(p.didYouMean),
      uncertainWords:  Array.isArray(p.uncertainWords) ? p.uncertainWords.map(str) : [],
      multiLang: Array.isArray(p.multiLang)
        ? p.multiLang.map((r: Record<string, unknown>) => ({
            language: str(r.language),
            script:   str(r.script),
            roman:    str(r.roman),
          }))
        : [],
    };
  } catch {
    return scanFallback();
  }
}

function scanFallback(): SignAnalysis {
  return {
    originalText: "", language: "Unknown", signType: "unknown",
    contextHint: "", transliteration: "",
    translation: "Could not read the sign. Please try a clearer photo.",
    confidence: "Low", didYouMean: "", uncertainWords: [], multiLang: [],
  };
}

/* ── Utils ───────────────────────────────────────────────────────────────── */

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v == null) return "";
  return String(v).trim();
}

function normalizeConf(v: unknown): string {
  const s = str(v).toLowerCase();
  if (s === "high")   return "High";
  if (s === "medium") return "Medium";
  if (s === "low")    return "Low";
  return "Medium";
}

function normalizeSignType(v: unknown): SignType {
  const valid: SignType[] = ["direction","warning","shop","place","informational","religious","transport","unknown"];
  const s = str(v).toLowerCase() as SignType;
  return valid.includes(s) ? s : "unknown";
}
