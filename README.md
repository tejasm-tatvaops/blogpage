# TatvaOps Blog Platform

TatvaOps is a Next.js 15 App Router project for construction-tech content operations.
It includes public blog pages, admin CMS, AI-assisted authoring, and bulk programmatic SEO generation.

## Tech Stack

- Next.js 15 (App Router + TypeScript)
- MongoDB + Mongoose
- Tailwind CSS v4
- OpenAI API
- React Markdown + remark-gfm
- Radix UI

## Setup

```bash
git clone <your-repo-url>
cd tatvaopsblogpage
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

- `MONGODB_URI` - MongoDB connection string.
- `OPENAI_API_KEY` - used by AI generation API.
- `ADMIN_BLOG_ENABLED` - set to `true` to allow admin routes/API key checks.
- `ADMIN_BLOG_SECRET` - secret key passed in admin URL and `x-admin-key`.
- `NEXT_PUBLIC_SITE_URL` - canonical site URL (default local URL in dev).

## Admin Access

- Admin page: `/admin/blog?key=YOUR_SECRET`
- Admin API routes require header: `x-admin-key: YOUR_SECRET`

## API Endpoints

- `POST /api/generate-blog`
  - input: `{ "keyword": "..." }`
  - output: generated `title`, `slug`, `excerpt`, `content`, `tags`, `category`

- `POST /api/generate-bulk-blogs`
  - input: `{ "locations": ["Bangalore"], "batchSize": 3, "delayMs": 900 }`
  - output: created/skipped/failed summary for bulk generation

- `GET/POST /api/admin/blog`
  - list all posts / create post

- `GET/PATCH/DELETE /api/admin/blog/[id]`
  - fetch/update/delete specific post

## Quick Verification Checklist

- `/blog` loads published posts
- `/blog/[slug]` renders markdown and SEO schema
- `/admin/blog?key=YOUR_SECRET` loads CMS
- create/edit/delete works from admin
- AI generation works in admin form
- bulk generation creates location pages without duplicates
