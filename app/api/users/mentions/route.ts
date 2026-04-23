import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AuthUserModel } from "@/models/User";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = String(searchParams.get("q") ?? "").trim().toLowerCase();

    await connectToDatabase();
    const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = rawQuery.length > 0 ? new RegExp(`^${escaped}`) : null;
    const users = await AuthUserModel.find(
      regex
        ? { username: { $regex: regex } }
        : { username: { $exists: true, $type: "string", $ne: "" } },
    )
      .select("username name")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    const suggestions = users
      .map((u) => ({
        username: String((u as { username?: string }).username ?? "").trim(),
        displayName: String((u as { name?: string }).name ?? "").trim(),
      }))
      .filter((u) => Boolean(u.username));

    return NextResponse.json({ suggestions }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
