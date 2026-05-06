import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";

export async function GET() {
  const isAdmin = await requireAdminApiAccess();
  return NextResponse.json({ isAdmin }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
}
