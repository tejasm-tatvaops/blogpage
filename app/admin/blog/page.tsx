import { AdminBlogTable } from "@/components/admin/AdminBlogTable";
import { requireAdminPageAccess } from "@/lib/adminAuth";
import { getAllPosts } from "@/lib/blogService";

type AdminBlogPageProps = {
  searchParams?: Promise<{ key?: string }>;
};

export const revalidate = 0;

export default async function AdminBlogPage({ searchParams }: AdminBlogPageProps) {
  const params = await searchParams;
  const key = params?.key ?? null;
  requireAdminPageAccess(key);

  const posts = await getAllPosts({ includeDrafts: true, limit: 1000 });
  return <AdminBlogTable posts={posts} adminKey={key ?? ""} />;
}
