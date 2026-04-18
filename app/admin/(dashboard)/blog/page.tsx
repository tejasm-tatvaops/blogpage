import { AdminBlogTable } from "@/components/admin/AdminBlogTable";
import { requireAdminPageAccess } from "@/lib/adminAuth";
import { type BlogPost, getAllPosts } from "@/lib/blogService";

export const revalidate = 0;

export default async function AdminBlogPage() {
  await requireAdminPageAccess();

  let posts: BlogPost[] = [];
  try {
    posts = await getAllPosts({ includeDrafts: true, limit: 100 });
  } catch {
    posts = [];
  }

  return <AdminBlogTable posts={posts} />;
}
