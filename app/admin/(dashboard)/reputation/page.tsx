import { requireAdminPageAccess } from "@/lib/adminAuth";
import { ReputationAdminPanel } from "@/components/admin/ReputationAdminPanel";

export const metadata = { title: "Reputation Admin" };

export default async function ReputationAdminPage() {
  await requireAdminPageAccess();
  return (
    <div className="mx-auto max-w-6xl p-6">
      <ReputationAdminPanel />
    </div>
  );
}
