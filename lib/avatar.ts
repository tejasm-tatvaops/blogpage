// Seeded from randomuser nat=in profiles so "real photos" skew Indian.
const INDIAN_LEANING_REAL_PHOTO_POOL = [
  "https://randomuser.me/api/portraits/men/47.jpg",
  "https://randomuser.me/api/portraits/women/10.jpg",
  "https://randomuser.me/api/portraits/women/83.jpg",
  "https://randomuser.me/api/portraits/men/9.jpg",
  "https://randomuser.me/api/portraits/men/46.jpg",
  "https://randomuser.me/api/portraits/men/5.jpg",
  "https://randomuser.me/api/portraits/men/19.jpg",
  "https://randomuser.me/api/portraits/women/40.jpg",
  "https://randomuser.me/api/portraits/women/11.jpg",
  "https://randomuser.me/api/portraits/women/80.jpg",
  "https://randomuser.me/api/portraits/women/23.jpg",
  "https://randomuser.me/api/portraits/men/96.jpg",
  "https://randomuser.me/api/portraits/men/74.jpg",
  "https://randomuser.me/api/portraits/men/34.jpg",
  "https://randomuser.me/api/portraits/women/32.jpg",
  "https://randomuser.me/api/portraits/women/27.jpg",
  "https://randomuser.me/api/portraits/women/64.jpg",
  "https://randomuser.me/api/portraits/women/56.jpg",
  "https://randomuser.me/api/portraits/women/28.jpg",
  "https://randomuser.me/api/portraits/men/66.jpg",
  "https://randomuser.me/api/portraits/women/93.jpg",
  "https://randomuser.me/api/portraits/women/34.jpg",
  "https://randomuser.me/api/portraits/men/27.jpg",
  "https://randomuser.me/api/portraits/women/19.jpg",
  "https://randomuser.me/api/portraits/men/99.jpg",
  "https://randomuser.me/api/portraits/women/0.jpg",
  "https://randomuser.me/api/portraits/women/76.jpg",
];

const GLOBAL_REAL_PHOTO_POOL = [
  "https://randomuser.me/api/portraits/men/11.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/men/13.jpg",
  "https://randomuser.me/api/portraits/women/14.jpg",
];
const REAL_PHOTO_INDIAN_SHARE = 0.94;
type GenderPreference = "male" | "female" | null;
const GENERATED_AVATAR_STYLES = ["personas", "lorelei", "adventurer-neutral", "bottts-neutral"] as const;

const hashForIndex = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const isRealPhotoAvatar = (avatarUrl: string): boolean =>
  /randomuser\.me\/api\/portraits\//i.test(avatarUrl);

const pickByGender = (pool: string[], hash: number, gender: GenderPreference): string => {
  if (!gender) return pool[hash % pool.length]!;
  const filtered = pool.filter((url) => url.includes(`/${gender === "male" ? "men" : "women"}/`));
  const source = filtered.length > 0 ? filtered : pool;
  return source[hash % source.length]!;
};

export const getRealPhotoForIdentity = (
  seed: string,
  options?: { genderPreference?: GenderPreference },
): string => {
  const hash = hashForIndex(seed);
  const normalized = (hash % 10_000) / 10_000;
  const useIndianPool = normalized < REAL_PHOTO_INDIAN_SHARE;
  const pool = useIndianPool ? INDIAN_LEANING_REAL_PHOTO_POOL : GLOBAL_REAL_PHOTO_POOL;
  return pickByGender(pool, hash, options?.genderPreference ?? null);
};

export const getAvatarForIdentity = (
  seed: string,
  options?: { genderPreference?: GenderPreference },
): string => {
  const hash = hashForIndex(seed);
  // Keep a realistic mix app-wide.
  if (hash % 10 < 3) {
    return getRealPhotoForIdentity(seed, options);
  }
  return getGeneratedAvatarForIdentity(seed);
};

export const getGeneratedAvatarForIdentity = (seed: string): string => {
  const hash = hashForIndex(seed);
  const style = GENERATED_AVATAR_STYLES[hash % GENERATED_AVATAR_STYLES.length]!;
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
};
