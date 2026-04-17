import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { CommentModel, type CommentDocument } from "@/models/Comment";
import { ForumPostModel } from "@/models/ForumPost";
import { createNotification } from "@/lib/notificationService";
import { connectToDatabase } from "./mongodb";

export type Comment = {
  id: string;
  parent_comment_id: string | null;
  author_name: string;
  persona_name: string | null;
  content: string;
  is_ai_generated: boolean;
  created_at: string;
  upvote_count: number;
  downvote_count: number;
  score: number;
  replies: Comment[];
};

export type AdminComment = {
  id: string;
  post_id: string;
  comment_type: "blog" | "forum";
  parent_comment_id: string | null;
  author_name: string;
  persona_name: string | null;
  content: string;
  is_ai_generated: boolean;
  created_at: string;
  upvote_count: number;
  downvote_count: number;
};

const notDeleted = { deleted_at: null };

const toComment = (doc: CommentDocument): Comment => ({
  id: doc._id.toString(),
  parent_comment_id: doc.parent_comment_id ?? null,
  author_name: doc.author_name,
  persona_name: doc.persona_name ?? null,
  content: doc.content,
  is_ai_generated: doc.is_ai_generated ?? false,
  created_at: doc.created_at.toISOString(),
  upvote_count: doc.upvote_count ?? 0,
  downvote_count: doc.downvote_count ?? 0,
  score: (doc.upvote_count ?? 0) - (doc.downvote_count ?? 0),
  replies: [],
});

export const commentInputSchema = z.object({
  author_name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name too long")
    .trim(),
  content: z
    .string()
    .min(3, "Comment must be at least 3 characters")
    .max(2000, "Comment too long")
    .trim(),
  parent_comment_id: z.string().optional().nullable(),
  is_ai_generated: z.boolean().optional().default(false),
  persona_name: z.string().max(120).optional().nullable(),
});

export type CommentInput = z.infer<typeof commentInputSchema>;

