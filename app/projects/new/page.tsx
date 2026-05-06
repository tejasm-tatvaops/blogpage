import type { Metadata } from "next";
import { SiteJournalCreateForm } from "@/components/projects/SiteJournalCreateForm";

export const metadata: Metadata = {
  title: "Start Site Journal | TatvaOps",
  description: "Start a professional construction execution diary and continue with weekly field notes.",
};

export default function NewSiteJournalPage() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8">
      <SiteJournalCreateForm />
    </main>
  );
}
