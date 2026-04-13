import type { BlogPost } from "./blogService";

type FaqItem = {
  question: string;
  answer: string;
};

export const extractFaqItems = (markdown: string): FaqItem[] => {
  const lines = markdown.split("\n");
  const items: FaqItem[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith("### ")) {
      continue;
    }

    const question = line.replace(/^###\s+/, "").trim();
    if (!question || !question.endsWith("?")) {
      continue;
    }

    const answerLines: string[] = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (next.trim().startsWith("### ") || next.trim().startsWith("## ")) {
        break;
      }
      if (next.trim()) {
        answerLines.push(next.trim());
      }
      i = j;
    }

    const answer = answerLines.join(" ");
    if (answer) {
      items.push({ question, answer });
    }
  }

  return items.slice(0, 6);
};

export const buildArticleJsonLd = (post: BlogPost, siteUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: post.excerpt,
  datePublished: post.created_at,
  dateModified: post.created_at,
  author: {
    "@type": "Person",
    name: post.author,
  },
  image: post.cover_image ? [post.cover_image] : [],
  mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  keywords: post.tags.join(", "),
});

export const buildFaqJsonLd = (faqItems: FaqItem[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
});
