import { z } from "zod";
import { SITE_JOURNALS, type ProjectHealth, type ProjectTimelineEntry, type SiteJournalProject } from "@/data/siteJournals";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteJournalEntryModel, type siteJournalEntryTypeValues } from "@/models/SiteJournalEntry";
import { SiteJournalModel } from "@/models/SiteJournal";

export type ProjectFeedFilters = {
  q?: string;
  city?: string;
  projectType?: string;
  risk?: ProjectHealth | "all";
  status?: "draft" | "pending_review" | "published" | "archived";
  ownerId?: string;
  includeUnpublished?: boolean;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const toTokenSet = (value: string) =>
  new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length >= 3),
  );
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const token of a) if (b.has(token)) hit += 1;
  const union = new Set([...a, ...b]).size;
  return union ? hit / union : 0;
};

const mapHealthToProjectHealth = (value: string): ProjectHealth => {
  if (value === "watch_procurement") return "watch";
  if (value === "delay_risk") return "risk";
  return "stable";
};

const mapEntryTypeToLegacy = (value: string): ProjectTimelineEntry["type"] => {
  switch (value) {
    case "Execution Update":
      return "Progress Update";
    case "Procurement Insight":
      return "Procurement Decision";
    case "Vendor Change":
      return "Vendor Note";
    case "Risk Alert":
      return "Issue Report";
    case "Milestone":
      return "Site Milestone";
    case "Labor Update":
      return "Labor Update";
    case "Cost Change":
      return "Cost Change";
    case "Material Delivery":
      return "Media Log";
    case "AI Observation":
      return "AI Insight";
    case "Field Note":
    default:
      return "Progress Update";
  }
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);

