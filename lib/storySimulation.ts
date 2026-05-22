/**
 * Story Simulation Engine
 *
 * Drives synthetic story posting for behavioral personas.
 *
 * Persona posting frequencies:
 *   expert        — posts 2-4 detailed site clips/tips per day
 *   commenter     — posts 1-2 text/poll stories per day
 *   trend_follower — posts 1 trending-topic story per day
 *   casual        — posts 0-1 stories occasionally
 *   lurker        — almost never posts (5% chance)
 *   contrarian    — posts opinionated text stories 1-2/day
 */

import { connectToDatabase } from "./mongodb";
import { logger } from "./logger";
import { UserProfileModel } from "@/models/UserProfile";
import { StoryModel } from "@/models/Story";
import { createStory } from "./storyService";
import { inferBehaviorTypeFromSeed } from "./userBehavior";

// ─── Construction domain story templates ──────────────────────────────────────

const EXPERT_STORIES = [
  { text: "Pro tip: Always use a slump test before pouring concrete on site. Saves costly rework.", tags: ["concrete", "quality-control", "site-execution"] },
  { text: "Waterproofing membrane installation — 3 mistakes most contractors make. Swipe to learn.", tags: ["waterproofing", "construction", "site-execution"] },
  { text: "BOQ accuracy drops 40% when material rates aren't updated quarterly. Are yours current?", tags: ["boq", "cost-planning", "estimation"] },
  { text: "Formwork striking time matters. 24h for walls, 7d for slabs — no shortcuts.", tags: ["formwork", "concrete", "quality-control"] },
  { text: "Rebar lapping lengths: minimum 60d for tension zones. Verify this on every drawing.", tags: ["rebar", "structural", "site-execution"] },
  { text: "Curing concrete for 28 days achieves full design strength. Skip it and you're gambling.", tags: ["concrete", "quality-control", "best-practices"] },
  { text: "Soil bearing capacity test before foundation — non-negotiable. SPT values matter.", tags: ["foundation", "geotechnical", "site-execution"] },
];

const COMMENTER_STORIES = [
  { text: "Quick question — what's your go-to waterproofing system for basements?", tags: ["waterproofing", "construction"] },
  { text: "Sharing progress from a residential project today. Lintel work done ✓", tags: ["residential", "site-execution"] },
  { text: "Anyone else struggling with procurement timelines post-monsoon?", tags: ["procurement", "vendor-comparison"] },
  { text: "New to the platform — excited to learn from everyone here!", tags: ["community", "construction"] },
];

const TREND_FOLLOWER_STORIES = [
  { text: "Trending: Green concrete is becoming mainstream on large commercial projects.", tags: ["green-building", "concrete", "eco-friendly"] },
  { text: "Everyone's talking about prefab construction this season — worth the investment?", tags: ["prefab", "construction", "innovation"] },
  { text: "AI-based BOQ estimation is here. Are traditional quantity surveyors ready?", tags: ["boq", "estimation", "technology"] },
];

const CONTRARIAN_STORIES = [
  { text: "Unpopular take: Most 'green building' certifications are marketing, not engineering.", tags: ["green-building", "opinion"] },
  { text: "The obsession with BIM over site discipline is costing projects more than it saves.", tags: ["bim", "site-execution", "opinion"] },
  { text: "Low-cost vendors aren't always the problem. Bad scope documents are.", tags: ["procurement", "estimation", "opinion"] },
];

const BACKGROUND_STYLES = [
  "gradient-slate",
  "gradient-blue",
  "gradient-amber",
  "gradient-emerald",
  "gradient-purple",
  "gradient-orange",
];

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickRandom<T>(arr: T[], seed: string): T {
  return arr[hashNum(seed) % arr.length] as T;
}

// ─── Should this persona post a story now? ────────────────────────────────────

function shouldPostStory(
  behaviorType: string,
  seed: string,
): boolean {
  const roll = (hashNum(seed + Date.now().toString(16)) % 100) / 100;

  const postChance: Record<string, number> = {
    expert: 0.55,
    commenter: 0.35,
    trend_follower: 0.30,
    casual: 0.15,
    lurker: 0.05,
    contrarian: 0.40,
  };

  return roll < (postChance[behaviorType] ?? 0.1);
}

// ─── Pick template for persona ────────────────────────────────────────────────

function getTemplateForBehavior(
  behaviorType: string,
  seed: string,
): { text: string; tags: string[] } {
  switch (behaviorType) {
    case "expert":
      return pickRandom(EXPERT_STORIES, seed);
    case "commenter":
      return pickRandom(COMMENTER_STORIES, seed + "c");
    case "trend_follower":
      return pickRandom(TREND_FOLLOWER_STORIES, seed + "t");
    case "contrarian":
      return pickRandom(CONTRARIAN_STORIES, seed + "x");
    default:
      return pickRandom([...COMMENTER_STORIES, ...TREND_FOLLOWER_STORIES], seed + "d");
  }
}

// ─── Run simulation for N synthetic users ────────────────────────────────────

export async function runStorySimulation(batchSize = 30): Promise<{
  attempted: number;
  posted: number;
  skipped: number;
}> {
  await connectToDatabase();

  const profiles = await UserProfileModel.find({})
    .select("identity_key display_name avatar_url author_reputation_tier behavior_type interest_tags")
    .limit(batchSize)
    .lean();

  let posted = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const identityKey = String((profile as { identity_key?: string }).identity_key ?? "");
    if (!identityKey) { skipped++; continue; }

    const behaviorType =
      (profile as { behavior_type?: string }).behavior_type ??
      inferBehaviorTypeFromSeed(identityKey);

    const seed = `${identityKey}:${Math.floor(Date.now() / 3_600_000)}`;

    if (!shouldPostStory(behaviorType, seed)) { skipped++; continue; }

    // Check they haven't already posted in the last 6h
    const recentStory = await StoryModel.findOne({
      identity_key: identityKey,
      created_at: { $gt: new Date(Date.now() - 6 * 3_600_000) },
    }).lean();

    if (recentStory) { skipped++; continue; }

    try {
      const template = getTemplateForBehavior(behaviorType, seed);
      const displayName = String((profile as { display_name?: string }).display_name ?? "User");
      const avatarUrl = (profile as { avatar_url?: string }).avatar_url ?? null;
      const bgStyle = pickRandom(BACKGROUND_STYLES, seed + "bg");

      await createStory(identityKey, {
        display_name: displayName,
        avatar_url: avatarUrl ? String(avatarUrl) : undefined,
        story_type: "text",
        text: template.text,
        background_style: bgStyle,
        tags: template.tags,
        visibility: "public",
        ai_generated: true,
        ai_hashtags: template.tags.slice(0, 5),
      });

      posted++;
    } catch (err) {
      logger.warn({ err, identityKey }, "Story simulation: failed to post story");
      skipped++;
    }
  }

  logger.info({ attempted: profiles.length, posted, skipped }, "Story simulation complete");
  return { attempted: profiles.length, posted, skipped };
}
