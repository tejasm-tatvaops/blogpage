import { NextResponse } from "next/server";
import { getTrendingCandidatesMultiWindow } from "@/lib/blogService";

export const revalidate = 300; // cache for 5 minutes

export async function GET() {
  try {
    const posts = await getTrendingCandidatesMultiWindow(6);
    return NextResponse.json({ posts }, { status: 200 });
  } catch (err) {
    console.error("[trending]", err);
    return NextResponse.json({ posts: [] }, { status: 200 });
  }
}
