import mongoose, { type Document, type Model } from "mongoose";

// ─── Document interface ───────────────────────────────────────────────────────

export interface IVideoPost extends Document {
  title: string;
  slug: string;

  /** Origin of this video entry */
  sourceType: "youtube" | "uploaded" | "curated";

  /** YouTube video ID (e.g. "dQw4w9WgXcQ"). Required when sourceType === "youtube". */
  youtubeVideoId?: string | null;

  /** Direct MP4 / hosted video URL. Required when sourceType === "uploaded". */
  videoUrl?: string | null;

  /** Resolved embed URL — computed on save, stored for fast reads. */
  embedUrl?: string | null;

  /** Thumbnail URL — for YouTube this defaults to maxresdefault.jpg. */
  thumbnailUrl?: string | null;

  /** Optional animated GIF/MP4 preview shown before play. */
  animatedPreviewUrl?: string | null;

  durationSeconds?: number | null;

  /** Inshorts-style short overlay text shown over the video (max 200 chars). */
  shortCaption: string;

  /** Full transcript text (from captions, upload, or manual entry). */
  transcript?: string | null;

  /** AI or manually written summary for SEO / related-article linking. */
  summary?: string | null;

  tags: string[];
  category: string;

  /** Optional back-link to an existing blog post. */
  linkedBlogSlug?: string | null;

  /** Optional back-link to a related forum thread. */
  linkedForumSlug?: string | null;

  // ── Engagement ──────────────────────────────────────────────────────────────
  views: number;
  likes: number;
  skips: number;
  totalDwellMs: number;

  // ── Ranking ─────────────────────────────────────────────────────────────────
  /** Reddit-style hot score (recomputed on engagement changes). */
  hotScore: number;
  qualityScore: number;

  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive the embed URL from the stored sourceType + IDs. */
function resolveEmbedUrl(doc: Partial<IVideoPost>): string | null {
  if (doc.sourceType === "youtube" && doc.youtubeVideoId) {
    return `https://www.youtube.com/embed/${doc.youtubeVideoId}`;
  }
  if ((doc.sourceType === "uploaded" || doc.sourceType === "curated") && doc.videoUrl) {
    return doc.videoUrl;
  }
  return null;
}

/** Derive a thumbnail URL when none is provided. */
function resolveDefaultThumbnail(doc: Partial<IVideoPost>): string | null {
  if (doc.sourceType === "youtube" && doc.youtubeVideoId) {
    return `https://img.youtube.com/vi/${doc.youtubeVideoId}/maxresdefault.jpg`;
  }
  return null;
}

/** HackerNews-style hot score for video ranking. */
function computeHotScore(likes: number, views: number, skips: number, createdAt: Date): number {
  const ageDays = (Date.now() - createdAt.getTime()) / 86_400_000;
  const gravity = 1.6;
  const engagementPoints = likes * 3 + Math.max(0, views - skips * 2);
  return engagementPoints / Math.pow(ageDays + 1, gravity);
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const videoPostSchema = new mongoose.Schema<IVideoPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    sourceType: {
      type: String,
      enum: ["youtube", "uploaded", "curated"],
      required: true,
      index: true,
    },

    youtubeVideoId: { type: String, default: null },
    videoUrl:       { type: String, default: null },
    embedUrl:       { type: String, default: null },
    thumbnailUrl:   { type: String, default: null },
    animatedPreviewUrl: { type: String, default: null },
    durationSeconds:    { type: Number, default: null, min: 0 },

    shortCaption: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    transcript: { type: String, default: null },
    summary:    { type: String, default: null },

    tags:     { type: [String], default: [], index: true },
    category: { type: String, required: true, trim: true, index: true },

    linkedBlogSlug:  { type: String, default: null, index: true },
    linkedForumSlug: { type: String, default: null },

    // Engagement
    views:       { type: Number, default: 0, min: 0 },
    likes:       { type: Number, default: 0, min: 0 },
    skips:       { type: Number, default: 0, min: 0 },
    totalDwellMs: { type: Number, default: 0, min: 0 },

    // Ranking
    hotScore:     { type: Number, default: 0, index: true },
    qualityScore: { type: Number, default: 0.5, min: 0, max: 1, index: true },

    published: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
);

// ─── Pre-save hooks ───────────────────────────────────────────────────────────

videoPostSchema.pre("save", function (next) {
  // Resolve embedUrl + thumbnailUrl if not manually set
  if (!this.embedUrl) {
    this.embedUrl = resolveEmbedUrl(this);
  }
  if (!this.thumbnailUrl) {
    this.thumbnailUrl = resolveDefaultThumbnail(this);
  }
  // Recompute hot score
  this.hotScore = computeHotScore(
    this.likes,
    this.views,
    this.skips,
    this.createdAt ?? new Date(),
  );
  next();
});

// ─── Model ────────────────────────────────────────────────────────────────────

export const VideoPostModel: Model<IVideoPost> =
  (mongoose.models.VideoPost as Model<IVideoPost> | undefined) ??
  mongoose.model<IVideoPost>("VideoPost", videoPostSchema);

// ─── Plain object type (for API responses / client) ──────────────────────────

export type VideoPost = {
  id: string;
  title: string;
  slug: string;
  sourceType: "youtube" | "uploaded" | "curated";
  youtubeVideoId: string | null;
  videoUrl: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  animatedPreviewUrl: string | null;
  durationSeconds: number | null;
  shortCaption: string;
  transcript: string | null;
  summary: string | null;
  tags: string[];
  category: string;
  linkedBlogSlug: string | null;
  linkedForumSlug: string | null;
  views: number;
  likes: number;
  skips: number;
  totalDwellMs: number;
  hotScore: number;
  qualityScore: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};
