# TatvaOps Platform (Blog + Forums + Users + Personalization + Behavioral Simulation)

TatvaOps is a production-oriented Next.js 15 application for construction-focused publishing and community discussion.
It combines:

- editorial blog publishing
- forum threads and discussion mechanics
- personalized feed ranking and experimentation
- activity-derived user profile directory
- AI-assisted content + engagement generation
- admin controls for moderation and system behavior
- simulation realism controls for social activity feel
- SEO content engine with internal linking, keyword optimization, and tag hub pages

This README is intentionally exhaustive and implementation-heavy. It is meant to serve as:

- product reference
- architecture reference
- operational runbook
- debugging map
- onboarding guide for engineers

---

## Table Of Contents

- Platform Summary
- High-Level Architecture
- Core Product Surfaces
- Detailed Feature Inventory
- Engagement Identity + Reputation Consistency *(new)*
- SEO Content Engine *(new)*
- Behavioral Realism System
- Personalization / Feed System
- User Profile System
- Forums System
- Blog System
- Admin CMS System
- Notifications System
- AI Systems
- Caching + Performance Controls
- Data Models
- API Reference (public + admin)
- UI Component Map
- Services / Library Map
- Environment Variables
- Setup + Runbook
- Deployment (Vercel)
- Troubleshooting
- Security Notes
- Known Constraints + Future Work

---

## Platform Summary

TatvaOps is designed to feel like a real social content platform, not just a static blog. The application ships with:

- blog listing/detail pages with upvotes/downvotes, views, and comments
- forums with posts, nested discussion, votes, best-answer flow, and swipe mode
- personalized feed with ranking, exploration, and diversity controls
- synthetic + historical + real activity-based user directory
- realism layer that models user behavior variation (activity timing, tone, interaction style)
- admin panel for generation, moderation, system toggles, and feed observability hooks
- SEO content engine: internal cross-linking, keyword extraction, tag hub pages, and content structure enforcement

---

## High-Level Architecture

### Runtime stack

- `Next.js 15` App Router
- `React 19`
- `TypeScript`
- `MongoDB` + `Mongoose`
- `Tailwind CSS v4`
- `Framer Motion`

### AI providers

- `Groq` (primary)
- `OpenAI` (fallback)

### Caching and state

- in-memory process state for throttled maintenance and simulation loops
- optional Redis path for distributed feed cache (`ioredis`)
- short TTL caches for high-frequency routes (e.g. notifications, users page micro-cache in dev)

### Auth

- `iron-session` for admin session auth
- lightweight fingerprint/IP identity for non-authenticated social interactions

---

## Core Product Surfaces

### 1) Public Blog

- `/blog` with search, category chips, sort modes (including personalized)
- `/blog/[slug]` detail with article rendering, interactions, related content, topic strips, and related forum discussions

### 2) Public Forums

- `/forums` feed with sort modes and forum cards
- `/forums/[slug]` thread detail with comments/votes/best-answer and related blog articles
- swipe mode for immersive feed exploration

### 3) Tag / Topic Hubs *(new)*

- `/tags/[tag]` — SSR content hub per tag, listing all matching blog posts and forum discussions
- serves as a crawlable, indexed entry point for every tag in the system
- generated statically at build time across all blog and forum tags

### 4) Users Directory

- `/users` real-time-ish directory of reader/contributor profiles
- includes profile cards, behavior hints, interests, activity stats, and quick profile access points

### 5) Admin

- `/admin/login`
- `/admin/blog`, `/admin/forums`, `/admin/comments`, `/admin/stats`
- generation + moderation + operational toggles

---

## Detailed Feature Inventory

## Blog Experience

- list page:
  - text search (`title`, `excerpt`, tags)
  - category filtering
  - sort options (`latest`, `most_viewed`, personalized)
  - image fallback and de-dup strategy
  - intelligence labels (`Because you like`, `Trending`, `Discover`) where feed metadata exists
- detail page:
  - view tracking endpoint integration
  - post vote actions (`upvote`, `downvote`)
  - comments and replies
  - **Most engaged users on this post** strip (identity-safe, post-scoped engagement ranking)
  - social share actions
  - cover image fallback chain hardened against placeholder-only outputs
  - **Related Discussions section** — server-rendered list of up to 4 forum threads sharing tags with the article (new)
  - **tag chips are now crawlable `<Link>` elements** pointing to `/tags/[tag]` (new)

