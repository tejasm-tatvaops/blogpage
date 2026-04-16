import { addComment, voteComment } from "./commentService";
import { incrementForumCommentCount } from "./forumService";
import { getAllPosts } from "./blogService";
import { getForumPosts } from "./forumService";
import { CommentModel } from "@/models/Comment";
import { connectToDatabase } from "./mongodb";
import { logger } from "./logger";
import { pickDistinctFakeUsers } from "./fakeUsers";

// ─── AI helpers (mirrors aiBlogGenerator.ts pattern) ───────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const AI_TIMEOUT_MS = 30_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`AI request timed out after ${ms / 1000}s`)), ms),
    ),
  ]);

// ─── Types ──────────────────────────────────────────────────────────────────

type AiComment = {
  content: string;
  tone: "helpful" | "question" | "opinion" | "skeptical" | "appreciative";
  replies: Array<{ content: string }>;
};

export type AutopopulateStats = {
  postsProcessed: number;
  commentsCreated: number;
  repliesCreated: number;
  errors: number;
};

// ─── Distribution helpers ───────────────────────────────────────────────────

const pickCommentCount = (): number => {
  const roll = Math.random();
  if (roll < 0.35) return 0;
  if (roll < 0.65) return 1 + Math.floor(Math.random() * 2); // 1–2
  if (roll < 0.85) return 3 + Math.floor(Math.random() * 2); // 3–4
  return 4 + Math.floor(Math.random() * 4); // 4–7 (capped by AI to 5)
};

const SKIP_COMMENT_THRESHOLD = 8;

// ─── AI call ────────────────────────────────────────────────────────────────

const buildPrompt = (
  title: string,
  excerpt: string,
  context: "blog" | "forum",
  commentCount: number,
): string => `You are simulating authentic human engagement on a construction-tech platform called TatvaOps.

Generate ${commentCount} realistic comment(s) for the following ${context} post. Comments must feel like they were written by different real professionals in construction, civil engineering, BOQ, vendor procurement, or project management.

Post title: "${title}"
Post excerpt: "${excerpt.slice(0, 400)}"

Return ONLY a valid JSON array (no markdown, no prose) matching this schema exactly:
[
  {
    "content": "string (the comment text, 10–300 chars, natural human language)",
    "tone": "helpful" | "question" | "opinion" | "skeptical" | "appreciative",
    "replies": [
      { "content": "string (reply text, 10–200 chars)" }
    ]
  }
]

Rules:
- Vary comment lengths: some short (1 sentence), some 2–3 sentences, occasionally longer
- Vary tones naturally across the ${commentCount} comment(s)
- Replies array: 0–2 items per comment, only on some comments
- No spam, no generic filler like "great post" unless paired with specific detail
- Use domain-specific language naturally (rates, BOQ, drawings, site, tender, contractor, etc.)
- Max ${commentCount} root comments, max 2 replies per comment
- No emoji overuse`;

