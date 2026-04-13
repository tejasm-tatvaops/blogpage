import { notFound } from "next/navigation";
import { AdminBlogForm } from "@/components/admin/AdminBlogForm";
import { requireAdminPageAccess } from "@/lib/adminAuth";
import { getPostById } from "@/lib/blogService";

type AdminEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ key?: string }>;
};

export const revalidate = 0;

export default async function AdminEditBlogPage({ params, searchParams }: AdminEditPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const key = query?.key ?? null;
  requireAdminPageAccess(key);

  const post = await getPostById(id);
  if (!post) {
    notFound();
  }

  return <AdminBlogForm mode="edit" adminKey={key ?? ""} initialPost={post} />;
}
