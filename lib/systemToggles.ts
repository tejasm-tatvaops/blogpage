type SystemToggles = {
  liveActivityEnabled: boolean;
  notificationsEnabled: boolean;
  personasEnabled: boolean;
  /** Controls whether the /shorts feed and Shorts nav link are visible to users. */
  shortsEnabled: boolean;
};

const globalState = globalThis as typeof globalThis & {
  __tatvaopsSystemToggles?: SystemToggles;
};

const toggles: SystemToggles =
  globalState.__tatvaopsSystemToggles ?? {
    liveActivityEnabled: true,
    notificationsEnabled: true,
    personasEnabled: true,
    shortsEnabled: true,
  };

globalState.__tatvaopsSystemToggles = toggles;

export const getSystemToggles = (): SystemToggles => ({ ...toggles });

export const setSystemToggles = (next: Partial<SystemToggles>): SystemToggles => {
  if (typeof next.liveActivityEnabled === "boolean") {
    toggles.liveActivityEnabled = next.liveActivityEnabled;
  }
  if (typeof next.notificationsEnabled === "boolean") {
    toggles.notificationsEnabled = next.notificationsEnabled;
  }
  if (typeof next.personasEnabled === "boolean") {
    toggles.personasEnabled = next.personasEnabled;
  }
  if (typeof next.shortsEnabled === "boolean") {
    toggles.shortsEnabled = next.shortsEnabled;
  }
  return getSystemToggles();
};
