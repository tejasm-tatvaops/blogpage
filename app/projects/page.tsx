import type { Metadata } from "next";
import { ProjectsFeedView } from "@/components/projects/ProjectsFeedView";
import { getProjectFacetOptionsPersistent, getProjectJournalsPersistent, getProjectsMarketPulsePersistent } from "@/lib/siteJournalService";

export const metadata: Metadata = {
  title: "Site Journals | TatvaOps",
  description: "AI-assisted construction execution journals across regions, site journal types, and risk signals.",
};

export default async function ProjectsPage() {
  const [projects, facets, pulse] = await Promise.all([
    getProjectJournalsPersistent(),
    getProjectFacetOptionsPersistent(),
    getProjectsMarketPulsePersistent(),
  ]);
  return <ProjectsFeedView projects={projects} facets={facets} pulse={pulse} />;
}
