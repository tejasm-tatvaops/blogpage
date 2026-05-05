"use client";

type TranscriptItem = {
  time: number;
  text: string;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TranscriptPanel({
  transcript,
  currentTime,
  seekTo,
}: {
  transcript: TranscriptItem[];
  currentTime: number;
  seekTo: (seconds: number) => void;
}) {
  return (
    <div className="rounded-xl border border-app bg-surface p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Transcript</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {transcript.slice(0, 6).map((item) => (
          <button
            key={`chip-${item.time}`}
            type="button"
            onClick={() => seekTo(item.time)}
            className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 transition hover:bg-sky-100 hover:text-sky-700"
          >
            {formatTime(item.time)}
          </button>
        ))}
        {transcript.length > 6 && (
          <span className="self-center text-xs text-slate-400">+ {transcript.length - 6} more</span>
        )}
      </div>
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {transcript.map((item, index) => {
          const nextTime = transcript[index + 1]?.time ?? Number.POSITIVE_INFINITY;
          const active = currentTime >= item.time && currentTime < nextTime;
          return (
            <button
              key={`${item.time}`}
              type="button"
              onClick={() => seekTo(item.time)}
              className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition ${
                active
                  ? "border-l-2 border-sky-500 bg-sky-50 shadow-sm"
                  : "hover:bg-slate-50"
              }`}
            >
              <span className="min-w-[3rem] shrink-0 text-xs font-semibold text-sky-700">
                {formatTime(item.time)}
              </span>
              <span className="text-sm leading-relaxed text-slate-600">{item.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { TranscriptItem };
