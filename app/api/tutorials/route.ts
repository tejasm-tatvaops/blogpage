import { NextResponse } from "next/server";
import { getTutorials, getLearningPaths } from "@/lib/tutorialService";
import { getSystemToggles } from "@/lib/systemToggles";
import type { TutorialDifficulty } from "@/models/Tutorial";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page       = Math.max(1, Number(searchParams.get("page")  ?? "1"));
  const limit      = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const difficulty = searchParams.get("difficulty") as TutorialDifficulty | null;
  const tag        = searchParams.get("tag");
  const query      = searchParams.get("q");
  const path       = searchParams.get("path");
  const pathsOnly  = searchParams.get("paths") === "true";

  if (!getSystemToggles().tutorialsEnabled) {
    return NextResponse.json({ error: "Tutorials section is currently disabled." }, { status: 503 });
  }

  try {
    if (pathsOnly) {
      const paths = await getLearningPaths();
      return NextResponse.json({ paths }, { headers: { "Cache-Control": "public, s-maxage=60" } });
    }

    const result = await getTutorials({ page, limit, difficulty, tag, query, learningPathSlug: path });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch tutorials." }, { status: 500 });
  }
}
