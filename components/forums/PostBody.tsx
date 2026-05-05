import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";

export function PostBody({ content }: { content: string }) {
  return (
    <article className="prose prose-slate mb-6 max-w-none rounded-2xl border border-app bg-surface p-6 shadow-sm">
      <MarkdownRenderer content={content} />
    </article>
  );
}
