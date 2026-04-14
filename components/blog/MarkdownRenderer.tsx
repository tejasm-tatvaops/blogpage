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

const normalizeContent = (markdown: string): string => {
  const lines = markdown.split("\n");
  const trimmedStart = lines.findIndex((line) => line.trim().length > 0);
  if (trimmedStart === -1) return markdown;

  const firstLine = lines[trimmedStart]?.trim() ?? "";
  if (firstLine.startsWith("# ")) {
    lines.splice(trimmedStart, 1);
    if (lines[trimmedStart]?.trim() === "") {
      lines.splice(trimmedStart, 1);
    }
  }
  return lines.join("\n").trim();
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
  const cleanedContent = normalizeContent(content);
  const { intro, sections } = splitByH2Sections(cleanedContent);

  return (
    <div className="max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-8 prose-a:text-slate-900 prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-slate-700 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-slate-950 prose-pre:p-4 prose-pre:text-slate-100">
      {intro ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}
        >
          {intro}
        </ReactMarkdown>
      ) : null}

      <div className="mt-8 space-y-5 not-prose">
        {sections.map((section, index) => {
          const isReferences = section.heading.toLowerCase() === "references";
          return (
            <section
              key={`${section.heading}-${index}`}
              className={`overflow-hidden rounded-xl border ${
                isReferences ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-white"
              }`}
            >
              <div className="px-4 py-3 text-sm font-semibold text-slate-900">{section.heading}</div>
              <div className="border-t border-slate-100 px-4 py-4 prose prose-slate max-w-none prose-p:leading-8">
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
        })}
      </div>
    </div>
  );
});
