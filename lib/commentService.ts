import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { CommentModel, type CommentDocument } from "@/models/Comment";
import { connectToDatabase } from "./mongodb";

export type Comment = {
  id: string;
  parent_comment_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
  upvote_count: number;
  downvote_count: number;
  score: number;
  replies: Comment[];
};

export type AdminComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
  upvote_count: number;
  downvote_count: number;
};

const notDeleted = { deleted_at: null };

const toComment = (doc: CommentDocument): Comment => ({
  id: doc._id.toString(),
  parent_comment_id: doc.parent_comment_id ?? null,
  author_name: doc.author_name,
  content: doc.content,
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
    content: input.content,
    upvote_count: 0,
    downvote_count: 0,
    deleted_at: null,
  });
  return toComment(doc.toObject() as unknown as CommentDocument);
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
}: {
  page?: number;
  limit?: number;
} = {}): Promise<AdminComment[]> => {
  await connectToDatabase();
  const safeLimit = Math.min(Math.max(1, limit), 200);
  const skip = (Math.max(1, page) - 1) * safeLimit;
  const docs = (await CommentModel.find({ ...notDeleted })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(safeLimit)
    .lean()) as unknown as CommentDocument[];

  return docs.map((doc) => ({
    id: doc._id.toString(),
    post_id: doc.post_id,
    parent_comment_id: doc.parent_comment_id ?? null,
    author_name: doc.author_name,
    content: doc.content,
    created_at: doc.created_at.toISOString(),
    upvote_count: doc.upvote_count ?? 0,
    downvote_count: doc.downvote_count ?? 0,
  }));
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
