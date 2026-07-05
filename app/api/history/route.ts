import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import History from "@/lib/models/History";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    // Guest: return empty — they use localStorage
    return NextResponse.json({ ok: true, data: [] });
  }

  const userId = (session.user as { userId?: string }).userId;
  if (!userId) return NextResponse.json({ ok: true, data: [] });

  try {
    await connectDB();
    const items = await History.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return NextResponse.json({ ok: true, data: items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Database error.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
