import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import History from "@/lib/models/History";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const userId = (session.user as { userId?: string }).userId;
  const { id } = await params;

  if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });

  try {
    await connectDB();
    const item = await History.findOne({ _id: id, userId });
    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    item.isFavorite = !item.isFavorite;
    await item.save();
    return NextResponse.json({ ok: true, isFavorite: item.isFavorite });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Database error.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
