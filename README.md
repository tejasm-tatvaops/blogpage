# TatvaOps Blog Platform

TatvaOps Blog Platform is a production-ready Next.js content and community system for construction-focused publishing.  
It includes:

- public blog listing and detail pages
- forum threads with voting, best-answer, and swipe mode
- personalized feed pipeline (candidate generation, scoring, diversity)
- user profile directory (activity-derived + backfilled + synthetic coverage)
- admin CMS with login session auth
- AI-powered article generation (Groq primary, OpenAI fallback)
- programmatic SEO bulk generation
- comments, threaded replies, voting, moderation
- views tracking, reading progress, share actions, notifications
- robust fallback handling for images and rendering

---

## Tech Stack

- Next.js 15 (App Router, TypeScript)
- React 19
- MongoDB + Mongoose
- Tailwind CSS v4
- Groq API + OpenAI API
- iron-session (admin login session)
- React Markdown + remark-gfm + rehype
- Radix UI primitives
- pino logger
- framer-motion
- ioredis (distributed cache path, with dev-safe fallback)

---

## Implemented Features

## Public Experience

- Modern homepage with hero, value cards, and CMS/blog CTAs
- Blog list with:
  - search
  - category chips
  - sorting options
  - view count display on cards
- Blog detail with:
  - sticky reading progress bar
  - upvote and downvote actions
  - comments count and share actions
  - robust cover image loading with fallback chain
  - improved editorial layout and spacing
  - cleaner markdown flow (duplicate title removal)
  - FAQ + References moved to sidebar cards
  - topic-based active users strip
- Sidebar includes:
  - in-article navigation (TOC)
  - topics
  - tags
  - related posts
  - About TatvaOps card
- Forum experience includes:
  - hot/new/top/discussed feeds
  - thread detail pages with best answer support
  - right interaction rail + stats
  - Inshorts-style fullscreen swipe mode with horizontal snap
  - deterministic construction image backgrounds for swipe cards
- Users directory includes:
  - live user cards with profile stats and interests
  - search, sorting, and photo-only filter
  - profile quick view modal from comments/authors
  - aggregate platform/user totals with verification badges

## Blog Engagement

- Post-level voting:
  - upvote endpoint + UI
  - downvote endpoint + UI
- Views tracking:
  - per-session dedupe via `sessionStorage`
  - backend increment route
- Comments:
  - top-level comments
  - replies to comments
  - upvote/downvote for comments
  - sort by Top/Newest
  - typing simulation for incoming activity
  - quick profile drill-in on avatars/names

## Feed + Personalization

- Multi-stage feed pipeline (`/api/blog/feed`):
  - candidate generation (personalized + trending + exploration)
  - scoring with weighted components
  - diversity enforcement
- Experiment-ready scoring weights (variant assignment)
- session-aware repetition penalties
- negative-signal hooks (skip / low dwell capable path)
- distributed cache interface with local fallback
- dev-mode fast fallback path for feed stability

## Notifications

- Notification bell in navbar with unread badge
- latest-notifications dropdown (lazy opened)
- mark-as-read behavior
- backend throttling and short-lived read cache for responsiveness

## Admin CMS

- Session-based admin login at `/admin/login`
- Admin blog table:
  - search/filter
  - edit/delete
  - generate random blogs button
  - comment moderation link
- Admin blog form:
  - AI generation by keyword
  - autosave draft (create mode)
  - URL-based cover image input
  - drag-and-drop image upload from device
  - image preview and remove action
- Admin comment moderation:
  - list comments
  - delete moderation action
- Admin forum tooling:
  - generate random forums
  - feature/unfeature controls
  - forum moderation APIs
- System toggles:
  - live activity
  - notifications
  - personas

## AI + Programmatic SEO

- `generateBlogFromKeyword` supports:
  - Groq as primary provider
  - OpenAI fallback provider
- Prompting includes structured outputs:
  - title, slug, excerpt, content, tags, category
  - external references
- Reference quality controls:
  - strips internal TatvaOps links
  - ensures external references
  - fallback references when AI returns too few
- Bulk generation:
  - random location generation
  - default random count = 3 via admin action
  - duplicate slug prevention
  - created/skipped/failed summary
  - internal link appending
- Autopopulate/realism:
  - AI-generated comments and replies for blogs/forums
  - expanded persona pool + tone/style variation
  - duplicate-content guardrails
  - humanized timing/silence windows in activity runner

## Reliability + Hardening

- Route-level and global error boundaries
- Consistent API validation/helpers in `lib/adminApi.ts`
- Rate limiting with headers and retry hints
- Stable date formatting for hydration-safe rendering
- Cover image fallback chain:
  1. provided/generated image
  2. seeded backup image
  3. local placeholder image
- Login flow supports both:
  - JS fetch submit
  - regular HTML form submit fallback (with redirect)
- API timeout/fallback guards on critical paths:
  - feed
  - notifications
  - users directory data loads
