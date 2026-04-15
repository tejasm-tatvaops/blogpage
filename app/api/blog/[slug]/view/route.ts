import { NextResponse } from "next/server";
import { incrementViewCount, trackViewEvent } from "@/lib/blogService";

type ViewRouteProps = {
  params: Promise<{ slug: string }>;
};

const getReferrerHost = (value: string | null): string => {
  if (!value) return "direct";
  try {
    return new URL(value).host || "direct";
  } catch {
    return "direct";
  }
};

export async function POST(request: Request, { params }: ViewRouteProps) {
  try {
    const { slug } = await params;
    const count = await incrementViewCount(slug);

    if (count === null) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    void trackViewEvent({
      slug,
      referrerHost: getReferrerHost(request.headers.get("referer")),
      userAgent: request.headers.get("user-agent"),
    });

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
