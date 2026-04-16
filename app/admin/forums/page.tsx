import { ForumTable } from "@/components/admin/ForumTable";
import { requireAdminPageAccess } from "@/lib/adminAuth";

export const revalidate = 0;

export default async function AdminForumsPage() {
  await requireAdminPageAccess();
  return <ForumTable />;
}