## Forum Experience

- forum listing:
  - Reddit-like sort behavior (`hot/new/top/discussed`)
  - card-level metadata and author profile quick access
- thread detail:
  - comments and nested replies
  - per-thread vote flow
  - best answer feature
  - view count tracking
  - **Related Articles section** — server-rendered list of up to 4 blog posts sharing the thread's primary tag (new)
- immersive swipe mode:
  - horizontal snap and velocity-driven interactions
  - progress indicator, interaction micro-feedback, staged text transitions
  - dwell tracking + skip signal emission via `/api/feed/events`
  - preloading of adjacent visual assets for smoother transitions

## Users Directory

- aggregated user profiles from:
  - direct activity ingestion
  - historical backfill
  - synthetic user generation to maintain sufficient directory density
- support features:
  - search + sort + filter (`real photos only`)
  - profile quick view modal
  - totals validation blocks (DB totals vs profile totals)
  - "recently helpful" strip
  - behavior hints (active now, topic contributor, familiarity hints)
  - identity context chips (role, city, experience)
  - weekly activity sparkline and activity snippets

---

## Engagement Identity + Reputation Consistency *(new)*

This section documents the production hardening work that aligns comments, engagement ranking, and reputation math to a single source of truth.

### Why this was needed

Historically, parts of the platform mixed identity sources (`author:*` style fallbacks vs real runtime identity keys). This could make the comment list and the "engaged users" strip disagree.

The system now uses strict identity consistency so all user-facing engagement surfaces reflect the same actors.

---

### Identity contract (single source of truth)

All engagement flows now rely on `identity_key` with allowed prefixes only:

- `fp:`
- `ip:`
- `google:`

Any comment/event row without a valid identity key is ignored for engaged-user ranking.

No fallback stitching from author display names is performed.

---

### Comment identity storage

`Comment` now stores `identity_key` explicitly, populated at creation time from request/session identity.

Implications:

- new comments participate in reputation + engagement joins correctly
- joins across `Comment`, `ReputationEvent`, and `UserProfile` are stable
- no dependency on brittle name-derived identity mapping

---

### "Most engaged users on this post" logic

Implemented in: `getMostEngagedUsersByPost()` (`lib/userProfileService.ts`)

#### Data sources (post-scoped only)

- **Commented**: `CommentModel` filtered by:
  - `post_id`
  - `deleted_at: null`
  - `identity_key` present/non-empty
- **Liked**: `ReputationEvent.reason = "article_like_received"`
- **Shared**: `ReputationEvent.reason = "content_share"`
- Event rows are scoped to the post via `source_content_slug`

No topic-interest fallback or cross-post blending is used for this strip.

#### Event window and performance

- only recent engagement is considered (`created_at >= now - 7 days`)
- comment events and reputation events are aggregated in MongoDB
- user profiles are fetched in a single batched query (`$in`)
- avoids N+1 profile lookups

#### Scoring model (event-level)

Each event contributes individually:

- comment: `5 * decay`
- like: `2 * decay`
- share: `3 * decay`

With:

- `hours = (now - created_at) / 3600000`
- `decay = exp(-hours / 24)`

This ensures real-time freshness: older actions naturally fade.

#### Anti-spam caps

Per identity, before scoring:

- most recent 3 comments
- most recent 5 likes
- most recent 3 shares

This prevents one actor from dominating via repetitive low-quality actions.

#### Reputation tie-strength

Reputation is normalized and added as a light tie-breaker:

- `repScore = log10(reputation_score + 1)`
- final score = `sum(event-level decayed scores) + repScore`

#### Stable deterministic ordering

Users are sorted by:

1. `engagement_score` DESC
2. `lastActivity` DESC
3. `identity_key` ASC

This removes UI flicker on score ties.

#### Returned fields

Each engaged-user row includes:

- `identity_key`
- `display_name`
- `reputation_score`
- `engagement_score`
- labels (`Commented`, `Liked`, `Shared`)

---

### Reputation engine consistency fixes

Implemented in: `lib/reputationEngine.ts`

#### Breakdown accuracy

`getReputationBreakdown()` now sums `awarded_points` directly from ledger events (grouped by reason), instead of recomputing from `BASE_POINTS * count`.

Benefits:

