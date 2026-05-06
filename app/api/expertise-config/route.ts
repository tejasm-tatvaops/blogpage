import { NextResponse } from "next/server";
import { getExpertiseConfig } from "@/lib/expertiseConfigService";

export async function GET() {
  try {
    const config = await getExpertiseConfig();
    return NextResponse.json(config, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to load expertise config." }, { status: 500 });
  }
}