const toSiteJournalProject = (
  journal: {
    _id: { toString(): string };
    slug: string;
    title: string;
    city: string;
    region: string;
    project_type: string;
    budget_range: string;
    timeline_start_date: Date;
    health_status: string;
    ai_summary: string;
    visibility: string;
    status: string;
    tags: string[];
    cover_media: string;
    owner_id: string;
    contributors: Array<{ identity_key: string; name: string; badge?: string }>;
    updated_at?: Date;
    description?: string;
  },
  entries: Array<{
    _id: { toString(): string };
    week_number: number;
    entry_type: string;
    title: string;
    content: string;
    tags?: string[];
    media?: Array<{ type: "image" | "video"; url: string; caption: string }>;
    ai_insight?: string;
    related_discussion_ids?: string[];
    risk_level?: string;
    created_by?: string;
    created_at?: Date;
  }>,
): SiteJournalProject => {
  const sortedEntries = [...entries].sort(
    (a, b) =>
      b.week_number - a.week_number ||
      (new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()),
  );
  const topEntry = sortedEntries[0];
  const week = Math.max(1, topEntry?.week_number ?? 1);
  const progressPercent = Math.min(100, Math.max(5, week * 4));
  const stage = topEntry?.entry_type || "Execution Update";
  const lead = journal.contributors[0] ?? { name: "Site Owner", identity_key: journal.owner_id, badge: "Lead Contributor" };
  const contributorMap = new Map<string, { name: string; badge?: string }>();
  journal.contributors.forEach((item) => contributorMap.set(item.identity_key, { name: item.name, badge: item.badge }));
  contributorMap.set(journal.owner_id, contributorMap.get(journal.owner_id) ?? { name: lead.name, badge: lead.badge });

  return {
    id: journal._id.toString(),
    slug: journal.slug,
    title: journal.title,
    city: journal.city,
    region: journal.region,
    marketType: journal.project_type || "Construction",
    projectType: journal.project_type || "Construction Journal",
    budgetRange: journal.budget_range || "Confidential",
    timeline: {
      started: new Date(journal.timeline_start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      week,
      progressPercent,
      stage,
    },
    leadContributor: {
      name: lead.name,
      identityKey: lead.identity_key,
      badge: lead.badge || "Lead Contributor",
    },
    contributors: journal.contributors.map((item) => ({ name: item.name, badge: item.badge || "Contributor" })),
    health: mapHealthToProjectHealth(journal.health_status),
    aiRiskPulse: topEntry?.ai_insight || "Execution signals updating as new field notes are added.",
    aiSummary: journal.ai_summary || journal.description || "Living execution diary with evolving operational updates.",
    procurementSignal: topEntry?.entry_type === "Procurement Insight" ? topEntry.content : "Procurement signals are being tracked in timeline entries.",
    executionStatus: journal.status === "published" ? "Published site journal in active update cycle" : "Journal in authoring workflow",
    weatherRisk: "No weather risk data provided for this cycle.",
    activeDiscussionCount: sortedEntries.reduce((acc, entry) => acc + (entry.related_discussion_ids?.length ?? 0), 0),
    updatePreview: topEntry?.content || journal.description || "No updates yet.",
    mediaCover: journal.cover_media || "/images/construction/site-1.jpg",
    tags: journal.tags ?? [],
    relatedExperts: journal.contributors.map((item) => item.badge || `${item.name} expertise`).slice(0, 4),
    similarProjects: [],
    recommendations: [
      "Continue weekly field notes to improve continuity signals.",
      "Link relevant discussions for stronger ecosystem context.",
      "Use precise risk tags for better AI pattern detection.",
    ],
    timelineEntries: sortedEntries.map((entry) => ({
      id: entry._id.toString(),
      weekLabel: `Week ${entry.week_number}`,
      type: mapEntryTypeToLegacy(entry.entry_type),
      title: entry.title,
      note: entry.content,
      contributorName: contributorMap.get(entry.created_by ?? "")?.name ?? lead.name,
      contributorBadge: contributorMap.get(entry.created_by ?? "")?.badge ?? lead.badge ?? "Contributor",
      createdAtLabel: entry.created_at
        ? new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(entry.created_at))
        : `${`Week ${entry.week_number}`} update`,
      tags: entry.tags ?? [],
      media: entry.media ?? [],
      aiSummary: entry.ai_insight || undefined,
      linkedDiscussion: entry.related_discussion_ids?.[0]
        ? { title: `Discussion ${entry.related_discussion_ids[0]}`, href: `/forums/${entry.related_discussion_ids[0]}` }
        : undefined,
      commentsCount: entry.related_discussion_ids?.length ?? 0,
    })),
  };
};

export const createSiteJournalSchema = z.object({
  title: z.string().trim().min(5).max(300),
  description: z.string().trim().max(10000).default(""),
  cover_media: z.string().trim().max(2000).default(""),
  project_type: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(120),
  budget_range: z.string().trim().max(120).default(""),
  timeline_start_date: z.string().datetime(),
  tags: z.array(z.string().trim().max(60)).max(12).default([]),
  visibility: z.enum(["public", "unlisted", "private"]).default("public"),
});

export const createSiteJournalEntrySchema = z.object({
  week_number: z.number().int().min(1).max(500),
  entry_type: z.enum([
    "Execution Update",
    "Procurement Insight",
    "Labor Update",
    "Vendor Change",
    "Risk Alert",
    "Milestone",
    "Cost Change",
    "Material Delivery",
    "AI Observation",
    "Field Note",
  ] satisfies readonly [typeof siteJournalEntryTypeValues[number], ...typeof siteJournalEntryTypeValues[number][]]),
  title: z.string().trim().min(4).max(300),
  content: z.string().trim().min(8).max(20000),
  media: z.array(z.object({
    type: z.enum(["image", "video"]).default("image"),
    url: z.string().trim().min(4).max(2000),
    caption: z.string().trim().max(300).default(""),
  })).max(10).default([]),
  location_context: z.object({
    city: z.string().trim().max(120).optional(),
    region: z.string().trim().max(120).optional(),
    area: z.string().trim().max(120).optional(),
  }).optional(),
  risk_level: z.enum(["low", "medium", "high"]).default("low"),
  tags: z.array(z.string().trim().max(60)).max(12).default([]),
  ai_insight: z.string().trim().max(2000).default(""),
  related_discussion_ids: z.array(z.string().trim().max(160)).max(8).default([]),
});

