import { SiteJournalsTable } from "@/components/admin/SiteJournalsTable";
import { requireAdminPageAccess } from "@/lib/adminAuth";

export const revalidate = 0;

export default async function AdminSiteJournalsPage() {
  await requireAdminPageAccess();
  return <SiteJournalsTable />;
}