const callAI = async (prompt: string): Promise<AiComment[]> => {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const providers = [
    ...(groqKey
      ? [
          {
            name: "groq" as const,
            url: GROQ_API_URL,
            key: groqKey,
            model: GROQ_MODEL,
            supportsJsonMode: false,
          },
        ]
      : []),
    ...(openaiKey
      ? [
          {
            name: "openai" as const,
            url: OPENAI_API_URL,
            key: openaiKey,
            model: OPENAI_MODEL,
            supportsJsonMode: true,
          },
        ]
      : []),
  ];

  if (providers.length === 0) {
    throw new Error("No AI provider configured (GROQ_API_KEY or OPENAI_API_KEY required).");
  }

  let lastError: Error = new Error("No providers tried.");

  for (const provider of providers) {
    try {
      const body: Record<string, unknown> = {
        model: provider.model,
        temperature: 0.85,
        max_tokens: 1024,
        messages: [
          { role: "system", content: "Return only valid JSON arrays. No prose, no markdown." },
          { role: "user", content: prompt },
        ],
      };
      if (provider.supportsJsonMode) {
        body.response_format = { type: "json_object" };
      }

      const response = await withTimeout(
        fetch(provider.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.key}`,
          },
          body: JSON.stringify(body),
        }),
        AI_TIMEOUT_MS,
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`${provider.name} error ${response.status}: ${text.slice(0, 200)}`);
      }

      const completion = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = completion.choices?.[0]?.message?.content ?? "";

      return parseAiComments(raw);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Unknown AI error.");
      logger.warn({ provider: provider.name, error: lastError.message }, "autopopulate AI provider failed");
    }
  }

  throw lastError;
};

const parseAiComments = (raw: string): AiComment[] => {
  const trimmed = raw.trim();

  // Strip fenced code blocks
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const payload = fenced?.[1]?.trim() ?? trimmed;

  // Handle json_object wrapper e.g. { "comments": [...] }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    // Try extracting first array
    const arrayMatch = payload.match(/\[[\s\S]*\]/);
    if (!arrayMatch) throw new Error("No JSON array found in AI response.");
    parsed = JSON.parse(arrayMatch[0]);
  }

  // Unwrap if wrapped in object
  if (!Array.isArray(parsed) && typeof parsed === "object" && parsed !== null) {
    const values = Object.values(parsed as Record<string, unknown>);
    const first = values.find(Array.isArray);
    if (first) parsed = first;
  }

  if (!Array.isArray(parsed)) throw new Error("AI response is not an array.");

  return (parsed as unknown[])
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .slice(0, 5)
    .map((item) => ({
      content: String(item.content ?? "").trim().slice(0, 300),
      tone: (["helpful", "question", "opinion", "skeptical", "appreciative"].includes(
        String(item.tone),
      )
        ? item.tone
        : "opinion") as AiComment["tone"],
      replies: Array.isArray(item.replies)
        ? (item.replies as unknown[])
            .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
            .slice(0, 2)
            .map((r) => ({ content: String(r.content ?? "").trim().slice(0, 200) }))
        : [],
    }))
    .filter((c) => c.content.length >= 3);
};

// ─── Comment count check ─────────────────────────────────────────────────────

const getExistingCommentCount = async (postId: string): Promise<number> => {
  await connectToDatabase();
  return CommentModel.countDocuments({ post_id: postId, deleted_at: null });
};

// ─── Per-post processor ──────────────────────────────────────────────────────

type PostTarget = {
  id: string;
  title: string;
  excerpt: string;
  type: "blog" | "forum";
  comment_count?: number; // forum has this denormalized
};

const processPost = async (
  post: PostTarget,
): Promise<{ commentsCreated: number; repliesCreated: number }> => {
  let commentsCreated = 0;
  let repliesCreated = 0;

  // Skip posts that already have a lot of comments
  const existingCount =
    post.type === "forum" && typeof post.comment_count === "number"
      ? post.comment_count
      : await getExistingCommentCount(post.id);

  if (existingCount >= SKIP_COMMENT_THRESHOLD) {
    logger.debug({ postId: post.id, existingCount }, "autopopulate: skipping post with high comment count");
    return { commentsCreated: 0, repliesCreated: 0 };
  }

  const targetCount = pickCommentCount();
  if (targetCount === 0) {
    logger.debug({ postId: post.id }, "autopopulate: post rolled 0 comments");
    return { commentsCreated: 0, repliesCreated: 0 };
  }

  const count = Math.min(targetCount, SKIP_COMMENT_THRESHOLD - existingCount);
  if (count <= 0) return { commentsCreated: 0, repliesCreated: 0 };

  logger.info({ postId: post.id, title: post.title, count }, "autopopulate: generating comments");

  const prompt = buildPrompt(post.title, post.excerpt, post.type, count);

  let aiComments: AiComment[];
  try {
    aiComments = await callAI(prompt);
  } catch (err) {
    logger.error({ postId: post.id, error: (err as Error).message }, "autopopulate: AI call failed");
    return { commentsCreated: 0, repliesCreated: 0 };
  }

  const users = pickDistinctFakeUsers(aiComments.length + aiComments.reduce((sum, c) => sum + c.replies.length, 0));
  let userIndex = 0;

  for (const aiComment of aiComments) {
    if (!aiComment.content || aiComment.content.length < 3) continue;

    const author = users[userIndex % users.length]!;
    userIndex++;

    let parentId: string;
    try {
      const created = await addComment(post.id, {
        author_name: author.name,
        content: aiComment.content,
        parent_comment_id: null,
      });
      parentId = created.id;
      commentsCreated++;

      if (post.type === "forum") {
        await incrementForumCommentCount(post.id);
      }

      // Random upvotes on comments (realistic: most good comments get some likes)
      const upvoteRoll = Math.random();
      if (upvoteRoll > 0.3) {
        const upvotes = Math.floor(Math.random() * 6) + 1; // 1–6
        for (let i = 0; i < upvotes; i++) {
          await voteComment(post.id, parentId, "up");
        }
      }
      // Occasional downvotes
      if (Math.random() < 0.1) {
        await voteComment(post.id, parentId, "down");
      }
    } catch (err) {
      logger.warn({ postId: post.id, error: (err as Error).message }, "autopopulate: failed to create comment");
      continue;
    }

    // Delay between comments for realism and API safety
    await sleep(200 + Math.random() * 300);

    for (const reply of aiComment.replies) {
      if (!reply.content || reply.content.length < 3) continue;

      const replyAuthor = users[userIndex % users.length]!;
      userIndex++;

      try {
        const createdReply = await addComment(post.id, {
          author_name: replyAuthor.name,
          content: reply.content,
          parent_comment_id: parentId,
        });
        repliesCreated++;

        if (post.type === "forum") {
          await incrementForumCommentCount(post.id);
        }

        // Replies get fewer upvotes
        if (Math.random() > 0.5) {
          const upvotes = Math.floor(Math.random() * 3) + 1;
          for (let i = 0; i < upvotes; i++) {
            await voteComment(post.id, createdReply.id, "up");
          }
        }
      } catch (err) {
        logger.warn({ postId: post.id, error: (err as Error).message }, "autopopulate: failed to create reply");
      }

      await sleep(150 + Math.random() * 200);
    }

    await sleep(300 + Math.random() * 500);
  }

  return { commentsCreated, repliesCreated };
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const populateBlogs = async (limit = 20): Promise<AutopopulateStats> => {
  const safeLimit = Math.min(Math.max(1, limit), 20);
  const stats: AutopopulateStats = { postsProcessed: 0, commentsCreated: 0, repliesCreated: 0, errors: 0 };

  let posts;
  try {
    posts = await getAllPosts({ includeDrafts: false, sort: "latest", limit: safeLimit });
  } catch (err) {
    logger.error({ error: (err as Error).message }, "autopopulate: failed to fetch blog posts");
    stats.errors++;
    return stats;
  }

  for (const post of posts) {
    try {
      const result = await processPost({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        type: "blog",
      });
      stats.postsProcessed++;
      stats.commentsCreated += result.commentsCreated;
      stats.repliesCreated += result.repliesCreated;
    } catch (err) {
      logger.error({ postId: post.id, error: (err as Error).message }, "autopopulate: blog post processing error");
      stats.errors++;
    }

    await sleep(500 + Math.random() * 500);
  }

  logger.info(stats, "autopopulate: blog run complete");
  return stats;
};

export const populateForums = async (limit = 20): Promise<AutopopulateStats> => {
  const safeLimit = Math.min(Math.max(1, limit), 20);
  const stats: AutopopulateStats = { postsProcessed: 0, commentsCreated: 0, repliesCreated: 0, errors: 0 };

  let result;
  try {
    result = await getForumPosts({ sort: "new", page: 1, limit: safeLimit });
  } catch (err) {
    logger.error({ error: (err as Error).message }, "autopopulate: failed to fetch forum posts");
    stats.errors++;
    return stats;
  }

  for (const post of result.posts) {
    try {
      const processed = await processPost({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        type: "forum",
        comment_count: post.comment_count,
      });
      stats.postsProcessed++;
      stats.commentsCreated += processed.commentsCreated;
      stats.repliesCreated += processed.repliesCreated;
    } catch (err) {
      logger.error({ postId: post.id, error: (err as Error).message }, "autopopulate: forum post processing error");
      stats.errors++;
    }

    await sleep(500 + Math.random() * 500);
  }

  logger.info(stats, "autopopulate: forum run complete");
  return stats;
};
