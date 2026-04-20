import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { connectToDatabase } from "@/lib/mongodb";
import { TutorialModel } from "@/models/Tutorial";
import { z } from "zod";

const ReorderSchema = z.array(
  z.object({
    id:    z.string().min(1),
    order: z.number().int().min(0),
  })
).min(1).max(500);

export async function PATCH(req: NextRequest) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  await connectToDatabase();

  await Promise.all(
    parsed.data.map(({ id, order }) =>
      TutorialModel.updateOne(
        { _id: id },
        { $set: { sort_order: order } },
      ),
    ),
  );

  return NextResponse.json({ ok: true });
}