- multiplier-safe
- cap-safe
- resilient to future scoring rule changes
- UI breakdown aligns with actual awarded history

#### Share event mapping completeness

Both share reasons now map into the `shares` breakdown bucket:

- `article_share_received`
- `content_share`

#### Daily cap auditability

When daily cap is reached, events are no longer dropped.
Instead:

- event is still created
- `multiplier = 0`
- `awarded_points = 0`
- note includes `"daily cap reached"`

This preserves immutable audit history and keeps totals explainable.

---

### Operational expectations after these changes

- comment authors and engaged-users strip now align to the same identities
- fake/legacy stitched identities do not pollute post engagement ranking
- admin reputation analytics and per-user breakdown are more trustworthy
- recompute and breakdown behavior are materially closer in semantics because both are ledger-centric

---

## SEO Content Engine *(new)*

The SEO layer turns TatvaOps into an interconnected content graph. All linking is server-side rendered so Google can crawl every edge without JavaScript.

---

### Part 1 — Internal Linking Engine

#### Auto keyword-to-blog linking (`lib/internalLinker.ts`)

- scans markdown content for phrases that match published post titles or tags
- injects `[keyword](/blog/slug)` markdown links — up to 7 per post
- skips code fences, inline code, headings, and existing links (protected segments)
- uses longest-phrase-first matching to avoid partial collisions
- called during content rendering — no DB side-effects

#### Blog → Forum cross-linking (server-side)

Each blog detail page (`/app/blog/[slug]/page.tsx`) fetches up to 4 forum threads whose tags overlap with the article:

```ts
getRelatedForumPosts(post.tags, linkedForumSlug, 4)
```

Rendered as a **Related Discussions** card section inside the article column — fully SSR, no JS required for Google to crawl.

#### Forum → Blog cross-linking (server-side)

Each forum thread detail page (`/app/forums/[slug]/page.tsx`) fetches up to 4 blog posts sharing the thread's primary tag:

```ts
getPostsByTag(post.tags[0], 4)
```

Rendered as a **Related Articles** card section above the comment section — SSR, crawlable.

#### Rules enforced

- no more than one link per destination slug (prevents spam)
- keyword anchor text is the natural match from content (no synthetic anchor stuffing)
- linked forum slug is excluded from related forum results to avoid duplication
- all links are `<Link>` (Next.js) — resolved at request time, not hydration time

---

### Part 2 — Keyword Optimization (`lib/keywordExtractor.ts`)

Pure function — no I/O, no DB calls.

```ts
import { extractKeywords, descriptionHasKeyword } from "@/lib/keywordExtractor";

const kw = extractKeywords({ title, tags, content });
// kw.primary   → "construction cost estimation"
// kw.secondary → ["construction", "boq", "estimation"]
// kw.headings  → ["material takeoff workflow", "quantity surveying"]
// kw.all       → deduped union of all above
```

#### How keywords are derived

| Source | Field | Notes |
|--------|-------|-------|
| `title` | `primary` | First 3 meaningful words after stop-word filtering |
| `tags[]` | `secondary` | Lowercased, deduped |
| `## H2` / `### H3` | `headings` | Up to 4 words per heading, up to 8 headings |

#### `descriptionHasKeyword(description, primary)`

Returns `true` when the meta description naturally contains at least the first word of the primary keyword phrase. Use this in admin validation to ensure descriptions aren't keyword-free.

#### What this powers

- admin-side content quality feedback
- future: automated meta description enhancement
- future: heading keyword gap analysis before publish

---

### Part 3 — Content Structure Enforcement (`lib/contentStructureChecker.ts`)

Extended from the original. Validates markdown before saving.

| Check | Rule | Warning code |
|-------|------|-------------|
| H1 count | Exactly 1 | `MISSING_H1` / `MULTIPLE_H1` |
| H1 vs title | Must match | `TITLE_H1_MISMATCH` |
| Subheadings | Minimum 2 H2/H3 | `MISSING_SECTIONS` |
| Paragraph length | Max 120 words each | `LONG_PARAGRAPH` |
| Body word count | **Min 300 words** (raised from 200) | `TOO_SHORT` |

The 300-word minimum aligns with the accepted SEO threshold for pages to be indexed with sufficient content signal.

Usage:

