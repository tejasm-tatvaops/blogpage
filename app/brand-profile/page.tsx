import BrandHeader from "@/components/brand-profile/BrandHeader";
import BrandStats from "@/components/brand-profile/BrandStats";
import ProductLines from "@/components/brand-profile/ProductLines";
import ProductCatalog from "@/components/brand-profile/ProductCatalog";
import BrandTrust from "@/components/brand-profile/BrandTrust";
import BrandRatings from "@/components/brand-profile/BrandRatings";
import DistributorNetwork from "@/components/brand-profile/DistributorNetwork";
import Certifications from "@/components/brand-profile/Certifications";
import BrandInsights from "@/components/brand-profile/BrandInsights";
import { brandProducts } from "@/data/brandProfileMock";

export default function BrandProfilePage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10 md:px-8">

      {/* Breadcrumb */}
      <p className="mb-6 text-xs text-slate-400">
        <a href="/" className="hover:text-sky-500">Home</a>
        {" / "}
        <a href="/brand-profile" className="hover:text-sky-500">Brands</a>
        {" / "}
        <span className="text-slate-600 dark:text-slate-300">UltraTech Cement Ltd.</span>
      </p>

      <div className="flex flex-col gap-5">
        <BrandHeader />
        <BrandStats />
        <ProductLines />
        <ProductCatalog products={brandProducts} />
        <Certifications />
        <DistributorNetwork />

        {/* Brand Trust + Ratings side by side */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BrandTrust />
          <BrandRatings />
        </div>

        <BrandInsights />
      </div>
    </div>
  );
}
