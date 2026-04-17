import { NextResponse } from "next/server";
import { getUserProfileByDisplayName } from "@/lib/userProfileService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim() ?? "";
    if (!name) return NextResponse.json({ user: null }, { status: 200 });

    const user = await getUserProfileByDisplayName(name);
    return NextResponse.json({ user }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
