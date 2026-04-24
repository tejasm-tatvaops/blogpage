import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { rebuildSemanticIndex } from "@/lib/semanticGraphService";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SemanticDocumentModel } from "@/models/SemanticDocument";

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  await connectToDatabase();
  const [total, latest] = await Promise.all([
    SemanticDocumentModel.countDocuments({}),
    SemanticDocumentModel.findOne({})
      .sort({ updated_at: -1 })
      .select("updated_at")
      .lean(),
  ]);
  const lastIndexedAt = (latest as { updated_at?: Date } | null)?.updated_at ?? null;
  return NextResponse.json({ total, lastIndexedAt }, { status: 200 });
}

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const result = await rebuildSemanticIndex();
  return NextResponse.json({ ok: true, indexed: result.indexed }, { status: 200 });
}

