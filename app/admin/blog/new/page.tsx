import { AdminBlogForm } from "@/components/admin/AdminBlogForm";
import { requireAdminPageAccess } from "@/lib/adminAuth";

type AdminNewPageProps = {
  searchParams?: Promise<{ key?: string }>;
};

export const revalidate = 0;

export default async function AdminNewBlogPage({ searchParams }: AdminNewPageProps) {
  const params = await searchParams;
  const key = params?.key ?? null;
  requireAdminPageAccess(key);

  return <AdminBlogForm mode="create" adminKey={key ?? ""} />;
}
