import type { UserProfile } from "@/lib/userProfileService";

const ROLE_POOL = [
  "Site Engineer",
  "Quantity Surveyor",
  "Procurement Lead",
  "Project Coordinator",
  "Architectural Coordinator",
  "Construction Planner",
  "Project Manager",
  "Vendor Manager",
];

const CITY_POOL = ["Bangalore", "Pune", "Hyderabad", "Chennai", "Mumbai", "Delhi", "Ahmedabad", "Kochi"];

const hashForIndex = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const deriveProfileContext = (user: UserProfile): { role: string; city: string; years: number } => {
  const seed = `${user.id}|${user.display_name}`;
  const hash = hashForIndex(seed);
  return {
    role: ROLE_POOL[hash % ROLE_POOL.length]!,
    city: CITY_POOL[(hash >> 2) % CITY_POOL.length]!,
    years: (hash % 11) + 2,
  };
};

export const getBehaviorSegment = (user: UserProfile): { label: string; className: string } => {
  const forumActions = user.forum_posts + user.forum_comments + user.forum_votes;
  const totalActions = forumActions + user.blog_comments + user.blog_likes;
  if (user.reputation_score >= 500 || forumActions >= 24) {
    return { label: "Expert", className: "bg-violet-100 text-violet-700" };
  }
  if (totalActions >= 18) {
    return { label: "Contributor", className: "bg-sky-100 text-sky-700" };
  }
  if (user.blog_views >= 25 || user.forum_views >= 12) {
    return { label: "Reader", className: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Explorer", className: "bg-slate-100 text-slate-600" };
};

export const getRecentActions = (user: UserProfile): Array<{ text: string; href: string }> => {
  const actions: Array<{ text: string; href: string }> = [];
  if (user.last_forum_slug) {
    actions.push({
      text: `Commented on forum thread ${user.last_forum_slug.replace(/-/g, " ")}`,
      href: `/forums/${user.last_forum_slug}`,
    });
  }
  if (user.last_blog_slug) {
    actions.push({
      text: `Read blog ${user.last_blog_slug.replace(/-/g, " ")}`,
      href: `/blog/${user.last_blog_slug}`,
    });
  }
  if (user.blog_likes > 0) {
    actions.push({
      text: `Reacted to ${user.blog_likes} posts this month`,
      href: user.last_blog_slug ? `/blog/${user.last_blog_slug}` : "/blog",
    });
  }
  if (actions.length === 0) {
    actions.push({ text: "Browsing community updates", href: "/users" });
  }
  return actions.slice(0, 2);
};
