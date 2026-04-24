# TatvaOps Knowledge Platform Audit and Phased Plan

## Scope and guardrails

- Objective: evolve TatvaOps from content platform to AI-powered knowledge platform.
- Hard constraints preserved: existing routes, APIs, auth, admin workflows, SEO, and data contracts.
- Strategy: extend existing models/services/pipelines; avoid rebuilds.

## Product/System Audit

### Blogs
- **Exists**
  - Mature blog model (`Blog`) with versions, scheduling, counters, tags/categories, full-text indexing.
  - Strong SEO hooks (structured data, metadata, internal linking, crawlable tag graph, sitemap).
  - AI assist endpoint (`/api/blog/[slug]/ask-ai`) grounded in article context.
  - Suggest-edit and revision workflow integrated with reputation.
- **Partial**
  - Ask-AI is article-scoped, not cross-content graph scoped.
  - No explicit trust/freshness/citation indicators on post entities.
- **Missing**
  - Programmatic SEO templates for "X vs Y", "What is X", "Best tools for X" at scale with governance.

### Forums

- **Exists**
  - Full forum lifecycle: listing/sorting/ranking, comments, votes, best answer, trendability.
  - Quality and anti-manipulation scoring in ranking pipeline.
  - Cross-links with blog content.
- **Partial**
  - Forum signal detection exists indirectly via trending/engagement, but not yet connected to generation workflow.
- **Missing**
  - Automated "forum trend -> blog/tutorial draft -> review queue" orchestration.

### Tutorials

- **Exists**
  - Tutorial model with difficulty, learning path links, step order, companion links.
  - User progress model and APIs for completion and step tracking.
  - Learning-path completion and reputation badge hooks.
- **Partial**
  - Progress is inferred from markdown list step keys (good start) but no explicit exercise/quiz schema at tutorial level.
- **Missing**
  - Rich interactive tutorial blocks (typed exercises/challenges embedded in content graph).

### Shorts / Inshorts

- **Exists**
  - `VideoPost` model with source types, engagement metrics, and personalization feed.
  - Cross-link fields (`linkedBlogSlug`, `linkedForumSlug`) already present.
  - Sitemap and route integration for shorts.
- **Partial**
  - Discovery funnel links exist in data model but not consistently enforced/generated in ingestion/recommendation flows.
- **Missing**
  - Explicit funnel analytics and CTA optimization loop from short -> long-form.

### Ingestion Pipeline

- **Exists**
  - Ingestion job model and async processing for URL/PDF/DOC/paste.
  - Draft output support for blog/forum/short_caption/tutorial.
  - Admin ingestion UI and publish workflow.
- **Partial**
  - URL ingest text extraction is generic HTML strip; source-specific treatment is limited.
- **Missing (now partially implemented in this phase)**
  - Specialized source ingestion for YouTube, GitHub repo, research paper.
  - Automatic enrichment payloads (FAQ/glossary/quiz/takeaways/prerequisites/related forum prompts).

### Admin Systems

- **Exists**
  - Admin auth (`iron-session`), rate-limited API guards, moderation and content management workflows.
  - Admin observability/toggles for core systems.
- **Partial**
  - No dedicated AI knowledge-ops dashboard for confidence, freshness, and maintenance queues.

### Review Queue / Revision

- **Exists**
  - Full revision model and workflow (`pending/approved/rejected/rolled_back`) with role checks.
  - Admin review queue APIs and actions.
- **Partial**
  - Review queue is oriented to blog revisions; not yet generalized for generated tutorial/forum drafts from forum/research signals.

### Reputation System

- **Exists**
  - Reputation ledger with event idempotency, anti-abuse, cross-content multiplier, badge unlocks.
  - Tutorial and learning path completion signals already wired.
- **Partial**
  - Trust quality events (citations accepted, correction merged, freshness update) not yet part of event taxonomy.

### Personalization / Feed

- **Exists**
  - Multi-stage feed ranking (candidate buckets, weighted scoring, diversity constraints).
  - Explicit user preferences + implicit behavior signals.
  - Shorts feed personalization variant.
- **Partial**
  - Recommendations still primarily feature-based and tag/category heavy in many places.
- **Missing**
  - Dedicated semantic/concept graph recommendations across all content types.

### SEO Architecture

- **Exists**
  - Tag hubs, sitemap coverage (blog/forum/tags/shorts), robots, internal linking, schema metadata.
  - Content structure checks and keyword tooling.
- **Partial**
  - Topic hubs are tag-centric; not yet unified multi-content knowledge hubs with glossary/tutorial/forum/short aggregation.
- **Missing**
  - Programmatic SEO templates governed by quality and de-dup rules.

### Jobs / Schedulers / Maintenance

- **Exists**
  - Scripted scheduler hooks and precompute/reconciliation systems.
  - Event pipelines and maintenance controls.
- **Partial**
  - Maintenance systems are not yet content-quality focused (staleness, broken links, outdated snippets).
