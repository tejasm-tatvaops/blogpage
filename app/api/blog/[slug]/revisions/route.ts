import { NextResponse } from "next/server";
import { getRevisionsForBlog } from "@/lib/revisionService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const revisions = await getRevisionsForBlog(decodeURIComponent(slug));
    return NextResponse.json({ revisions }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch revisions." }, { status: 500 });
  }
}
