import type { BrandProduct } from "@/data/brandProfileMock";
import { humanizeHubSlug } from "@/lib/hubs/humanizeSlug";

type TopicHubHeaderProps = { mode?: "topic"; hubSlug: string };

type ProductDiscussionHubHeaderProps = {
  mode: "product";
  product: BrandProduct;
};

export type HubHeaderProps = TopicHubHeaderProps | ProductDiscussionHubHeaderProps;

export function HubHeader(props: HubHeaderProps) {
  if (props.mode === "product") {
    const { product } = props;
    return (
      <header className="mb-6">
        <h1 className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-app">Product Topic Hub</h1>
        <p className="mt-2 font-sans text-[0.78rem] font-normal leading-[1.5] text-muted">
          <span className="font-medium text-app">{product.brand}</span> {product.name} — community forums and articles
          that reference this listing.
        </p>
      </header>
    );
  }

  const display = humanizeHubSlug(props.hubSlug);
  return (
    <header className="mb-6">
      <h1 className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-app">Product Topic Hub</h1>
      <p className="mt-2 font-sans text-[0.78rem] font-normal leading-[1.5] text-muted">
        Topic <span className="font-medium text-app">{display}</span> — forums and blog articles for this hub.
      </p>
    </header>
  );
}
