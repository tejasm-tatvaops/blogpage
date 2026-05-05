"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/tutorial/VideoPlayer";
import { TutorialTabs, type TabId } from "@/components/tutorial/TutorialTabs";
import { TranscriptPanel, type TranscriptItem } from "@/components/tutorial/TranscriptPanel";
import { SummaryPanel } from "@/components/tutorial/SummaryPanel";
import { NotesPanel, type TutorialNote } from "@/components/tutorial/NotesPanel";

type ContentSection = {
  id: string;
  title: string;
  markdown: string;
};

function splitMarkdownIntoSections(markdown: string): ContentSection[] {
  const lines = markdown.split("\n");
  const sections: ContentSection[] = [];
  let currentTitle = "Introduction";
  let currentLines: string[] = [];
  let sectionIndex = 1;

  const pushCurrent = () => {
    const content = currentLines.join("\n").trim();
    if (!content) return;
    sections.push({
      id: String(sectionIndex),
      title: currentTitle,
      markdown: content,
    });
    sectionIndex += 1;
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      pushCurrent();
      currentTitle = headingMatch[1].trim();
      currentLines = [];
      continue;
    }
    currentLines.push(line);
  }

  pushCurrent();
  if (sections.length === 0) {
    return [{ id: "1", title: "Tutorial", markdown }];
  }
  return sections;
}

function buildTranscript(sections: ContentSection[]): TranscriptItem[] {
  let elapsed = 0;
  return sections.map((section, index) => {
    const words = section.markdown.split(/\s+/).filter(Boolean).length;
    const sectionDuration = Math.max(10, Math.floor(words / 3));
    const item = {
      time: elapsed,
      text: section.title || `Step ${index + 1}`,
    };
    elapsed += sectionDuration;
    return item;
  });
}

