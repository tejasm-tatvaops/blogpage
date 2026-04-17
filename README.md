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
- `/blog/[slug]` detail with article rendering, interactions, related content, and topic strips

### 2) Public Forums

- `/forums` feed with sort modes and forum cards
- `/forums/[slug]` thread detail with comments/votes/best-answer
- swipe mode for immersive feed exploration

### 3) Users Directory

- `/users` real-time-ish directory of reader/contributor profiles
- includes profile cards, behavior hints, interests, activity stats, and quick profile access points

### 4) Admin

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
  - topic active users strip
  - social share actions
  - cover image fallback chain hardened against placeholder-only outputs

## Forum Experience

- forum listing:
  - Reddit-like sort behavior (`hot/new/top/discussed`)
  - card-level metadata and author profile quick access
- thread detail:
  - comments and nested replies
  - per-thread vote flow
  - best answer feature
  - view count tracking
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
  - “recently helpful” strip
  - behavior hints (active now, topic contributor, familiarity hints)
  - identity context chips (role, city, experience)
  - weekly activity sparkline and activity snippets

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
- `components/blog/BlogDetail.tsx`
- `components/blog/CommentSection.tsx`
- `components/blog/CoverImage.tsx`

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

---

## Services / Library Map

- `lib/blogService.ts` — blog querying, transforms, trending windows
- `lib/forumService.ts` — forum CRUD/sorting/voting/trending hooks
- `lib/userProfileService.ts` — profile ingest/backfill/synthetic/maintenance
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
- `lib/adminApi.ts` — admin request/response helper patterns
- `lib/personas.ts` / `lib/personaService.ts` — writing persona + interest vector behavior

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
2. `/blog/[slug]` vote + view + comments work
3. `/forums` list and `/forums/[slug]` comments/votes work
4. swipe mode opens and transitions without blocking
5. `/users` loads profile list and filter/sort operates
6. `/admin/login` auth gate works with configured secret

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

- verify build includes `/users`, `/blog`, `/forums` routes
- smoke-test API endpoints (`/api/health`, `/api/blog/feed`)
- admin login and one privileged endpoint check

---

## Troubleshooting

## `/users` appears empty with filters

- check whether loaded slice includes matching subset (dev limits can mask real-photo rows)
- ensure `photosOnly` logic matches avatar classification helper
- verify profile maintenance pass has executed at least once

## Next.js cache corruption (`Cannot find module .next/...js`)

- remove build cache and rebuild:
  - `rm -rf .next && npm run build`

## Long-running `/users` calls

- confirm maintenance throttling is active
- verify DB indexes exist and collection is healthy
- reduce dev load and inspect timeout wrappers

## Feed appears stalled in dev

- dev fallback path may intentionally bypass full heavy ranking branch
- check server logs for timeout fallback markers

## AI output parse failures

- inspect provider response for malformed JSON
- parser includes extraction fallback but can still fail on severe format drift

## Repeated avatars

- run uniqueness maintenance pass (`ensureUniqueAvatarAssignments`) path
- check canonicalization for real-photo URLs

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

---

## Current State

TatvaOps now includes:

- production-grade content + forum surfaces
- AI-assisted generation and engagement scaffolding
- personalized feed architecture with experimentation hooks
- robust user profile directory with realism-focused simulation layers
- hardened admin workflows and deployment pipeline

The platform is intentionally optimized for iterative product experimentation while preserving operational stability.
