import { NextResponse } from "next/server";
import { incrementVideoView } from "@/lib/videoService";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    await incrementVideoView(slug);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to record view." }, { status: 500 });
  }
}
