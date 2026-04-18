import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { connectToDatabase } from "@/lib/mongodb";
import { GenerationJobModel } from "@/models/GenerationJob";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const jobs = await GenerationJobModel.find()
    .sort({ created_at: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({ jobs });
}