- **Missing**
  - Automated stale detection + revision-draft generation loop.

## Gap Analysis (Extend vs Build)

- **Extend existing**: `ContentIngestionJob`, `ingestionService`, tutorial progress APIs, revision queue, reputation ledger, feed scoring, video cross-links.
- **Do not rebuild**: blog/forum/tutorial/short models, admin auth, route topology, current SEO.
- **New layers needed**: source-specialized ingest adapters, semantic content graph index, trust/freshness metadata, maintenance jobs.

## Architecture Recommendations

- Keep current domain models as canonical publication records.
- Add additive metadata fields for enrichment/trust/graph edges; avoid replacing primary documents.
- Introduce orchestration jobs that write into existing draft + review queue paths.
- Build semantic layer as sidecar index over current published content, not a replacement datastore.
- Enforce strict backward compatibility at API boundaries and admin flows.

## Phased Implementation Plan

### Phase 1: Ingestion moat (highest priority)

- Extend ingest source support (URL + YouTube + GitHub repo + research paper + document flows).
- Add enrichment artifacts (FAQ, glossary, quizzes, takeaways, prerequisite links, related forum topics, cover fallback).
- Preserve existing publish targets and route contracts.

### Phase 2: Interactive tutorials (implemented)

- Add typed tutorial learning blocks (`quiz`, `exercise`, `challenge`) as optional additive schema. ✅
- Reuse `TutorialProgress` for per-block completion and aggregate progress. ✅
- Maintain current markdown compatibility fallback. ✅

### Phase 3: Forum signal -> generation engine (implemented)

- Create trend detector job on forum engagement windows. ✅
- Draft blog/tutorial through existing generation + ingestion pipeline. ✅
- Send outputs into existing review queue. ✅

### Phase 4: Semantic recommendations

- Add embedding/index sidecar for blog/forum/tutorial/short corpus.
- Blend semantic similarity with current ranking features (not replacing feed service).

### Phase 5: Ask AI over content graph

- Expand Ask-AI retrieval to multi-source context pack (tutorial/blog/forum/short transcript chunks).
- Keep source-cited responses only.

### Phase 6: Shorts discovery funnels (implemented baseline)

- Auto-populate and score `linkedBlogSlug` / `linkedForumSlug` / tutorial links from ingestion and recommendation jobs. ✅ (admin sync route + service baseline)
- Add measurement loop for funnel conversion. ✅ (reuses existing event pipeline with linked fields)

### Phase 7: Trust and quality layer (implemented baseline)

- Add confidence/review freshness/citation metadata on drafts and published entities. ✅ (Ask-AI confidence/citation/conflict surfaced + quality metadata path)
- Integrate community correction workflows into revision pipeline. ✅ (existing revision/review queue integration retained)

### Phase 8: Topic hubs (implemented baseline)

- Build multi-content hubs using existing tags + new semantic cluster IDs. ✅ (`/hubs/[topic]` multi-content hub route)
- Keep existing `/tags/[tag]` intact, add hub routes in parallel. ✅

### Phase 9: Programmatic SEO (implemented baseline)

- Template engine for controlled pattern generation with strict dedup + quality thresholds. ✅ (admin template generation service + route)
- Route through existing review queue, not auto-publish by default. ✅ (draft creation via ingestion job, no auto-publish)

### Phase 10: Automated maintenance (implemented baseline)

- Scheduled audits for stale tutorials, broken links, outdated references/code. ✅ (maintenance audit service + admin route for stale tutorial refresh draft generation)
- Auto-open revision drafts for reviewers. ✅ (refresh drafts flow into existing ingestion/review queue)

### Phase 11: Research-to-Tutorial engine (implemented baseline)

- Pipeline: paper ingest -> simplification -> tutorial draft -> short summary -> forum seed thread. ✅ (research pipeline service + admin route)
- Fully reuse ingestion + review + tutorial publish systems. ✅

## What was reused vs newly added (this implementation)

- **Reused**
  - `ContentIngestionJob` lifecycle and status flow.
  - Existing ingestion endpoints and admin UI paths.
  - Existing publish flows for blog/forum/tutorial/short_caption.
  - Existing image generation/cover fallback infrastructure.
- **Newly added (Phase 1)**
  - Source type/subtype expansion for YouTube, GitHub repo, research paper.
  - Enrichment payload fields in ingestion job model.
  - Enrichment-aware draft generation instructions and parsing.
  - Cover generation fallback during ingestion processing.
  - Enrichment appendix injection during publish without route changes.
- **Newly added (Phase 2 + 3)**
  - Interactive tutorial blocks (`quiz`, `exercise`, `challenge`) rendered and tracked through tutorial progress APIs.
  - Forum-trend draft generation job (`/api/admin/tutorials/trend-drafts`) creating ready blog/tutorial drafts in ingestion queue.
  - Tutorials admin trigger for forum-trend draft generation with job polling and refresh.
