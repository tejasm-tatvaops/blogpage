import { NextResponse } from "next/server";
import { z } from "zod";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import {
  getTutorialProgress,
  markTutorialCompleted,
  markTutorialStepComplete,
} from "@/lib/tutorialProgressService";

const schema = z.object({
  action: z.enum(["complete", "step"]),
  step_key: z.string().trim().min(1).max(200).optional(),
});

function identityFromRequest(request: Request): string {
  const fp = getFingerprintFromRequest(request);
  if (fp) return `fp:${fp}`;
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  return `ip:${ip}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const identityKey = identityFromRequest(request);
  const progress = await getTutorialProgress(identityKey, decodeURIComponent(slug));
  if (!progress) return NextResponse.json({ error: "Tutorial not found." }, { status: 404 });
  return NextResponse.json({ progress });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const identityKey = identityFromRequest(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  if (parsed.data.action === "complete") {
    const res = await markTutorialCompleted(identityKey, decodeURIComponent(slug));
    if (!res.ok) return NextResponse.json({ error: "Tutorial not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const res = await markTutorialStepComplete({
    identityKey,
    tutorialSlug: decodeURIComponent(slug),
    stepKey: parsed.data.step_key ?? "",
  });
  if (!res.ok) return NextResponse.json({ error: "Invalid step update." }, { status: 400 });
  return NextResponse.json(res);
}