export function getProjectJournals(filters: ProjectFeedFilters = {}): SiteJournalProject[] {
  const query = String(filters.q ?? "").trim().toLowerCase();
  const city = String(filters.city ?? "").trim().toLowerCase();
  const projectType = String(filters.projectType ?? "").trim().toLowerCase();
  const risk = String(filters.risk ?? "all").trim().toLowerCase();

  return SITE_JOURNALS.filter((project) => {
    const searchable = [
      project.title,
      project.city,
      project.region,
      project.projectType,
      project.updatePreview,
      ...project.tags,
    ]
      .join(" ")
      .toLowerCase();

    if (query && !searchable.includes(query)) return false;
    if (city && project.city.toLowerCase() !== city) return false;
    if (projectType && project.projectType.toLowerCase() !== projectType) return false;
    if (risk !== "all" && project.health !== risk) return false;
    return true;
  });
}

export async function getProjectJournalsPersistent(filters: ProjectFeedFilters = {}): Promise<SiteJournalProject[]> {
  try {
    await connectToDatabase();
    const query = String(filters.q ?? "").trim().toLowerCase();
    const city = String(filters.city ?? "").trim().toLowerCase();
    const projectType = String(filters.projectType ?? "").trim().toLowerCase();
    const risk = String(filters.risk ?? "all").trim().toLowerCase();
    const includeUnpublished = Boolean(filters.includeUnpublished);
    const status = filters.status;
    const ownerId = String(filters.ownerId ?? "").trim();

    const mongoFilter: Record<string, unknown> = {};
    if (!includeUnpublished) mongoFilter.status = "published";
    if (status) mongoFilter.status = status;
    if (city) mongoFilter.city = new RegExp(`^${city}$`, "i");
    if (projectType) mongoFilter.project_type = new RegExp(`^${projectType}$`, "i");
    if (ownerId) mongoFilter.owner_id = ownerId;
    if (risk === "watch") mongoFilter.health_status = "watch_procurement";
    if (risk === "risk") mongoFilter.health_status = "delay_risk";
    if (risk === "stable") mongoFilter.health_status = "stable";

    const journals = await SiteJournalModel.find(mongoFilter).sort({ updated_at: -1 }).lean();
    if (!journals.length) return getProjectJournals(filters);
    const journalIds = journals.map((journal) => journal._id.toString());
    const entries = await SiteJournalEntryModel.find({ journal_id: { $in: journalIds } }).sort({ week_number: -1, created_at: -1 }).lean();
    const entryMap = new Map<string, typeof entries>();
    entries.forEach((entry) => {
      const list = entryMap.get(entry.journal_id) ?? [];
      list.push(entry);
      entryMap.set(entry.journal_id, list);
    });
    const mapped = journals.map((journal) => toSiteJournalProject(journal, entryMap.get(journal._id.toString()) ?? []));
    if (!query) return mapped;
    return mapped.filter((project) => normalize(`${project.title} ${project.city} ${project.projectType} ${project.updatePreview} ${project.tags.join(" ")}`).includes(query));
  } catch {
    return getProjectJournals(filters);
  }
}

export function getProjectBySlug(slug: string): SiteJournalProject | null {
  return SITE_JOURNALS.find((project) => project.slug === slug) ?? null;
}

