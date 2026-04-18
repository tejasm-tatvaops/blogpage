import { notFound } from "next/navigation";
import { AdminBlogForm } from "@/components/admin/AdminBlogForm";
import { requireAdminPageAccess } from "@/lib/adminAuth";
import { getPostById } from "@/lib/blogService";

type AdminEditPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 0;

export default async function AdminEditBlogPage({ params }: AdminEditPageProps) {
  await requireAdminPageAccess();

  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  return <AdminBlogForm mode="edit" initialPost={post} />;
}
