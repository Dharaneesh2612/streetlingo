import { NextRequest, NextResponse } from "next/server";
import { translateText, type TranslateResult } from "@/lib/gemini";

interface Ok  { ok: true;  data: TranslateResult }
interface Err { ok: false; error: string }
type Res = Ok | Err;

function err(msg: string, status: number) {
  return NextResponse.json<Res>({ ok: false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return err("Request body must be valid JSON.", 400); }

  if (typeof body !== "object" || body === null) return err("Invalid request body.", 400);

  const b = body as Record<string, unknown>;
  const text = typeof b.text === "string" ? b.text.trim() : "";
  const languages: string[] = Array.isArray(b.languages)
    ? (b.languages as unknown[]).filter((l): l is string => typeof l === "string" && l.length > 0)
    : [];

  if (!text)               return err('"text" must not be empty.', 400);
  if (text.length > 5000)  return err("Text is too long. Max 5000 characters.", 400);
  if (languages.length === 0)  return err('"languages" must be a non-empty array.', 400);
  if (languages.length > 18)   return err('"languages" can contain at most 18 languages.', 400);

  try {
    const data = await translateText(text, languages);
    return NextResponse.json<Res>({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error.";
    if (msg.includes("not configured"))     return err("AI service is not configured. Check GEMINI_API_KEY.", 503);
    if (msg.startsWith("Gemini API error")) return err(msg, 502);
    return err("Translation failed. Please try again.", 500);
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed. Use POST." }, { status: 405 });
}
