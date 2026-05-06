import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { updateSiteJournalByIdAdmin } from "@/lib/siteJournalService";

const updateSchema = z.object({
  status: z.enum(["draft", "pending_review", "published", "archived"]).optional(),
  moderation_status: z.enum(["clean", "flagged", "restricted"]).optional(),
  featured: z.boolean().optional(),
  health_status: z.enum(["stable", "watch_procurement", "delay_risk", "stabilized"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAdmin = await requireAdminApiAccess();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const body = (await request.json()) as unknown;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    const { id } = await params;
    const journal = await updateSiteJournalByIdAdmin(id, parsed.data);
    if (!journal) return NextResponse.json({ error: "Site journal not found." }, { status: 404 });
    return NextResponse.json({ journal }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update site journal." }, { status: 500 });
  }
}
