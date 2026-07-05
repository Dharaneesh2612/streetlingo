import { NextRequest, NextResponse } from "next/server";
import { transliterateText, type TransliterateResult } from "@/lib/gemini";

interface Ok  { ok: true;  data: TransliterateResult }
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
  const { text, languages } = body as Record<string, unknown>;

  if (typeof text !== "string" || !text.trim()) return err('Missing required field: "text".', 400);
  if (!Array.isArray(languages) || languages.length === 0) return err('Missing required field: "languages".', 400);
  if (text.trim().length > 500) return err("Text too long. Max 500 characters.", 400);

  try {
    const data = await transliterateText(text.trim(), languages as string[]);
    return NextResponse.json<Res>({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error.";
    if (msg.includes("not configured"))    return err("AI service is not configured. Check GEMINI_API_KEY.", 503);
    if (msg.startsWith("Gemini API error")) return err(msg, 502);
    return err("Failed to transliterate. Please try again.", 500);
  }
}

export async function GET() {
  return err("Method not allowed. Use POST.", 405);
}
