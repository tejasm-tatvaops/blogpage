import { NextResponse } from "next/server";
import { incrementViewCount, trackViewEvent } from "@/lib/blogService";
import { recordUserActivity } from "@/lib/userProfileService";
import { awardPoints } from "@/lib/services/reputation.service";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";

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

    await trackViewEvent({
      slug,
      referrerHost: getReferrerHost(request.headers.get("referer")),
      userAgent: request.headers.get("user-agent"),
    });

    const viewerIdentityKey = await getIdentityKeyFromSessionOrRequest(request);

    void recordUserActivity({
      request,
      identityKeyOverride: viewerIdentityKey,
      action: "blog_view",
      lastBlogSlug: slug,
    });
    void awardPoints({
      identityKey: viewerIdentityKey,
      reason: "article_view_received",
      sourceContentSlug: slug,
      sourceContentType: "blog",
      eventKey: `blog-view:${viewerIdentityKey}:${slug}:${Math.floor(Date.now() / 3_600_000)}`,
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
