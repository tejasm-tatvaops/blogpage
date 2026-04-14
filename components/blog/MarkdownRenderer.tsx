import { memo, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

type MarkdownRendererProps = {
  content: string;
};

type MarkdownSection = {
  heading: string;
  body: string;
};

// Allow the same set as defaultSchema but also permit id/class on headings
// so rehype-slug IDs are preserved after sanitization.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "className"],
    a: [...(defaultSchema.attributes?.["a"] ?? []), "href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    th: ["align"],
    td: ["align"],
  },
};

// Cast needed: react-markdown expects mutable Pluggable[] but our tuple is inferred readonly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rehypePlugins = [rehypeSlug, [rehypeSanitize, sanitizeSchema]] as any[];

const splitByH2Sections = (markdown: string): { intro: string; sections: MarkdownSection[] } => {
  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];
  const introLines: string[] = [];
  let current: MarkdownSection | null = null;

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      if (current) {
        current.body = current.body.trim();
        sections.push(current);
      }
      current = { heading: match[1].trim(), body: "" };
      continue;
    }

    if (current) {
      current.body = `${current.body}${current.body ? "\n" : ""}${line}`;
    } else {
      introLines.push(line);
    }
  }

  if (current) {
    current.body = current.body.trim();
    sections.push(current);
  }

  return { intro: introLines.join("\n").trim(), sections };
};

const markdownComponents = {
  a: ({ node: _node, ...props }: ComponentProps<"a"> & { node?: unknown }) => (
    <a
      {...props}
      target={props.href?.startsWith("http") ? "_blank" : undefined}
      rel={props.href?.startsWith("http") ? "noreferrer noopener" : undefined}
    />
  ),
};

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { intro, sections } = splitByH2Sections(content);
  const shouldCollapseSections = sections.length >= 3;

  return (
    <div className="max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-8 prose-a:text-slate-900 prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-slate-700 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-slate-950 prose-pre:p-4 prose-pre:text-slate-100">
      {!shouldCollapseSections ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      ) : (
        <>
          {intro ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={rehypePlugins}
              components={markdownComponents}
            >
              {intro}
            </ReactMarkdown>
          ) : null}

          <div className="mt-8 space-y-4 not-prose">
            {sections.map((section, index) => {
              const isReferences = section.heading.toLowerCase() === "references";
              if (isReferences) {
                return (
                  <section
                    key={`${section.heading}-${index}`}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <div className="px-4 py-3 text-sm font-semibold text-slate-900">References</div>
                    <div className="border-t border-slate-200 px-4 py-4 prose prose-slate max-w-none prose-p:leading-8">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={rehypePlugins}
                        components={markdownComponents}
                      >
                        {section.body}
                      </ReactMarkdown>
                    </div>
                  </section>
                );
              }

              return (
                <details
                  key={`${section.heading}-${index}`}
                  open={index === 0}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-900">
                    <span>{section.heading}</span>
                    <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="border-t border-slate-100 px-4 py-4 prose prose-slate max-w-none prose-p:leading-8">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={rehypePlugins}
                      components={markdownComponents}
                    >
                      {section.body}
                    </ReactMarkdown>
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});
