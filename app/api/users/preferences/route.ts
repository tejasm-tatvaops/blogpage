/**
 * GET  /api/users/preferences  — fetch topic prefs for the current visitor
 * POST /api/users/preferences  — upsert topic prefs (creates if not found)
 *
 * Identity is resolved from the fingerprint cookie (tatvaops_fp) the same way
 * the feed endpoint does, so prefs and persona share the same identity_key.
 */

import { NextResponse } from "next/server";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserPreferencesModel } from "@/models/UserPreferences";

export const dynamic = "force-dynamic";

/** Build the identity key from the request, matching feed endpoint convention. */
const resolveIdentityKey = (request: Request): string | null => {
  const fp = getFingerprintFromRequest(request);
  if (fp) return `fp:${fp}`;
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  return ip ? `ip:${ip}` : null;
};

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const identityKey = resolveIdentityKey(request);
    if (!identityKey) {
      return NextResponse.json({ interested_topics: [], uninterested_topics: [] });
    }

    await connectToDatabase();
    const prefs = await UserPreferencesModel.findOne(
      { identity_key: identityKey },
      { interested_topics: 1, uninterested_topics: 1, personalization_enabled: 1, last_updated: 1 },
    ).lean();

    return NextResponse.json(
      prefs ?? { interested_topics: [], uninterested_topics: [], personalization_enabled: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("[preferences] GET error:", err);
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

type PrefsPayload = {
  interested_topics?: string[];
  uninterested_topics?: string[];
  personalization_enabled?: boolean;
};

export async function POST(request: Request) {
  try {
    const identityKey = resolveIdentityKey(request);
    if (!identityKey) {
      return NextResponse.json({ error: "Identity could not be resolved" }, { status: 400 });
    }

    let body: PrefsPayload;
    try {
      body = (await request.json()) as PrefsPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Sanitise — only allow known topic strings, max 50 each
    const clean = (arr: unknown): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, 50);
    };

    const interested_topics = clean(body.interested_topics);
    const uninterested_topics = clean(body.uninterested_topics);
    const personalization_enabled = typeof body.personalization_enabled === "boolean"
      ? body.personalization_enabled
      : true;

    await connectToDatabase();

    const updated = await UserPreferencesModel.findOneAndUpdate(
      { identity_key: identityKey },
      {
        $set: {
          interested_topics,
          uninterested_topics,
          personalization_enabled,
          last_updated: new Date(),
        },
      },
      { upsert: true, new: true, projection: { interested_topics: 1, uninterested_topics: 1, personalization_enabled: 1 } },
    ).lean();

    return NextResponse.json(updated, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[preferences] POST error:", err);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
