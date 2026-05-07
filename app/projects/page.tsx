import type { Metadata } from "next";
import { ProjectsFeedView } from "@/components/projects/ProjectsFeedView";
import { getProjectFacetOptionsPersistent, getProjectJournalsPersistent, getProjectsMarketPulsePersistent } from "@/lib/siteJournalService";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");
const PROJECTS_URL = `${SITE_URL}/projects`;

export const metadata: Metadata = {
  title: "Site Journals | TatvaOps",
  description: "AI-assisted construction execution journals across regions, site journal types, and risk signals.",
  alternates: { canonical: PROJECTS_URL },
  openGraph: {
    type: "website",
    url: PROJECTS_URL,
    title: "Site Journals | TatvaOps",
    description: "Explore AI-assisted construction execution journals by city, risk, and site signals.",
    siteName: "TatvaOps",
  },
  twitter: {
    card: "summary",
    title: "Site Journals | TatvaOps",
    description: "Construction execution journals with AI intelligence and weekly field updates.",
    site: "@tatvaops",
  },
};

export default async function ProjectsPage() {
  const [projects, facets, pulse] = await Promise.all([
    getProjectJournalsPersistent(),
    getProjectFacetOptionsPersistent(),
    getProjectsMarketPulsePersistent(),
  ]);
  return <ProjectsFeedView projects={projects} facets={facets} pulse={pulse} />;
}
