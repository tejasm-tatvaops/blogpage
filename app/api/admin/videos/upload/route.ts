import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/x-matroska",
]);

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing video file." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Video must be between 1 byte and 500 MB." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported video format." }, { status: 400 });
  }

  const ext = path.extname(file.name || "").toLowerCase() || ".mp4";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "videos");
  await mkdir(uploadDir, { recursive: true });
  const target = path.join(uploadDir, safeName);

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(target, bytes);

  const origin = new URL(request.url).origin;
  return NextResponse.json({ videoUrl: `${origin}/uploads/videos/${safeName}` }, { status: 201 });
}