export function LearningExperience({
  slug,
  title,
  videoUrl,
  markdown,
  storedTranscript,
  description,
}: {
  slug: string;
  title: string;
  videoUrl: string;
  markdown: string;
  storedTranscript?: TranscriptItem[];
  description?: string;
}) {
  const videoRef = useRef<VideoPlayerHandle | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("transcript");
  const [currentTime, setCurrentTime] = useState(0);
  const [completedSectionIds, setCompletedSectionIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<TutorialNote[]>([]);
  const sections = useMemo(() => splitMarkdownIntoSections(markdown), [markdown]);
  const generatedTranscript = useMemo(() => buildTranscript(sections), [sections]);
  const transcript = storedTranscript && storedTranscript.length > 0 ? storedTranscript : generatedTranscript;
  const summaryBullets = useMemo(() => {
    if (storedTranscript && storedTranscript.length > 0) {
      // Key points from transcript: first few chunks as short excerpts
      return storedTranscript.slice(0, 5).map((item) => {
        const words = item.text.split(" ");
        return words.length > 15 ? `${words.slice(0, 15).join(" ")}…` : item.text;
      });
    }
    return sections.slice(0, 5).map((section) => {
      const words = section.markdown.split(" ").slice(0, 12).join(" ");
      return `${words}...`;
    });
  }, [storedTranscript, sections]);
  const progressStorageKey = `tatvaops-tutorial-sections-${slug}`;
  const notesStorageKey = `tatvaops-tutorial-notes-${slug}`;
  const videoProgressStorageKey = `video-progress-${slug}`;
  const sanitizeSchema = useMemo(
    () => ({
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "className"],
        img: ["src", "alt", "title", "width", "height", "loading"],
      },
    }),
    [],
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(progressStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        setCompletedSectionIds(Array.isArray(parsed) ? parsed : []);
      }
      const savedNotes = localStorage.getItem(notesStorageKey);
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes) as TutorialNote[];
        setNotes(Array.isArray(parsed) ? parsed : []);
      }
      const savedVideoTime = localStorage.getItem(videoProgressStorageKey);
      if (savedVideoTime) {
        const parsedVideoTime = Number(savedVideoTime);
        if (Number.isFinite(parsedVideoTime)) {
          setCurrentTime(parsedVideoTime);
          setTimeout(() => {
            videoRef.current?.seekTo(parsedVideoTime);
          }, 250);
        }
      }
    } catch {
      // localStorage can be unavailable in private mode.
    }
  }, [notesStorageKey, progressStorageKey, videoProgressStorageKey]);

  useEffect(() => {
    localStorage.setItem(progressStorageKey, JSON.stringify(completedSectionIds));
  }, [completedSectionIds, progressStorageKey]);

  useEffect(() => {
    localStorage.setItem(notesStorageKey, JSON.stringify(notes));
  }, [notes, notesStorageKey]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setCompletedSectionIds((previous) => {
          const updated = new Set(previous);
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const id = entry.target.getAttribute("data-section-id");
              if (id) updated.add(id);
            }
          }
          return Array.from(updated);
        });
      },
      { threshold: 0.6 },
    );

    const nodes = Array.from(document.querySelectorAll("[data-section-id]"));
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sections.length]);

  return (
    <>
      {currentTime > 10 && (
        <div className="mb-2 text-xs text-sky-600">Resuming from {Math.floor(currentTime)}s</div>
      )}
      <VideoPlayer
        ref={videoRef}
        sourceUrl={videoUrl}
        title={title}
        onTimeUpdate={(seconds) => {
          setCurrentTime(seconds);
          localStorage.setItem(videoProgressStorageKey, String(Math.floor(seconds)));
        }}
      />

      <div className="mb-6 mt-4">
        <TutorialTabs activeTab={activeTab} onChange={setActiveTab} />
        {activeTab === "transcript" && (
          <TranscriptPanel
            transcript={transcript}
            currentTime={currentTime}
            seekTo={(seconds) => videoRef.current?.seekTo(seconds)}
          />
        )}
        {activeTab === "summary" && (
          <div className="rounded-xl border border-app bg-surface p-4 shadow-sm">
            <SummaryPanel bullets={summaryBullets} description={description} />
          </div>
        )}
        {activeTab === "notes" && (
          <NotesPanel
            notes={notes}
            currentTime={currentTime}
            onAdd={(note) => setNotes((prev) => [note, ...prev])}
            onSeek={(seconds) => videoRef.current?.seekTo(seconds)}
          />
        )}
      </div>

      <div className="space-y-6">
        {sections.map((section, index) => (
          <section
            key={section.id}
            data-section-id={section.id}
            className="rounded-xl border border-app bg-surface p-6 shadow-sm"
          >
            <h2 className="mb-2 text-lg font-semibold text-app">
              {index + 1}. {section.title}
            </h2>
            {completedSectionIds.includes(section.id) && (
              <span className="text-xs font-semibold text-emerald-600">✓ Completed</span>
            )}
            <button
              type="button"
              onClick={() => videoRef.current?.seekTo(transcript[index]?.time ?? index * 30)}
              className="mb-2 mt-2 text-xs font-semibold text-sky-600 hover:underline"
            >
              ▶ Jump to this part
            </button>
            <article className="prose prose-slate max-w-none prose-img:rounded-lg prose-img:w-full">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
                components={{
                  img({ src, alt, title: imageTitle }) {
                    if (!src) return null;
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={alt ?? ""}
                        title={imageTitle}
                        loading="lazy"
                        decoding="async"
                        className="my-4 w-full rounded-lg object-cover"
                        style={{ maxHeight: "560px" }}
                      />
                    );
                  },
                }}
              >
                {section.markdown}
              </ReactMarkdown>
            </article>
          </section>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between rounded-xl border border-app bg-surface p-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-slate-400">Next lesson</p>
            <p className="text-sm font-semibold text-slate-800">BOQ Optimization Basics</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
        >
          Continue →
        </button>
      </div>
    </>
  );
}
