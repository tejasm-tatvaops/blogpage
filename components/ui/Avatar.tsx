import Image from "next/image";
import { cn } from "@/lib/cn";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  gradient?: string;
  className?: string;
}

export function Avatar({
  src,
  name,
  size = 44,
  gradient = "from-orange-500 to-rose-500",
  className,
}: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "ring-2 ring-black/10 dark:ring-white/10 shadow-sm",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes={`${size}px`}
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center bg-gradient-to-br text-white",
            gradient,
          )}
          style={{ fontSize: Math.round(size * 0.38) }}
          aria-hidden
        >
          {initials}
        </span>
      )}
    </span>
  );
}
