import { AdminBlogForm } from "@/components/admin/AdminBlogForm";
import { requireAdminPageAccess } from "@/lib/adminAuth";

export const revalidate = 0;

export default async function AdminNewBlogPage() {
  await requireAdminPageAccess();
  return <AdminBlogForm mode="create" />;
}
