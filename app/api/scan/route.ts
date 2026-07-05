import { NextRequest, NextResponse } from "next/server";

/* ── Step 1: OCR only — extract text + detect language ───────────────────── */

const GEMINI_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_MODEL   = "google/gemini-2.0-flash-lite-001";

async function callGemini(content: object[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith("PASTE") || apiKey.startsWith("your_")) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const res = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer":  "https://streetlingo.app",
      "X-Title":       "StreetLingo",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      messages: [{ role: "user", content }],
      temperature: 0.1,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

const OCR_PROMPT = `You are an expert OCR engine. Look at this image carefully.

Tasks:
1. Extract ALL visible text exactly as it appears in the image.
2. Detect the language of the extracted text.
3. Classify the sign type: direction, warning, shop, place, informational, religious, transport, or unknown.
4. Write one short traveler-friendly context hint (what this sign means in real life).
5. Rate OCR confidence: High, Medium, or Low.
6. If text looks garbled or uncertain, suggest a correction in "didYouMean" (empty string if confident).

Rules:
- Return ONLY valid JSON. No markdown, no code fences.
- If no text is visible, set extractedText to "" and confidence to "Low".

Required JSON format:
{
  "extractedText": "<all text from image>",
  "detectedLanguage": "<language name>",
  "signType": "<direction|warning|shop|place|informational|religious|transport|unknown>",
  "contextHint": "<one sentence real-world explanation>",
  "confidence": "<High|Medium|Low>",
  "didYouMean": "<corrected text or empty string>"
}`;

export interface OCRResult {
  extractedText:    string;
  detectedLanguage: string;
  signType:         string;
  contextHint:      string;
  confidence:       string;
  didYouMean:       string;
}

function parseOCR(raw: string): OCRResult {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match   = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return fallback();
  try {
    const p = JSON.parse(match[0]);
    const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    return {
      extractedText:    s(p.extractedText),
      detectedLanguage: s(p.detectedLanguage) || "Unknown",
      signType:         s(p.signType)         || "unknown",
      contextHint:      s(p.contextHint),
      confidence:       s(p.confidence)       || "Medium",
      didYouMean:       s(p.didYouMean),
    };
  } catch {
    return fallback();
  }
}

function fallback(): OCRResult {
  return {
    extractedText: "", detectedLanguage: "Unknown",
    signType: "unknown", contextHint: "",
    confidence: "Low", didYouMean: "",
  };
}

function err(msg: string, status: number) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return err("Request body must be valid JSON.", 400); }

  if (typeof body !== "object" || body === null) return err("Invalid body.", 400);
  const { image } = body as Record<string, unknown>;

  if (typeof image !== "string" || !image.trim()) return err('"image" is required.', 400);
  if (image.length > 14_000_000) return err("Image too large. Max 10 MB.", 413);
  if (!image.startsWith("data:image/") && !/^[A-Za-z0-9+/]+=*$/.test(image)) {
    return err('"image" must be a valid base64 image.', 400);
  }

  try {
    const base64 = image.includes(",") ? image.split(",")[1] : image;
    const mime   = image.startsWith("data:image/png") ? "image/png"
                 : image.startsWith("data:image/webp") ? "image/webp"
                 : "image/jpeg";

    const raw = await callGemini([
      { type: "text",      text: OCR_PROMPT },
      { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
    ]);

    const data = parseOCR(raw);
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error.";
    if (msg.includes("not configured"))    return err("AI service not configured. Check GEMINI_API_KEY.", 503);
    if (msg.startsWith("Gemini API error")) return err(msg, 502);
    return err("Failed to scan image. Please try again.", 500);
  }
}

export async function GET() {
  return err("Method not allowed. Use POST.", 405);
}
