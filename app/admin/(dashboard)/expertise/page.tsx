import { requireAdminPageAccess } from "@/lib/adminAuth";
import { ExpertiseSettingsPanel } from "@/components/admin/ExpertiseSettingsPanel";

export const metadata = { title: "Expertise Settings" };

export default async function ExpertiseSettingsPage() {
  await requireAdminPageAccess();
  return (
    <div className="mx-auto max-w-6xl p-6">
      <ExpertiseSettingsPanel />
    </div>
  );
}
