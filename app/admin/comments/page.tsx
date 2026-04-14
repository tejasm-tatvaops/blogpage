import { AdminCommentTable } from "@/components/admin/AdminCommentTable";
import { requireAdminPageAccess } from "@/lib/adminAuth";
import { getCommentsForAdmin, type AdminComment } from "@/lib/commentService";

export const revalidate = 0;

export default async function AdminCommentsPage() {
  await requireAdminPageAccess();

  let comments: AdminComment[] = [];
  try {
    comments = await getCommentsForAdmin({ limit: 200, page: 1 });
  } catch {
    comments = [];
  }

  return <AdminCommentTable comments={comments} />;
}
