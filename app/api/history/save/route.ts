import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import History from "@/lib/models/History";

interface SaveBody {
  type:          string;
  inputText:     string;
  languages:     string[];
  detectedLang?: string;
  isFavorite?:   boolean;
  results:       { language: string; script: string; roman: string }[];
}

function err(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  const session = await auth();

  // Guests: accept the call but skip DB save (they use localStorage)
  if (!session?.user) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const userId = (session.user as { userId?: string }).userId;
  if (!userId) return NextResponse.json({ ok: true, skipped: true });

  let body: unknown;
  try { body = await req.json(); }
  catch { return err("Invalid JSON body."); }

  if (typeof body !== "object" || body === null) return err("Invalid body.");

  const b = body as Partial<SaveBody>;

  if (!b.type || !b.inputText || !Array.isArray(b.languages) || !Array.isArray(b.results)) {
    return err("Missing required fields.");
  }
  if (b.inputText.trim().length === 0) return err("inputText must not be empty.");

  const validTypes = ["translate", "transliterate", "scan"] as const;
  if (!validTypes.includes(b.type as typeof validTypes[number])) {
    return err("Invalid type.");
  }

  try {
    await connectDB();
    const item = await History.create({
      userId,
      type:        b.type,
      inputText:   b.inputText.trim(),
      languages:   b.languages,
      detectedLang: b.detectedLang ?? "Unknown",
      results:     b.results,
      isFavorite:  b.isFavorite ?? false,
    });
    return NextResponse.json({ ok: true, data: item }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Database error.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