- Dev-safe performance controls:
  - Redis disabled in development to avoid listener churn
  - users page micro-cache + bounded limits
  - heavy user maintenance throttled in request path

---

## Project Structure (Key Areas)

- `app/` - pages and API routes
- `components/blog/` - blog UI and interactions
- `components/forums/` - forum UI, cards, swipe mode, comments, voting
- `components/users/` - directory, profile quick view, topic-user strips
- `components/admin/` - admin CMS UI
- `lib/` - services, auth, AI, utilities
- `models/` - Mongoose schemas
- `scripts/` - seed and scheduler scripts
- `public/images/` - fallback static assets

---

## Setup

```bash
git clone <your-repo-url>
cd tatvaopsblogpage
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Required:

- `MONGODB_URI`
- `OPENAI_API_KEY` (fallback AI provider)
- `GROQ_API_KEY` (primary AI provider)
- `ADMIN_BLOG_ENABLED` (`true` to enable admin)
- `ADMIN_BLOG_SECRET` (admin login secret)
- `SESSION_SECRET` (32+ chars, required by iron-session)
- `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000` in dev)

Optional:

- `GROQ_MODEL`
- `OPENAI_MODEL`
- `LOG_LEVEL`
- `REDIS_URL` (distributed cache; safely bypassed in local dev)
- `DAILY_AUTO_BLOGS_ENABLED` (`true` to run scheduler)
- `DAILY_AUTO_BLOGS_RUN_ON_START` (`true` to run one job immediately on scheduler start)

---

## NPM Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint checks
- `npm run seed` - seed initial blog data
- `npm run seed:reset` - reset + reseed blog data
- `npm run scheduler:daily` - run daily random blog scheduler (5/day)

---

## Admin Access

- Login page: `/admin/login`
- Main CMS page: `/admin/blog`
- Comments moderation: `/admin/comments`

Auth model:

- Password-based login (`ADMIN_BLOG_SECRET`)
- Session cookie (`tatvaops_session`) via iron-session
- API/page guards through `requireAdminApiAccess` and `requireAdminPageAccess`

---

## Main API Endpoints

## Public APIs

- `GET /api/health` - basic health check
- `GET /api/blog/feed` - personalized/trending/exploration feed
- `POST /api/generate-blog` - generate one AI blog draft
- `POST /api/generate-bulk-blogs` - generate location-based bulk blogs
- `POST /api/blog/[slug]/view` - increment post view count
- `POST /api/blog/[slug]/upvote` - increment post upvotes
- `POST /api/blog/[slug]/downvote` - increment post downvotes
- `GET/POST /api/blog/[slug]/comments` - list/create comments
- `POST /api/blog/[slug]/comments/[commentId]/vote` - vote on comment
- `GET /api/notifications` - list notifications
- `POST /api/notifications/read` - mark notifications as read
- `GET /api/forums` - forum listing
- `POST /api/forums` - create forum post
- `GET /api/forums/[slug]` - forum thread detail
- `POST /api/forums/[slug]/comments` - forum comments/replies
- `POST /api/forums/[slug]/vote` - vote on thread
- `GET /api/users/profile` - quick profile lookup by name

## Admin APIs

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET/POST /api/admin/blog`
- `GET/PATCH/DELETE /api/admin/blog/[id]`
- `GET /api/admin/comments`
- `DELETE /api/admin/comments/[id]`
- `POST /api/admin/generate-blogs`
- `POST /api/admin/generate-forums`
- `POST /api/admin/system/toggles`
- `GET /api/admin/feed/metrics`
- `POST /api/admin/feed/precompute`

---

## Vercel Deployment

Project is set up on Vercel as:

- `tatvaops-blog-page`
- live alias: `https://tatvaops-blog-page.vercel.app`

Deploy command:

```bash
vercel deploy --prod --yes
```

If you need a full rebuild without cache:

```bash
vercel deploy --prod --yes --force
```

Important: when adding env values from CLI, avoid accidental trailing newline characters.

---

## Troubleshooting

## Admin says "disabled" on production

- Ensure production env vars are set and clean:
  - `ADMIN_BLOG_ENABLED=true` (exact)
  - `ADMIN_BLOG_SECRET`
  - `SESSION_SECRET`
- Redeploy after env changes.

## Hydration mismatch in admin table

- Avoid locale-varying rendering in client/server output.
- Stable formatters are used for dates/counts.

## Image not loading / broken preview

- Cover image component auto-falls back to secondary + local default.
- If stale browser cache exists, hard refresh.

## Generate random blogs slow or appears stuck

- Bulk generation calls AI providers and includes delay/rate-limit controls.
- Wait for server response; admin UI shows created/skipped/failed summary.

---

## Security Notes

- Never commit real secrets into repository.
- Rotate API keys if exposed.
- `NEXT_PUBLIC_*` values are visible in browser bundles.
- Keep `SESSION_SECRET` long and random.

---

## Status

This repository is now set up as an end-to-end, production-oriented blog + forums + users platform with AI generation, moderation, personalization, and deployment hardening.
