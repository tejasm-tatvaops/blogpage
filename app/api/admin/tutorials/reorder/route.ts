import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { dbConnect } from "@/lib/dbConnect";
import { TutorialModel } from "@/models/Tutorial";
import { z } from "zod";

const ReorderSchema = z.array(
  z.object({
    id:    z.string().min(1),
    order: z.number().int().min(0),
  })
).min(1).max(500);

export async function PATCH(req: NextRequest) {
  const authError = await requireAdminApiAccess(req);
  if (authError) return authError;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  await dbConnect();

  const ops = parsed.data.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { sort_order: order } },
    },
  }));

  await TutorialModel.bulkWrite(ops, { ordered: false });

  return NextResponse.json({ ok: true });
}
