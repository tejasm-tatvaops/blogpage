import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { updateSiteJournalEntryByIdAdmin } from "@/lib/siteJournalService";

const schema = z.object({
  moderation_status: z.enum(["clean", "flagged", "restricted"]).optional(),
  ai_insight: z.string().trim().max(2000).optional(),
  risk_level: z.enum(["low", "medium", "high"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const isAdmin = await requireAdminApiAccess();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const body = (await request.json()) as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    const { entryId } = await params;
    const entry = await updateSiteJournalEntryByIdAdmin(entryId, parsed.data);
    if (!entry) return NextResponse.json({ error: "Site journal entry not found." }, { status: 404 });
    return NextResponse.json({ entry }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to moderate site journal entry." }, { status: 500 });
  }
}