export const getComments = async (postId: string): Promise<Comment[]> => {
  await connectToDatabase();
  const docs = (await CommentModel.find({ post_id: postId, ...notDeleted })
    .sort({ created_at: 1 })
    .limit(300)
    .lean()) as unknown as CommentDocument[];
  const mapped = docs.map(toComment);

  const rootComments = mapped.filter((comment) => !comment.parent_comment_id);
  const repliesByParent = new Map<string, Comment[]>();
  for (const comment of mapped) {
    if (!comment.parent_comment_id) continue;
    const bucket = repliesByParent.get(comment.parent_comment_id) ?? [];
    bucket.push(comment);
    repliesByParent.set(comment.parent_comment_id, bucket);
  }

  for (const root of rootComments) {
    root.replies = (repliesByParent.get(root.id) ?? []).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  return rootComments.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

export const addComment = async (postId: string, input: CommentInput): Promise<Comment> => {
  await connectToDatabase();
  const parentId = input.parent_comment_id?.trim() || null;

  if (parentId) {
    if (!isValidObjectId(parentId)) {
      throw new Error("Invalid parent comment.");
    }

    const parent = (await CommentModel.findOne({
      _id: parentId,
      post_id: postId,
      ...notDeleted,
    })
      .select("_id parent_comment_id")
      .lean()) as Pick<CommentDocument, "_id" | "parent_comment_id"> | null;

    if (!parent) {
      throw new Error("Parent comment not found.");
    }
    if (parent.parent_comment_id) {
      throw new Error("Only one reply level is supported.");
    }
  }

  const doc = await CommentModel.create({
    post_id: postId,
    parent_comment_id: parentId,
    author_name: input.author_name,
    persona_name: input.persona_name ?? null,
    content: input.content,
    is_ai_generated: input.is_ai_generated ?? false,
    upvote_count: 0,
    downvote_count: 0,
    deleted_at: null,
  });
  const created = toComment(doc.toObject() as unknown as CommentDocument);

  if (parentId) {
    const parent = (await CommentModel.findById(parentId).select("author_name").lean()) as
      | { author_name?: string }
      | null;
    const parentAuthor = parent?.author_name?.trim();
    if (parentAuthor && parentAuthor !== input.author_name) {
      await createNotification({
        type: "reply",
        post_id: postId,
        comment_id: created.id,
        recipient_key: `author:${parentAuthor.toLowerCase()}`,
        message: `${input.author_name} replied to your comment.`,
      });
    }
  } else {
    const forumPost = (await ForumPostModel.findById(postId)
      .select("creator_fingerprint")
      .lean()) as { creator_fingerprint?: string | null } | null;
    if (forumPost?.creator_fingerprint) {
      await createNotification({
        type: "comment",
        post_id: postId,
        comment_id: created.id,
        recipient_key: `fp:${forumPost.creator_fingerprint}`,
        message: `${input.author_name} commented on a post you are watching.`,
      });
    }
  }
  return created;
};

export const voteComment = async (
  postId: string,
  commentId: string,
  direction: "up" | "down",
): Promise<Pick<Comment, "id" | "upvote_count" | "downvote_count" | "score"> | null> => {
  await connectToDatabase();
  if (!isValidObjectId(commentId)) return null;

  const field = direction === "up" ? "upvote_count" : "downvote_count";
  const updated = (await CommentModel.findOneAndUpdate(
    { _id: commentId, post_id: postId, ...notDeleted },
    { $inc: { [field]: 1 } },
    { new: true },
  ).lean()) as CommentDocument | null;

  if (!updated) return null;

  const up = updated.upvote_count ?? 0;
  const down = updated.downvote_count ?? 0;
  return {
    id: updated._id.toString(),
    upvote_count: up,
    downvote_count: down,
    score: up - down,
  };
};

export const getCommentsForAdmin = async ({
  page = 1,
  limit = 100,
  type = "all",
}: {
  page?: number;
  limit?: number;
  type?: "all" | "blog" | "forum";
} = {}): Promise<AdminComment[]> => {
  await connectToDatabase();
  const safeLimit = Math.min(Math.max(1, limit), 200);
  const skip = (Math.max(1, page) - 1) * safeLimit;
  const docs = (await CommentModel.find({ ...notDeleted })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(safeLimit)
    .lean()) as unknown as CommentDocument[];

  const candidateForumPostIds = Array.from(
    new Set(docs.map((doc) => doc.post_id).filter((value) => isValidObjectId(value))),
  );
  const forumIds = new Set<string>();
  if (candidateForumPostIds.length > 0) {
    const forumDocs = await ForumPostModel.find({
      _id: { $in: candidateForumPostIds },
      deleted_at: null,
    })
      .select("_id")
      .lean();
    for (const forumDoc of forumDocs as Array<{ _id: { toString(): string } }>) {
      forumIds.add(forumDoc._id.toString());
    }
  }

  const mapped = docs.map((doc) => ({
    id: doc._id.toString(),
    post_id: doc.post_id,
    comment_type: forumIds.has(doc.post_id) ? ("forum" as const) : ("blog" as const),
    parent_comment_id: doc.parent_comment_id ?? null,
    author_name: doc.author_name,
    persona_name: doc.persona_name ?? null,
    content: doc.content,
    is_ai_generated: doc.is_ai_generated ?? false,
    created_at: doc.created_at.toISOString(),
    upvote_count: doc.upvote_count ?? 0,
    downvote_count: doc.downvote_count ?? 0,
  }));

  if (type === "all") return mapped;
  return mapped.filter((comment) => comment.comment_type === type);
};

export const deleteCommentById = async (commentId: string): Promise<boolean> => {
  await connectToDatabase();
  if (!isValidObjectId(commentId)) return false;

  const result = await CommentModel.findOneAndUpdate(
    { _id: commentId, ...notDeleted },
    { deleted_at: new Date() },
    { new: false },
  )
    .select("_id")
    .lean();

  return Boolean(result);
};

export const getCommentMetaById = async (
  commentId: string,
): Promise<{ post_id: string } | null> => {
  await connectToDatabase();
  if (!isValidObjectId(commentId)) return null;
  const result = await CommentModel.findOne({ _id: commentId, ...notDeleted })
    .select("post_id")
    .lean();
  if (!result?.post_id) return null;
  return { post_id: result.post_id };
};
