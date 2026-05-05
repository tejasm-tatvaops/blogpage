import type { ReactNode } from "react";

type CommentProps = {
  avatar: ReactNode;
  header: ReactNode;
  content: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
};

export function Comment({ avatar, header, content, actions, children }: CommentProps) {
  return (
    <div className="flex gap-3 py-4">
      <div className="h-[38px] w-[38px] shrink-0 overflow-hidden rounded-full border border-white/10">
        {avatar}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="text-sm text-slate-200">{header}</div>
        <div className="text-sm leading-6 text-slate-300">{content}</div>
        <div className="flex flex-wrap gap-2 text-xs">{actions}</div>
        {children}
      </div>
    </div>
  );
}