```ts
import { checkContentStructure, formatStructureWarnings } from "@/lib/contentStructureChecker";

const report = checkContentStructure({ title, content });
if (!report.valid) {
  console.warn(formatStructureWarnings(report));
}
```

Returns a `StructureReport`:

```ts
{
  valid: boolean
  warnings: { code, message }[]
  h1Count, h2Count, h3Count
  paragraphCount
  longestParagraphWords
  wordCount
}
```

---

### Part 4 — Tag / Topic Hub Pages (`/app/tags/[tag]/page.tsx`)

Each tag gets a dedicated SSR hub at `/tags/[tag]`.

#### What each page includes

- **SEO metadata**: `<title>`, `<meta description>`, canonical URL, Open Graph
- **Breadcrumb**: `Home / Blog / #tag`
- **Blog articles section**: all published posts with that tag (up to 20), sorted by newest
- **Forum discussions section**: all forum threads with that tag (up to 20), ranked by hot score
- **CTA link**: "Browse all #tag discussions" → `/forums?tag=tag`
- **404 handling**: `notFound()` when no content exists for the tag

#### Static generation

```ts
export async function generateStaticParams() {
  const [blogTags, forumTags] = await Promise.all([getAllTags(), getAllForumTags()]);
  const allTags = [...new Set([...blogTags, ...forumTags])];
  return allTags.map((tag) => ({ tag: encodeURIComponent(tag) }));
}
```

All tag pages are pre-rendered at build time. Revalidation TTL: **600 seconds**.

#### New service functions powering tag pages

| Function | File | Purpose |
|----------|------|---------|
| `getPostsByTag(tag, limit)` | `lib/blogService.ts` | Published blogs with a specific tag |
| `getAllTags()` | `lib/blogService.ts` | All distinct blog tags (for static params) |
| `getRelatedForumPosts(tags, excludeSlug, limit)` | `lib/forumService.ts` | Forum threads sharing tags (cross-linking) |
| `getAllForumTags()` | `lib/forumService.ts` | All distinct forum tags (for static params) |

---

### Part 5 — Tag Links + Crawlability

Previously, blog tags were rendered as plain `<span>` elements — invisible to Google's link graph.

**Before:**
```tsx
<span className="...">#{tag}</span>
```

**After (both BlogDetail + BlogSidebar):**
```tsx
<Link href={`/tags/${encodeURIComponent(tag)}`} className="...">#{tag}</Link>
```

Every tag on every blog post and sidebar is now a crawlable link. Google can traverse:

```
/blog/[slug] → /tags/[tag] → /blog/[slug-2], /forums/[slug-3] → ...
```

This creates a fully interconnected content graph indexed at the tag level.

---

### Part 6 — Sitemap (`/app/sitemap.ts`)

Tag hub pages are now included in the sitemap alongside posts and categories.

| Route type | Priority | Change frequency |
|-----------|---------|----------------|
| Static routes (home, /blog, /forums) | 1.0–0.85 | monthly/daily |
| Category routes | 0.7 | weekly |
| **Tag hub routes** `/tags/[tag]` | **0.75** | **weekly** |
| Blog posts | 0.8 | monthly |
| Forum posts | 0.65 | weekly |

Tag routes are de-duplicated across blog and forum tag sets before being added.

---

## Behavioral Realism System (Human-Like Simulation Layer)

This is the primary mechanism used to reduce synthetic feel.

### Personality types (hidden)

Stored as `behavior_type`:

- `lurker`
- `commenter`
- `expert`
- `casual`
- `trend_follower`
- `contrarian`

### Per-user behavioral parameters

Stored and reused in profile:

- `writing_tone`: `formal` / `casual` / `aggressive` / `helpful`
- `active_start_hour`, `active_end_hour`
- `weekend_activity_multiplier`
- `burstiness`
- `silence_bias`
- `emoji_level`
- `social_cluster`
- `frequent_peer_keys`
- `topic_focus_history`
- `topic_shift_count`

### What realism this unlocks

- non-uniform active windows (no 24/7 robotic behavior)
- burst + silence cadence
- weekday/weekend variance
- tone inconsistency / imperfect commenting style
- occasional contradictory actions (e.g., comment then downvote)
- topic revisits + periodic focus drift
- weak social recurrence through repeated interaction hints

### Implementation files

