import type { Metadata } from "next";
import { AIInsightsCard } from "@/components/product/AIInsightsCard";
import { deriveProductAIInsights } from "@/lib/product/aiInsights";
import { HubHeader } from "@/components/hubs/HubHeader";
import { HubSections } from "@/components/hubs/HubSections";
import { ProductHub } from "@/components/home/ProductHub";
import { getProductHubData } from "@/lib/hubs/getProductHubData";

type PageProps = { params: Promise<{ productId: string }> };

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const data = await getProductHubData(productId);
  const name = data.product?.name ?? "Product";
  const canonical = `/hubs/product/${encodeURIComponent(decodeURIComponent(productId).trim() || productId)}`;

  return {
    title: `Product Topic Hub | TatvaOps`,
    description: `${name} — forums and articles referencing this product listing.`,
    alternates: { canonical },
  };
}

export default async function ProductDiscussionHubPage({ params }: PageProps) {
  const { productId } = await params;
  const data = await getProductHubData(productId);
  const label = data.product?.name ?? "This listing";
  const insights = deriveProductAIInsights(data.discussions, label, "topic");

  if (!data.product) {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-6 py-10">
        <header className="mb-8">
          <h1 className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-app">Product Topic Hub</h1>
          <p className="mt-2 font-sans text-[0.78rem] font-normal leading-[1.5] text-muted">
            That product listing link is not recognized. Open the brand catalog and use &quot;View discussion&quot; from a
            product card.
          </p>
        </header>
        <HubSections data={data} />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-10">
      <HubHeader mode="product" product={data.product} />

      <div className="mt-2 grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="min-w-0">
          <ProductHub singleProductId={data.product.id} className="lg:h-full" />
        </div>
        <div className="min-w-0">
          <AIInsightsCard {...insights} className="mb-0" />
        </div>
      </div>

      <div className="mt-10">
        <HubSections data={data} />
      </div>
    </main>
  );
}
