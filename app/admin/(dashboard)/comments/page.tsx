import { AdminCommentTable } from "@/components/admin/AdminCommentTable";
import { requireAdminPageAccess } from "@/lib/adminAuth";
import { getCommentsForAdmin, type AdminComment } from "@/lib/commentService";

export const revalidate = 0;

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  await requireAdminPageAccess();

  const params = searchParams ? await searchParams : undefined;
  const typeParam = params?.type;
  const type = typeParam === "forum" || typeParam === "blog" ? typeParam : "all";

  let comments: AdminComment[] = [];
  try {
    comments = await getCommentsForAdmin({ limit: 200, page: 1, type });
  } catch {
    comments = [];
  }

  return <AdminCommentTable comments={comments} initialType={type} />;
}