- `lib/userBehavior.ts` (profile synthesis + behavior helper functions)
- `models/UserProfile.ts` (schema fields and indexes)
- `lib/userProfileService.ts` (assignment, persistence, evolution)
- `lib/activityRunner.ts` (timing and action loop behavior)
- `lib/autopopulateService.ts` (behavior-aware content/reply generation)

---

## Personalization / Feed System

Feed endpoint: `GET /api/blog/feed`

### Pipeline stages

1. Candidate generation
2. Scoring
3. Diversity enforcement

### Candidate classes

- personalized
- trending
- exploration

### Scoring composition (configurable)

- interest alignment
- engagement signal
- recency
- author quality
- diversity penalties/boosts
- negative signals support (skip, low dwell)

### Additional capabilities

- variant assignment for experimental weights
- session diversity memory
- observability events (`feed_served`, `post_clicked`, `post_liked`, `dwell_time`, `skip`)
- precompute hooks for hot identities
- optional Redis cache path with dev fallback behavior

### Dev hardening

- fast fallback path in development to avoid heavy feed compute stalls
- timeout wrappers around expensive async calls

---

## User Profile System

## Data origin paths

### A) Real-time activity ingestion

Triggered from blog/forum action endpoints via `recordUserActivity`.

### B) Historical backfill

One-time / throttled backfill from:

- `Comment`
- `ForumPost`
- `ForumVote`
- `ViewEvent`

### C) Synthetic profile generation

Ensures minimum population (e.g. 1000+ profiles) for non-empty social UI.

## Maintenance cycle

Throttled in-process maintenance loop performs:

1. historical backfill
2. synthetic fill-up to minimum count
3. real photo coverage normalization
4. avatar uniqueness enforcement
5. synthetic view count rebalance to match platform totals

All heavy work is rate-limited in request path and guarded by timeout waiting.

## Avatar policy

- mixed mode (generated + real)
- real-photo subset can be region-biased
- name/gender consistency enforcement path
- duplicate avatar dedupe pass (canonical URL matching for real images)

---

## Forums System

## Data model highlights

- forum post score and trendability
- denormalized comment count
- view count
- featured/trending flags

## Behavior hooks

- `activityRunner` registers engagement events
- trending surge detection on short engagement windows
- optional trend boost via queued follow-up activities

## Interaction mechanics

- post voting
- comment voting
- thread comments + nested replies
- best-answer assignment

---

## Blog System

## Content lifecycle

- manual authoring via admin form
- AI generation by keyword
- bulk AI generation (SEO expansion)
- publish scheduling awareness (`publish_at`)

## Rendering behavior

- markdown rendering with GFM support
- title/content cleanup rules for duplicate headline prevention
- references quality controls and fallback references

## Engagement APIs

- view increment
- upvote/downvote
- comments + reply + comment votes

---

## Admin CMS System

## Auth

- login route with secret validation
- `iron-session` cookie
- protected admin page/api helpers

## Admin capabilities

- blog CRUD
- forum moderation and generation
- comment moderation
- activity toggles (`live activity`, `notifications`, `personas`)
- feed metrics + precompute trigger APIs

## Safety notes

- admin API helper standardizes error semantics
- route-level guard enforcement for privileged operations

---

## Notifications System

- navbar bell + unread indicators
- lazy dropdown fetch
- mark-as-read endpoint
- polling reductions to avoid rate-limit churn
- short TTL cache and hidden-tab polling suppression

---

## AI Systems

## Blog generation

- provider chain (Groq -> OpenAI)
- strict shape extraction with fallback parsing
- duplicate slug handling

## Forum generation

- short-form thread prompt design (question/opinion/discussion format)
- robust JSON parsing for non-perfect LLM outputs

## Autopopulate generation

- AI comment/reply synthesis
- persona prompt injection
- style variance and typo injection
- duplicate text suppression
- behavior-aware delays and occasional imperfect quality

---

## Caching + Performance Controls

## Feed

- distributed cache adapter with optional Redis
- dev short-circuit behavior for stability

## Users page

- dynamic rendering
- small dev micro-cache to reduce hot-reload amplification
- maintenance throttling every ~10 minutes per process

## Notifications

- short in-memory cache
- invalidation on read actions

## General safeguards

- timeout wrappers around risk-prone async branches
- fallback returns over hard hangs where possible

---

## Data Models (Primary)

## `Blog`

