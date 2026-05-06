import { connectToDatabase } from "@/lib/db/mongodb";
import { ExpertiseConfigModel } from "@/models/ExpertiseConfig";
import {
  EXPERTISE_AREAS,
  EXPERTISE_BADGE_OPTIONS,
  PROFESSIONS,
} from "@/lib/expertiseIdentity";

export type ExpertiseConfig = {
  professions: string[];
  expertiseAreas: string[];
  badgeLabels: string[];
  updatedByAdmin: string | null;
  updatedByAdminAt: string | null;
};

const normalize = (value: string): string => value.trim();
const dedupeClean = (list: string[]): string[] =>
  [...new Set(list.map((item) => normalize(String(item ?? ""))).filter(Boolean))];

export const getDefaultExpertiseConfig = (): ExpertiseConfig => ({
  professions: [...PROFESSIONS],
  expertiseAreas: [...EXPERTISE_AREAS],
  badgeLabels: [...EXPERTISE_BADGE_OPTIONS],
  updatedByAdmin: null,
  updatedByAdminAt: null,
});

export async function getExpertiseConfig(): Promise<ExpertiseConfig> {
  await connectToDatabase();
  const doc = await ExpertiseConfigModel.findOne({ key: "default" }).lean();
  const fallback = getDefaultExpertiseConfig();
  if (!doc) return fallback;
  const professions = dedupeClean((doc.professions as string[] | undefined) ?? []);
  const expertiseAreas = dedupeClean((doc.expertise_areas as string[] | undefined) ?? []);
  const badgeLabels = dedupeClean((doc.badge_labels as string[] | undefined) ?? []);
  return {
    professions: professions.length > 0 ? professions : fallback.professions,
    expertiseAreas: expertiseAreas.length > 0 ? expertiseAreas : fallback.expertiseAreas,
    badgeLabels: badgeLabels.length > 0 ? badgeLabels : fallback.badgeLabels,
    updatedByAdmin: String((doc.updated_by_admin as string | null | undefined) ?? "").trim() || null,
    updatedByAdminAt: doc.updated_by_admin_at instanceof Date ? doc.updated_by_admin_at.toISOString() : null,
  };
}

export async function updateExpertiseConfig(
  input: Pick<ExpertiseConfig, "professions" | "expertiseAreas" | "badgeLabels">,
  adminIdentity = "Admin",
): Promise<ExpertiseConfig> {
  await connectToDatabase();
  const next = {
    professions: dedupeClean(input.professions),
    expertise_areas: dedupeClean(input.expertiseAreas),
    badge_labels: dedupeClean(input.badgeLabels),
    updated_by_admin: String(adminIdentity || "Admin").slice(0, 120),
    updated_by_admin_at: new Date(),
  };
  await ExpertiseConfigModel.updateOne(
    { key: "default" },
    {
      $setOnInsert: { key: "default" },
      $set: next,
    },
    { upsert: true },
  );
  return getExpertiseConfig();
}

export async function restoreDefaultExpertiseConfig(adminIdentity = "Admin"): Promise<ExpertiseConfig> {
  const defaults = getDefaultExpertiseConfig();
  return updateExpertiseConfig(
    {
      professions: defaults.professions,
      expertiseAreas: defaults.expertiseAreas,
      badgeLabels: defaults.badgeLabels,
    },
    adminIdentity,
  );
}
