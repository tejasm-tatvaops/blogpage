import { NextResponse } from "next/server";
import { incrementViewCount } from "@/lib/blogService";

type ViewRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function POST(_request: Request, { params }: ViewRouteProps) {
  try {
    const { slug } = await params;
    const count = await incrementViewCount(slug);

    if (count === null) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json(
      { views: count },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update view count." },
      { status: 500 },
    );
  }
}
