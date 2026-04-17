const REAL_PHOTO_POOL = [
  "https://randomuser.me/api/portraits/men/11.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/men/13.jpg",
  "https://randomuser.me/api/portraits/women/14.jpg",
  "https://randomuser.me/api/portraits/men/15.jpg",
  "https://randomuser.me/api/portraits/women/16.jpg",
  "https://randomuser.me/api/portraits/men/17.jpg",
  "https://randomuser.me/api/portraits/women/18.jpg",
  "https://randomuser.me/api/portraits/men/19.jpg",
  "https://randomuser.me/api/portraits/women/20.jpg",
  "https://randomuser.me/api/portraits/men/21.jpg",
  "https://randomuser.me/api/portraits/women/22.jpg",
  "https://randomuser.me/api/portraits/men/23.jpg",
  "https://randomuser.me/api/portraits/women/24.jpg",
  "https://randomuser.me/api/portraits/men/25.jpg",
  "https://randomuser.me/api/portraits/women/26.jpg",
  "https://randomuser.me/api/portraits/men/27.jpg",
  "https://randomuser.me/api/portraits/women/28.jpg",
  "https://randomuser.me/api/portraits/men/29.jpg",
  "https://randomuser.me/api/portraits/women/30.jpg",
];

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

export const getRealPhotoForIdentity = (seed: string): string => {
  const hash = hashForIndex(seed);
  return REAL_PHOTO_POOL[hash % REAL_PHOTO_POOL.length]!;
};

export const getAvatarForIdentity = (seed: string): string => {
  const hash = hashForIndex(seed);
  // Keep a realistic mix app-wide.
  if (hash % 10 < 3) {
    return getRealPhotoForIdentity(seed);
  }
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed)}`;
};
