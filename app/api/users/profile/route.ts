import { NextResponse } from "next/server";
import { getUserProfileByIdentityKey } from "@/lib/userProfileService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identityKey = searchParams.get("identity")?.trim() ?? searchParams.get("identity_key")?.trim() ?? "";
    if (!identityKey) return NextResponse.json({ user: null }, { status: 200 });

    const user = await getUserProfileByIdentityKey(identityKey);
    return NextResponse.json({ user }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