export async function getProjectBySlugPersistent(slug: string, includeUnpublished = false): Promise<SiteJournalProject | null> {
  try {
    await connectToDatabase();
    const journal = await SiteJournalModel.findOne({
      slug,
      ...(includeUnpublished ? {} : { status: "published" }),
    }).lean();
    if (!journal) return getProjectBySlug(slug);
    const entries = await SiteJournalEntryModel.find({ journal_id: journal._id.toString() }).sort({ week_number: -1, created_at: -1 }).lean();
    return toSiteJournalProject(journal, entries);
  } catch {
    return getProjectBySlug(slug);
  }
}

export function getProjectFacetOptions(): { cities: string[]; projectTypes: string[] } {
  const cities = [...new Set(SITE_JOURNALS.map((project) => project.city))].sort((a, b) => a.localeCompare(b));
  const projectTypes = [...new Set(SITE_JOURNALS.map((project) => project.projectType))].sort((a, b) => a.localeCompare(b));
  return { cities, projectTypes };
}

export function getProjectsMarketPulse() {
  const total = SITE_JOURNALS.length;
  const watch = SITE_JOURNALS.filter((project) => project.health === "watch").length;
  const risk = SITE_JOURNALS.filter((project) => project.health === "risk").length;

  return {
    totalActiveJournals: total,
    procurementWatchCount: watch + risk,
    delayRiskCount: risk,
    summary: "Regional procurement and labor variability are the primary execution-side watch signals this week.",
  };
}

export async function createSiteJournal(input: z.input<typeof createSiteJournalSchema>, ownerId: string) {
  await connectToDatabase();
  const parsed = createSiteJournalSchema.parse(input);
  const baseSlug = slugify(parsed.title) || "site-journal";
  let slug = baseSlug;
  let count = 1;
  while (await SiteJournalModel.findOne({ slug }).select("_id").lean()) {
    count += 1;
    slug = `${baseSlug}-${count}`;
  }
  const created = await SiteJournalModel.create({
    ...parsed,
    slug,
    timeline_start_date: new Date(parsed.timeline_start_date),
    owner_id: ownerId,
    status: "draft",
    contributors: [{ identity_key: ownerId, name: "Journal Owner", role: "owner", badge: "Lead Contributor" }],
  });
  const lean = created.toObject();
  return toSiteJournalProject(lean, []);
}

export async function addSiteJournalEntry(slug: string, input: z.input<typeof createSiteJournalEntrySchema>, actorId: string) {
  await connectToDatabase();
  const journal = await SiteJournalModel.findOne({ slug }).lean();
  if (!journal) throw new Error("Site journal not found.");
  if (journal.owner_id !== actorId && !journal.contributors.some((item) => item.identity_key === actorId)) {
    throw new Error("You do not have permission to update this site journal.");
  }
  const parsed = createSiteJournalEntrySchema.parse(input);
  await SiteJournalEntryModel.create({
    journal_id: journal._id.toString(),
    ...parsed,
    created_by: actorId,
  });
  const entries = await SiteJournalEntryModel.find({ journal_id: journal._id.toString() }).sort({ week_number: -1, created_at: -1 }).lean();
  return toSiteJournalProject(journal, entries);
}

export async function updateSiteJournalStatus(slug: string, status: "draft" | "pending_review" | "published" | "archived") {
  await connectToDatabase();
  const updated = await SiteJournalModel.findOneAndUpdate({ slug }, { status }, { new: true }).lean();
  if (!updated) return null;
  const entries = await SiteJournalEntryModel.find({ journal_id: updated._id.toString() }).sort({ week_number: -1, created_at: -1 }).lean();
  return toSiteJournalProject(updated, entries);
}

