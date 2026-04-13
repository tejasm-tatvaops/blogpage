import { NextResponse } from "next/server";

type GeneratedBlogResponse = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  category: string;
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const parseAiJson = (text: string): GeneratedBlogResponse => {
  const parsed = JSON.parse(text) as Partial<GeneratedBlogResponse>;
  if (!parsed.title || !parsed.excerpt || !parsed.content || !parsed.category) {
    throw new Error("AI response missing required fields.");
  }

  return {
    title: parsed.title,
    slug: toSlug(parsed.slug || parsed.title),
    excerpt: parsed.excerpt,
    content: parsed.content,
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t)) : [],
    category: parsed.category,
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { keyword?: string; internalLinks?: string[] };
    const keyword = body.keyword?.trim();
    const internalLinks = Array.isArray(body.internalLinks)
      ? body.internalLinks.map((link) => String(link).trim()).filter(Boolean).slice(0, 8)
      : [];

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const prompt = `You are an SEO construction-tech content strategist for TatvaOps.
Generate one blog post as strict JSON (no markdown wrapper, no prose).
Keyword: "${keyword}"

Return JSON with keys:
title: string
slug: string
excerpt: string (max 170 chars)
content: markdown string with H1 title, intro, 4-6 H2 sections, FAQs section, and final CTA section titled "Get your construction estimate"
tags: string[] (4 to 8 tags)
category: string

Content goals:
- High-intent search traffic around construction, BOQ, estimation, vendor workflows.
- Actionable and practical tone.
- Add one comparison table in markdown.
- Include at least 4 FAQs.
- Avoid fake statistics.
- Include one section on local cost factors (labor/materials/regulations/logistics).
- Add internal links where relevant: ${internalLinks.length ? internalLinks.join(", ") : "/blog, /estimate"}.
`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Return only valid JSON for the requested schema.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return NextResponse.json(
        { error: `OpenAI request failed: ${errorText}` },
        { status: aiResponse.status },
      );
    }

    const completion = (await aiResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Empty AI response." }, { status: 500 });
    }

    const generated = parseAiJson(content);
    return NextResponse.json(generated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate blog content." },
      { status: 500 },
    );
  }
}
