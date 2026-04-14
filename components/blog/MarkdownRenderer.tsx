import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

type MarkdownRendererProps = {
  content: string;
};

type MarkdownSection = {
  heading: string;
  body: string;
};

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

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { intro, sections } = splitByH2Sections(content);
  const shouldCollapseSections = sections.length >= 3;

  return (
    <div className="max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-8 prose-a:text-slate-900 prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-slate-700 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-slate-950 prose-pre:p-4 prose-pre:text-slate-100">
      {!shouldCollapseSections ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      ) : (
        <>
          {intro ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSlug]}
              components={markdownComponents}
            >
              {intro}
            </ReactMarkdown>
          ) : null}

          <div className="mt-8 space-y-4 not-prose">
            {sections.map((section, index) => (
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
                    rehypePlugins={[rehypeSlug]}
                    components={markdownComponents}
                  >
                    {section.body}
                  </ReactMarkdown>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