export async function getSiteJournalsForAdmin(filters: { status?: string; q?: string } = {}) {
  await connectToDatabase();
  const mongoFilter: Record<string, unknown> = {};
  if (filters.status && ["draft", "pending_review", "published", "archived"].includes(filters.status)) {
    mongoFilter.status = filters.status;
  }
  if (filters.q) {
    mongoFilter.title = { $regex: filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }
  const journals = await SiteJournalModel.find(mongoFilter).sort({ updated_at: -1 }).lean();
  const ids = journals.map((journal) => journal._id.toString());
  const entries = await SiteJournalEntryModel.find({ journal_id: { $in: ids } }).sort({ week_number: -1, created_at: -1 }).lean();
  const entryMap = new Map<string, typeof entries>();
  entries.forEach((entry) => {
    const list = entryMap.get(entry.journal_id) ?? [];
    list.push(entry);
    entryMap.set(entry.journal_id, list);
  });
  return journals.map((journal) => toSiteJournalProject(journal, entryMap.get(journal._id.toString()) ?? []));
}

export async function updateSiteJournalByIdAdmin(
  id: string,
  patch: Partial<{
    status: "draft" | "pending_review" | "published" | "archived";
    moderation_status: "clean" | "flagged" | "restricted";
    featured: boolean;
    health_status: "stable" | "watch_procurement" | "delay_risk" | "stabilized";
  }>,
) {
  await connectToDatabase();
  const updated = await SiteJournalModel.findByIdAndUpdate(id, patch, { new: true }).lean();
  if (!updated) return null;
  const entries = await SiteJournalEntryModel.find({ journal_id: updated._id.toString() }).sort({ week_number: -1, created_at: -1 }).lean();
  return toSiteJournalProject(updated, entries);
}

export async function updateSiteJournalEntryByIdAdmin(
  entryId: string,
  patch: Partial<{
    moderation_status: "clean" | "flagged" | "restricted";
    ai_insight: string;
    risk_level: "low" | "medium" | "high";
  }>,
) {
  await connectToDatabase();
  const updated = await SiteJournalEntryModel.findByIdAndUpdate(entryId, patch, { new: true }).lean();
  return updated;
}

export async function getSiteJournalMemoryInsights(slug: string): Promise<string[]> {
  await connectToDatabase();
  const journal = await SiteJournalModel.findOne({ slug }).select("_id city project_type").lean();
  if (!journal) return [];
  const entries = await SiteJournalEntryModel.find({ journal_id: journal._id.toString() })
    .sort({ week_number: 1, created_at: 1 })
    .lean();
  if (!entries.length) return [];

  const byTag = new Map<string, { count: number; firstWeek: number }>();
  const byRisk = new Map<string, number>();
  entries.forEach((entry) => {
    const risk = entry.risk_level ?? "low";
    byRisk.set(risk, (byRisk.get(risk) ?? 0) + 1);
    (entry.tags ?? []).forEach((tag) => {
      const current = byTag.get(tag) ?? { count: 0, firstWeek: entry.week_number };
      byTag.set(tag, { count: current.count + 1, firstWeek: Math.min(current.firstWeek, entry.week_number) });
    });
  });

  const recurringTag = [...byTag.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const elevatedRisk = [...byRisk.entries()].sort((a, b) => b[1] - a[1])[0];
  const firstWeek = entries[0]?.week_number ?? 1;
  const lastWeek = entries[entries.length - 1]?.week_number ?? firstWeek;

  const insights: string[] = [];
  insights.push(`Execution memory span: Week ${firstWeek} to Week ${lastWeek} in ${journal.city} ${journal.project_type}.`);
  if (recurringTag) {
    insights.push(`Recurring signal: #${recurringTag[0]} appears across ${recurringTag[1].count} updates since Week ${recurringTag[1].firstWeek}.`);
  }
  if (elevatedRisk && elevatedRisk[0] !== "low") {
    insights.push(`Risk continuity: ${elevatedRisk[0]} risk surfaced in ${elevatedRisk[1]} timeline entries.`);
  } else {
    insights.push("Risk continuity: predominantly low-risk execution progression so far.");
  }
  const procurementMentions = entries.filter((entry) =>
    normalize(`${entry.title} ${entry.content} ${(entry.tags ?? []).join(" ")}`).includes("procurement") ||
    normalize(`${entry.title} ${entry.content} ${(entry.tags ?? []).join(" ")}`).includes("supplier"),
  ).length;
  if (procurementMentions > 0) {
    insights.push(`Procurement memory: ${procurementMentions} entries mention supplier or procurement conditions.`);
  }
  return insights.slice(0, 4);
}

type MatchForumInput = {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
};

const LOCATION_KEYWORDS = ["hyderabad", "bangalore", "bengaluru", "pune", "chennai", "mumbai", "delhi", "gurgaon", "noida"];
const PROCUREMENT_KEYWORDS = ["procurement", "vendor", "supplier", "steel", "cement", "rebar", "labor", "logistics", "delay", "budget", "boq"];

export function getRelatedSiteJournalsForForum(input: MatchForumInput, limit = 3): SiteJournalProject[] {
  const forumText = `${input.title} ${input.excerpt} ${input.content} ${input.tags.join(" ")}`;
  const forumTokens = toTokenSet(forumText);
  const normalizedTags = new Set(input.tags.map((tag) => normalize(tag)));
  const forumLocations = LOCATION_KEYWORDS.filter((city) => forumTokens.has(city));
  const forumProcurementKeywords = PROCUREMENT_KEYWORDS.filter((term) => forumTokens.has(term));

  return [...SITE_JOURNALS]
    .map((journal) => {
      const journalText = `${journal.title} ${journal.projectType} ${journal.city} ${journal.region} ${journal.tags.join(" ")} ${journal.updatePreview} ${journal.aiRiskPulse}`;
      const journalTokens = toTokenSet(journalText);
      const semanticScore = jaccard(forumTokens, journalTokens);
      const sharedTagScore = journal.tags.filter((tag) => normalizedTags.has(normalize(tag))).length * 0.22;
      const locationScore = forumLocations.some((city) => normalize(journalText).includes(city)) ? 0.3 : 0;
      const procurementScore = forumProcurementKeywords.filter((term) => journalTokens.has(term)).length * 0.08;
      return { journal, score: semanticScore + sharedTagScore + locationScore + procurementScore };
    })
    .filter((item) => item.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.journal);
}

export async function getRelatedSiteJournalsForForumPersistent(input: MatchForumInput, limit = 3): Promise<SiteJournalProject[]> {
  const journals = await getProjectJournalsPersistent({ includeUnpublished: false });
  if (!journals.length) return getRelatedSiteJournalsForForum(input, limit);
  const forumText = `${input.title} ${input.excerpt} ${input.content} ${input.tags.join(" ")}`;
  const forumTokens = toTokenSet(forumText);
  const normalizedTags = new Set(input.tags.map((tag) => normalize(tag)));
  const forumLocations = LOCATION_KEYWORDS.filter((city) => forumTokens.has(city));
  const forumProcurementKeywords = PROCUREMENT_KEYWORDS.filter((term) => forumTokens.has(term));
  return journals
    .map((journal) => {
      const journalText = `${journal.title} ${journal.projectType} ${journal.city} ${journal.region} ${journal.tags.join(" ")} ${journal.updatePreview} ${journal.aiRiskPulse}`;
      const journalTokens = toTokenSet(journalText);
      const semanticScore = jaccard(forumTokens, journalTokens);
      const sharedTagScore = journal.tags.filter((tag) => normalizedTags.has(normalize(tag))).length * 0.22;
      const locationScore = forumLocations.some((city) => normalize(journalText).includes(city)) ? 0.3 : 0;
      const procurementScore = forumProcurementKeywords.filter((term) => journalTokens.has(term)).length * 0.08;
      return { journal, score: semanticScore + sharedTagScore + locationScore + procurementScore };
    })
    .filter((item) => item.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.journal);
}

export function getSiteJournalsByTag(tag: string, limit = 8): SiteJournalProject[] {
  const needle = normalize(tag);
  if (!needle) return [];
  return SITE_JOURNALS
    .filter((journal) => {
      const haystack = normalize(`${journal.title} ${journal.projectType} ${journal.city} ${journal.region} ${journal.tags.join(" ")}`);
      return haystack.includes(needle);
    })
    .slice(0, limit);
}

export async function getSiteJournalsByTagPersistent(tag: string, limit = 8): Promise<SiteJournalProject[]> {
  const all = await getProjectJournalsPersistent({ includeUnpublished: false });
  const needle = normalize(tag);
  if (!needle) return [];
  return all.filter((journal) => normalize(`${journal.title} ${journal.projectType} ${journal.city} ${journal.region} ${journal.tags.join(" ")}`).includes(needle)).slice(0, limit);
}

export function getSiteJournalContributionsForIdentity(identityKey: string, limit = 5): SiteJournalProject[] {
  const needle = String(identityKey ?? "").trim().toLowerCase();
  if (!needle) return [];
  return SITE_JOURNALS.filter((journal) => journal.leadContributor.identityKey.toLowerCase() === needle).slice(0, limit);
}

export async function getSiteJournalContributionsForIdentityPersistent(identityKey: string, limit = 5): Promise<SiteJournalProject[]> {
  const all = await getProjectJournalsPersistent({ includeUnpublished: true, ownerId: identityKey });
  if (all.length) return all.slice(0, limit);
  return getSiteJournalContributionsForIdentity(identityKey, limit);
}

export function getRelatedSiteJournalsBySignals(signals: string[], limit = 4): SiteJournalProject[] {
  const normalizedSignals = signals.map((signal) => normalize(signal)).filter(Boolean);
  if (!normalizedSignals.length) return [];
  const signalText = normalizedSignals.join(" ");
  const signalTokens = toTokenSet(signalText);
  return [...SITE_JOURNALS]
    .map((journal) => {
      const tokens = toTokenSet(`${journal.title} ${journal.projectType} ${journal.city} ${journal.tags.join(" ")} ${journal.aiRiskPulse}`);
      return { journal, score: jaccard(signalTokens, tokens) };
    })
    .filter((item) => item.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.journal);
}

export async function getRelatedSiteJournalsBySignalsPersistent(signals: string[], limit = 4): Promise<SiteJournalProject[]> {
  const all = await getProjectJournalsPersistent({ includeUnpublished: false });
  if (!all.length) return getRelatedSiteJournalsBySignals(signals, limit);
  const normalizedSignals = signals.map((signal) => normalize(signal)).filter(Boolean);
  if (!normalizedSignals.length) return [];
  const signalTokens = toTokenSet(normalizedSignals.join(" "));
  return all
    .map((journal) => ({
      journal,
      score: jaccard(signalTokens, toTokenSet(`${journal.title} ${journal.projectType} ${journal.city} ${journal.tags.join(" ")} ${journal.aiRiskPulse}`)),
    }))
    .filter((item) => item.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.journal);
}

export async function getProjectFacetOptionsPersistent(): Promise<{ cities: string[]; projectTypes: string[] }> {
  const projects = await getProjectJournalsPersistent({ includeUnpublished: false });
  if (!projects.length) return getProjectFacetOptions();
  return {
    cities: [...new Set(projects.map((project) => project.city))].sort((a, b) => a.localeCompare(b)),
    projectTypes: [...new Set(projects.map((project) => project.projectType))].sort((a, b) => a.localeCompare(b)),
  };
}

export async function getProjectsMarketPulsePersistent() {
  const projects = await getProjectJournalsPersistent({ includeUnpublished: false });
  const source = projects.length ? projects : SITE_JOURNALS;
  const total = source.length;
  const watch = source.filter((project) => project.health === "watch").length;
  const risk = source.filter((project) => project.health === "risk").length;
  return {
    totalActiveJournals: total,
    procurementWatchCount: watch + risk,
    delayRiskCount: risk,
    summary: "Regional procurement and labor variability are the primary execution-side watch signals this week.",
  };
}
