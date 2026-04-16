type SystemToggles = {
  liveActivityEnabled: boolean;
  notificationsEnabled: boolean;
  personasEnabled: boolean;
};

const globalState = globalThis as typeof globalThis & {
  __tatvaopsSystemToggles?: SystemToggles;
};

const toggles: SystemToggles =
  globalState.__tatvaopsSystemToggles ?? {
    liveActivityEnabled: false,
    notificationsEnabled: true,
    personasEnabled: true,
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
  return getSystemToggles();
};
