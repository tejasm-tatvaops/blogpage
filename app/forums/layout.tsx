import type { Metadata } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");
const FORUMS_URL = `${SITE_URL}/forums`;

export const metadata: Metadata = {
  title: "TatvaOps Forums | Construction Discussions & Insights",
  description:
    "Join the TatvaOps community. Ask questions, share insights, and discuss construction cost estimation, BOQ strategy, and vendor management.",
  keywords: "construction forums, construction cost discussion, BOQ questions, construction community, TatvaOps forums",
  alternates: { canonical: FORUMS_URL },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
  },
  openGraph: {
    type: "website",
    url: FORUMS_URL,
    title: "TatvaOps Forums | Construction Discussions & Insights",
    description:
      "Ask questions and share insights on construction cost estimation, BOQ, vendor strategy, and more.",
    siteName: "TatvaOps",
  },
  twitter: {
    card: "summary",
    title: "TatvaOps Forums",
    description: "Construction discussions, insights, and community Q&A.",
    site: "@tatvaops",
  },
};

export default function ForumsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
