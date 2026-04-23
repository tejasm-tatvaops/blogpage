function hashToGradient(seed: string): string {
  const gradients = [
    "from-blue-500 to-indigo-500",
    "from-purple-500 to-pink-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-cyan-500 to-blue-500",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length]!;
}

export type AvatarModel =
  | { type: "image"; src: string }
  | { type: "initials"; name: string; gradient: string }
  | { type: "dicebear"; src: string };

export function getUserAvatar(user: any): AvatarModel {
  const avatar = user?.avatar_url;

  if (avatar && typeof avatar === "string" && avatar.trim() && !avatar.includes("undefined")) {
    return { type: "image", src: avatar };
  }

  const name = user?.display_name || user?.author_name || "User";
  const identity = user?.identity_key || name;

  if (String(identity).startsWith("google:")) {
    return {
      type: "initials",
      name,
      gradient: hashToGradient(String(identity)),
    };
  }

  return {
    type: "dicebear",
    src: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(identity)}`,
  };
}
