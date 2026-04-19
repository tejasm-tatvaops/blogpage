import { NextResponse } from "next/server";
import { getTutorialBySlug } from "@/lib/tutorialService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const tutorial = await getTutorialBySlug(decodeURIComponent(slug));
    if (!tutorial) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ tutorial });
  } catch {
    return NextResponse.json({ error: "Failed to fetch tutorial." }, { status: 500 });
  }
}
