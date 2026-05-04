import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export interface ThreadCardData {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  authorName: string;
  authorGradient?: string;
  authorAvatar?: string | null;
  category?: string;
  tags?: string[];
  upvotes: number;
  commentCount: number;
  viewCount: number;
  createdAt: string | Date;
  isPinned?: boolean;
  isPopular?: boolean;
}

export interface ThreadCardProps {
  thread: ThreadCardData;
  className?: string;
}

function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function ThreadCard({ thread, className }: ThreadCardProps) {
  return (
    <Link
      href={`/forums/${thread.slug}`}
      className={cn(
        "group block rounded-[18px] border border-[var(--color-border)]",
        "bg-[var(--color-card)]",
        "hover:border-[#ea580c]/30 hover:shadow-[0_4px_20px_rgba(234,88,12,0.08)]",
        "hover:translate-y-[-1px] transition-all duration-200",
        className,
      )}
    >
      <div className="px-[16px] py-[14px]">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar
            src={thread.authorAvatar ?? null}
            name={thread.authorName}
            size={44}
            gradient={thread.authorGradient}
            className="mt-0.5 flex-shrink-0"
          />

          <div className="min-w-0 flex-1">
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[0.72rem] font-semibold text-[var(--color-text)]">
                {thread.authorName}
              </span>
              <span className="text-[0.72rem] text-[var(--color-text-muted)]" aria-hidden>·</span>
              <span className="text-[0.72rem] text-[var(--color-text-muted)]">
                {formatDate(thread.createdAt)}
              </span>
              {thread.category && (
                <>
                  <span className="text-[0.72rem] text-[var(--color-text-muted)]" aria-hidden>·</span>
                  <Badge variant="info">{thread.category}</Badge>
                </>
              )}
              {thread.isPinned && (
                <Badge variant="warning">Pinned</Badge>
              )}
              {thread.isPopular && (
                <Badge variant="orange" dot>Popular</Badge>
              )}
            </div>

            {/* Title */}
            <p className="mt-1 text-[0.8rem] font-semibold leading-snug text-[var(--color-text)] group-hover:text-[#f97316] transition-colors duration-200 line-clamp-2">
              {thread.title}
            </p>

            {/* Excerpt */}
            {thread.excerpt && (
              <p className="mt-1 text-[0.72rem] text-[var(--color-text-muted)] line-clamp-1">
                {thread.excerpt}
              </p>
            )}

            {/* Stats row */}
            <div className="mt-2 flex gap-4 text-[0.72rem] text-[var(--color-text-faint)]">
              {/* Upvotes */}
              <span className="inline-flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                {formatCount(thread.upvotes)}
              </span>
              {/* Comments */}
              <span className="inline-flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {formatCount(thread.commentCount)}
              </span>
              {/* Views */}
              <span className="inline-flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {formatCount(thread.viewCount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
