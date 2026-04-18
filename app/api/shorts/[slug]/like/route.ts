import { NextResponse } from "next/server";
import { toggleVideoLike } from "@/lib/videoService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    let direction: "like" | "unlike" = "like";
    try {
      const body = (await request.json()) as { direction?: string };
      if (body.direction === "unlike") direction = "unlike";
    } catch {
      // default to like
    }
    const result = await toggleVideoLike(slug, direction);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to update like." }, { status: 500 });
  }
}
