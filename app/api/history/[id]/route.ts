import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import History from "@/lib/models/History";

export async function DELETE(
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
    // Only delete if the item belongs to this user
    const deleted = await History.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Not found or unauthorized." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Database error.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
