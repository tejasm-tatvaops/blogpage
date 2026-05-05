import type { ReactNode } from "react";

type NestedReplyProps = {
  avatar: ReactNode;
  children: ReactNode;
};

export function NestedReply({ avatar, children }: NestedReplyProps) {
  return (
    <div className="ml-4 flex gap-3 border-l border-white/10 pl-4">
      <div className="h-[30px] w-[30px] shrink-0 overflow-hidden rounded-full border border-white/10">
        {avatar}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