- content body, excerpt, metadata, tags/category
- publish flags and schedule
- vote + view counters
- word-count storage for short-form experiences

## `ForumPost`

- title/content/excerpt
- tags and author identity
- hot score, votes, comments, views
- trending + featured flags

## `Comment`

- root + nested replies
- strict `identity_key` for cross-system identity joins
- vote counters
- AI metadata fields (`is_ai_generated`, `persona_name`)

## `UserProfile`

- identity keys and soft identity metadata
- counters and reputation
- interest vector
- realism behavior fields and memory fields

## `FeedEvent`

- ingestion model for feed interaction observability and learning signals

## Additional

- `Notification`
- `ForumVote`
- `BlogLike`
- `ViewEvent`

---

## API Reference

## Public APIs

- `GET /api/health`
- `GET /api/blog/feed`
- `POST /api/generate-blog`
- `POST /api/generate-bulk-blogs`
- `POST /api/blog/[slug]/view`
- `POST /api/blog/[slug]/upvote`
- `POST /api/blog/[slug]/downvote`
- `GET|POST /api/blog/[slug]/comments`
- `POST /api/blog/[slug]/comments/[commentId]/vote`
- `GET /api/notifications`
- `POST /api/notifications/read`
- `GET|POST /api/forums`
- `GET|POST /api/forums/[slug]`
- `POST /api/forums/[slug]/comments`
- `POST /api/forums/[slug]/vote`
- `POST /api/forums/[slug]/comments/[commentId]/vote`
- `POST /api/forums/[slug]/best-answer`
- `GET /api/users/profile`
- `POST /api/feed/events`
- `GET /api/trending`

