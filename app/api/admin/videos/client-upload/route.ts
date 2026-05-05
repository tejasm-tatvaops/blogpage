import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

const ALLOWED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/x-matroska",
];
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

export async function POST(request: Request) {
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });

  if (body.type === "blob.generate-client-token") {
    const authorized = await requireAdminApiAccess();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await handleUpload({
      body,
      request,
      token:
        process.env.bbbb_READ_WRITE_TOKEN ??
        process.env.BLOB_PUBLIC_READ_WRITE_TOKEN ??
        process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // No-op. Tutorial record creation happens after the client receives blob URL.
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate upload token.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
