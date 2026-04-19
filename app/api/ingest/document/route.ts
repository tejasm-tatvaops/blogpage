/**
 * POST /api/ingest/document — Accept a text body extracted from PDF/DOC.
 *
 * Note: PDF/DOC binary parsing is done client-side (the admin UI uses
 * pdf.js / mammoth.js in the browser) and sends the extracted text here.
 * This keeps the server dependency footprint minimal.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { createIngestionJob } from "@/lib/ingestionService";
import { getSystemToggles } from "@/lib/systemToggles";
import type { IngestionSourceType, IngestionOutputType } from "@/models/ContentIngestionJob";

const schema = z.object({
  extracted_text: z.string().trim().min(50).max(200_000),
  filename:       z.string().trim().max(255).optional(),
  source_type:    z.enum(["pdf", "doc", "paste"]).default("paste"),
  output_type:    z.enum(["blog", "forum", "short_caption", "tutorial"]).optional(),
});

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  if (!getSystemToggles().ingestionEnabled) {
    return NextResponse.json({ error: "Ingestion is currently disabled." }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });

  const job = await createIngestionJob({
    initiatorIdentityKey: "admin:system",
    sourceType:   parsed.data.source_type as IngestionSourceType,
    sourceText:   parsed.data.extracted_text,
    sourceFilename: parsed.data.filename ?? null,
    outputType:   (parsed.data.output_type ?? "blog") as IngestionOutputType,
  });

  return NextResponse.json({ job_id: String(job._id), status: job.status }, { status: 201 });
}
