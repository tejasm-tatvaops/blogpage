import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { connectToDatabase } from "@/lib/mongodb";
import { ContentIngestionJobModel } from "@/models/ContentIngestionJob";

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  await connectToDatabase();
  const drafts = await ContentIngestionJobModel.find({
    output_type: "tutorial",
    status: { $in: ["pending", "processing", "ready"] },
  })
    .sort({ created_at: -1 })
    .limit(100)
    .select("_id status output_type draft_type publish_target ai_title ai_excerpt created_at updated_at")
    .lean();

  return NextResponse.json({ drafts });
}
