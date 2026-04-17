import type { Metadata } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");
const SITE_NAME = "TatvaOps";
const TWITTER_HANDLE = "@tatvaops";

export { SITE_URL, SITE_NAME };

export interface SeoInput {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
  noIndex?: boolean;
}

const toAbsoluteUrl = (value: string): string => {
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

/**
 * Unified metadata generator. Produces title, description, keywords,
 * canonical URL, Open Graph, and Twitter Card tags from a single input object.
 *
 * Usage:
 *   export async function generateMetadata(): Promise<Metadata> {
 *     return generateSEO({ title: "My Page", description: "...", url: "/my-page" });
 *   }
 */
export function generateSEO({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  tags,
  noIndex = false,
}: SeoInput): Metadata {
  const absoluteUrl = toAbsoluteUrl(url);
  const absoluteImage = image ? toAbsoluteUrl(image) : undefined;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    ...(keywords?.length ? { keywords: keywords.join(", ") } : {}),
    alternates: { canonical: absoluteUrl },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          "max-snippet": -1,
          "max-image-preview": "large",
          "max-video-preview": -1,
        },
    openGraph: {
      type,
      url: absoluteUrl,
      title,
      description,
      siteName: SITE_NAME,
      ...(absoluteImage
        ? { images: [{ url: absoluteImage, width: 1200, height: 630, alt: title }] }
        : {}),
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(authors?.length ? { authors } : {}),
      ...(tags?.length ? { tags } : {}),
    },
    twitter: {
      card: absoluteImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(absoluteImage ? { images: [absoluteImage] } : {}),
      site: TWITTER_HANDLE,
    },
  };
}
