import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
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

  // Vercel serverless filesystem is not persistent/public writable.
  // Store production uploads in Blob and keep local disk writes for dev.
  if (process.env.VERCEL === "1" || process.env.VERCEL_ENV) {
    try {
      const blobToken =
        process.env.bbbb_READ_WRITE_TOKEN ??
        process.env.BLOB_PUBLIC_READ_WRITE_TOKEN ??
        process.env.BLOB_READ_WRITE_TOKEN;
      const blob = await put(`tutorial-videos/${safeName}`, file, {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type || "video/mp4",
        token: blobToken,
      });
      return NextResponse.json({ videoUrl: blob.url }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Blob upload failed.";
      return NextResponse.json(
        { error: `Video upload failed in production storage. ${message}` },
        { status: 500 },
      );
    }
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "videos");
  await mkdir(uploadDir, { recursive: true });
  const target = path.join(uploadDir, safeName);

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(target, bytes);

  return NextResponse.json({ videoUrl: `/uploads/videos/${safeName}` }, { status: 201 });
}

