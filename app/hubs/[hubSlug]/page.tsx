import type { Metadata } from "next";
import { AIInsightsCard } from "@/components/product/AIInsightsCard";
import { deriveProductAIInsights } from "@/lib/product/aiInsights";
import { HubHeader } from "@/components/hubs/HubHeader";
import { HubSections } from "@/components/hubs/HubSections";
import { ProductHub } from "@/components/home/ProductHub";
import { getHubData } from "@/lib/hubs/getHubData";
import { humanizeHubSlug } from "@/lib/hubs/humanizeSlug";

type HubPageProps = { params: Promise<{ hubSlug: string }> };

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: HubPageProps): Promise<Metadata> {
  const { hubSlug } = await params;
  const label = humanizeHubSlug(hubSlug);
  const canonical = `/hubs/${encodeURIComponent(decodeURIComponent(hubSlug).trim() || hubSlug)}`;

  return {
    title: `${label} Knowledge Hub | TatvaOps`,
    description: `Unified knowledge hub for ${label}: forum discussions and blog articles.`,
    alternates: { canonical },
  };
}

export default async function HubPage({ params }: HubPageProps) {
  const { hubSlug } = await params;
  const data = await getHubData(hubSlug);
  const label = humanizeHubSlug(hubSlug);

  const insights = deriveProductAIInsights(data.discussions, label, "topic");

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-10">
      <HubHeader hubSlug={hubSlug} />
      <AIInsightsCard {...insights} />
      <ProductHub hubSlug={hubSlug} topicLabel={label} className="mt-8" />
      <HubSections data={data} />
    </main>
  );
}