## Admin APIs

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET|POST /api/admin/blog`
- `GET|PATCH|DELETE /api/admin/blog/[id]`
- `GET /api/admin/comments`
- `DELETE /api/admin/comments/[id]`
- `POST /api/admin/generate-blogs`
- `POST /api/admin/generate-forums`
- `POST /api/admin/system/toggles`
- `GET /api/admin/feed/metrics`
- `POST /api/admin/feed/precompute`

---

## UI Component Map

## Layout / shared

- `components/layout/Navbar.tsx`
- `components/layout/NotificationBell.tsx`

## Blog

- `components/blog/BlogList.tsx`
- `components/blog/BlogCard.tsx`
- `components/blog/BlogDetail.tsx` — article detail; includes Related Discussions section and crawlable tag links
- `components/blog/BlogSidebar.tsx` — TOC, FAQs, references, tags (now linked to `/tags/[tag]`), related posts
- `components/blog/CommentSection.tsx`
- `components/blog/CoverImage.tsx`
- `components/blog/MarkdownRenderer.tsx`

## Forums

- `components/forums/ForumCard.tsx`
- `components/forums/ForumCommentSection.tsx`
- `components/forums/SwipeMode.tsx`
- `components/forums/ForumViewCount.tsx`

## Users

- `components/users/UserDirectory.tsx`
- `components/users/UserProfileQuickView.tsx`
- `components/users/TopicActiveUsersStrip.tsx`

## Admin

- `components/admin/AdminBlogForm.tsx`
- `components/admin/AdminBlogTable.tsx`
- `components/admin/ForumTable.tsx`
- `components/admin/AdminCommentTable.tsx`

## Pages (App Router)

- `app/blog/page.tsx` — blog listing with ISR (300s)
- `app/blog/[slug]/page.tsx` — blog detail, SSR with static params (top 1000 posts)
- `app/forums/page.tsx` — forum listing, client-side
- `app/forums/[slug]/page.tsx` — forum thread, SSR with static params (top 50 threads)
- `app/tags/[tag]/page.tsx` — tag hub, SSR with static params (all tags, 600s revalidation) *(new)*
- `app/sitemap.ts` — XML sitemap including static, category, tag, blog, and forum routes
- `app/robots.ts` — blocks `/admin/`, `/api/`

---

## Services / Library Map

- `lib/blogService.ts` — blog querying, transforms, trending windows; includes `getPostsByTag`, `getAllTags` *(updated)*
- `lib/forumService.ts` — forum CRUD/sorting/voting/trending hooks; includes `getRelatedForumPosts`, `getAllForumTags` *(updated)*
- `lib/keywordExtractor.ts` — pure keyword extraction from title, tags, and headings; `extractKeywords`, `descriptionHasKeyword` *(new)*
- `lib/internalLinker.ts` — auto keyword-to-blog markdown link injection; `autoLinkContent`
- `lib/contentStructureChecker.ts` — markdown structure validation (H1/H2/word count/paragraph length); min 300 words *(updated)*
- `lib/userProfileService.ts` — profile ingest/backfill/synthetic/maintenance
- `lib/userProfileService.ts` — includes `getMostEngagedUsersByPost` (strict identity, post-scoped decayed ranking with caps)
- `lib/userBehavior.ts` — behavioral personas and activity timing helpers
- `lib/activityRunner.ts` — queue processor and realism timing loop
- `lib/autopopulateService.ts` — AI-assisted engagement generation
- `lib/feedService.ts` — ranking assembly
- `lib/feedCache.ts` + `lib/redis.ts` — cache paths
- `lib/feedObservability.ts` — event ingestion metrics
- `lib/feedExperiments.ts` — variant assignment and weights
- `lib/feedPrecompute.ts` — background precompute hooks
- `lib/sessionDiversity.ts` — short-term session diversity memory
- `lib/notificationService.ts` — notification operations + cache
- `lib/reputationEngine.ts` — immutable ledger awards, breakdown aggregation by `awarded_points`, cap-safe event writes
- `lib/adminApi.ts` — admin request/response helper patterns
- `lib/personas.ts` / `lib/personaService.ts` — writing persona + interest vector behavior
- `lib/blogSeo.ts` — `buildArticleJsonLd`, `buildBreadcrumbJsonLd`, `buildFaqJsonLd`, `extractFaqItems`
- `lib/forumSeo.ts` — `buildForumPostJsonLd`, `buildForumBreadcrumbJsonLd`
- `lib/seo.ts` — `generateSEO` unified metadata helper

---

## Environment Variables

## Required

- `MONGODB_URI`
- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `ADMIN_BLOG_ENABLED`
- `ADMIN_BLOG_SECRET`
- `SESSION_SECRET`
- `NEXT_PUBLIC_SITE_URL`

## Optional

- `GROQ_MODEL`
- `OPENAI_MODEL`
- `LOG_LEVEL`
- `REDIS_URL`
- `DAILY_AUTO_BLOGS_ENABLED`
- `DAILY_AUTO_BLOGS_RUN_ON_START`
- `DEV_DISABLE_AUTOMATION` (set `true` in local dev to disable background automation loop startup)

## Notes

- `SESSION_SECRET` should be long/random (32+ chars minimum)
- `NEXT_PUBLIC_*` values are client-visible
- avoid trailing newline artifacts when setting secrets from CLI tooling

---

## Setup + Runbook

## Local setup

```bash
git clone <repo-url>
cd tatvaopsblogpage
npm install
cp .env.example .env.local
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

## Common scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run seed`
- `npm run seed:reset`
- `npm run scheduler:daily`

## Fast verification checklist (local)

1. `/blog` loads and cards render with non-placeholder images
2. `/blog/[slug]` vote + view + comments work; Related Discussions section appears when matching forum threads exist
3. `/forums` list and `/forums/[slug]` comments/votes work; Related Articles section appears when matching blogs exist
4. `/tags/[tag]` renders the tag hub with blogs + discussions for a known tag
5. swipe mode opens and transitions without blocking
6. `/users` loads profile list and filter/sort operates
7. `/admin/login` auth gate works with configured secret
8. `GET /sitemap.xml` includes `/tags/[tag]` routes

---

## Deployment (Vercel)

## Current project

- project: `tatvaops-blog-page`
- alias: `https://tatvaops-blog-page.vercel.app`

## Deploy

```bash
vercel deploy --prod --yes
```

## Force deploy (no cache)

```bash
vercel deploy --prod --yes --force
```

## Recommended deploy checks

- verify build includes `/users`, `/blog`, `/forums`, `/tags` routes
- smoke-test API endpoints (`/api/health`, `/api/blog/feed`)
- admin login and one privileged endpoint check
- verify `/sitemap.xml` contains tag hub entries

---

## Troubleshooting

## `/users` appears empty with filters

- check whether loaded slice includes matching subset (dev limits can mask real-photo rows)
- ensure `photosOnly` logic matches avatar classification helper
- verify profile maintenance pass has executed at least once

## Next.js cache corruption (`Cannot find module .next/...js`)

- remove build cache and rebuild:
  - `rm -rf .next && npm run build`
- for dev cache corruption (`ENOENT ... .next-dev/server/app/page.js`), reset and restart:
  - `rm -rf .next-dev .next && npm run dev`

## Long-running `/users` calls

- confirm maintenance throttling is active
- verify DB indexes exist and collection is healthy
- reduce dev load and inspect timeout wrappers

## Feed appears stalled in dev

- dev fallback path may intentionally bypass full heavy ranking branch
- check server logs for timeout fallback markers

## Dev mode feels noisy / unstable (excessive background activity)

- disable automation loops in development:
  - `DEV_DISABLE_AUTOMATION=true`
- this prevents activity runner startup from `app/layout.tsx`, reducing background churn while debugging UI/API behavior

## AI output parse failures

- inspect provider response for malformed JSON
- parser includes extraction fallback but can still fail on severe format drift

## Groq `429` rate-limit in dev logs (`tokens per day`)

If you see logs like:

- `groq error 429 ... tokens per day (TPD) ...`
- `autopopulate AI provider rate-limited; suppressing repeated logs`

that means the Groq daily token quota is exhausted for the configured key/model.

Expected behavior in this project:

- server keeps running (no crash)
- repetitive error spam is intentionally suppressed
- activity queue refill logs can still appear (`activity queue refilled`)
- AI-dependent autopopulate branches may be skipped/degraded until quota resets

Recommended actions:

- wait for quota reset window, or
- switch to another API key with available quota, or
- lower/disable autopopulate load during development if not needed

## Repeated avatars

- run uniqueness maintenance pass (`ensureUniqueAvatarAssignments`) path
- check canonicalization for real-photo URLs

## `/tags/[tag]` returns 404 unexpectedly

- confirm the tag exists in at least one published Blog or non-deleted ForumPost document
- check that `getAllTags` / `getAllForumTags` are returning the tag (query filters include `deleted_at: null` and `published: true` for blogs)
- revalidate or force-rebuild the page if content was added after the last static generation pass

## Sporadic `/blog 404` during dev navigation

Occasional `GET /blog 404` lines can appear during hot reload / route recompilation windows in Next.js dev mode.

Checks:

- if subsequent `/blog` requests return `200`, treat this as transient dev behavior
- if persistent, clear cache and restart:
  - `rm -rf .next-dev .next && npm run dev`

## Related Discussions / Related Articles not appearing

- both sections require at least one matching document; empty arrays render nothing (no broken UI)
- confirm the post has tags set — `getRelatedForumPosts` returns empty when `tags` array is empty
- for forum → blog: `getPostsByTag` uses the first tag only (`post.tags[0]`); posts without tags produce no results

---

## Security Notes

- never commit real credentials or session secrets
- rotate keys immediately if exposure suspected
- keep admin secret and session secret out of client space
- avoid exposing operational internals in public-facing metadata

---

## Known Constraints + Future Work

- behavior realism fields are now persisted, but richer cross-user graph simulation can be expanded
- no explicit user auth account system yet (identity is still activity/fingerprint-based for public users)
- Redis path is optional and intentionally dev-bypassed for stability
- deeper moderation telemetry and anti-abuse models can be extended
- full cloud image storage driver can be expanded further where needed
- `keywordExtractor` is currently a utility only — future: integrate into admin save flow to auto-validate descriptions and flag keyword-free meta before publish
- tag hub pages (`/tags/[tag]`) show newest blogs and hot-ranked forums; future: add pagination for high-volume tags
- internal linker (`lib/internalLinker.ts`) currently links blog content to other blogs only; future: extend to also auto-link forum thread bodies to related blog articles

---

## Current State

TatvaOps now includes:

- production-grade content + forum surfaces
- AI-assisted generation and engagement scaffolding
- personalized feed architecture with experimentation hooks
- robust user profile directory with realism-focused simulation layers
- hardened admin workflows and deployment pipeline
- **SEO content engine**: internal cross-linking (blog↔forum), keyword extraction, tag hub pages at `/tags/[tag]`, content structure enforcement at 300-word minimum, fully crawlable tag graph, and sitemap coverage for all tag routes

The platform is intentionally optimized for iterative product experimentation while preserving operational stability.
