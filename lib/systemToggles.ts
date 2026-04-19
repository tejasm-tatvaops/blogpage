type SystemToggles = {
  liveActivityEnabled: boolean;
  notificationsEnabled: boolean;
  personasEnabled: boolean;
  /** Controls whether the /shorts feed and Shorts nav link are visible to users. */
  shortsEnabled: boolean;
  /** Phase 2: Points/Reputation engine — disable to freeze point awards without DB changes */
  reputationEnabled: boolean;
  /** Phase 3: Cross-content signals — disable to stop cross_content_click processing */
  crossContentSignalsEnabled: boolean;
  /** Phase 4: Wiki peer review — disable to hide Suggest Edit UI and lock review queue */
  peerReviewEnabled: boolean;
  /** Phase 5: AI ingestion pipeline — disable to block new ingestion jobs */
  ingestionEnabled: boolean;
  /** Phase 6: Tutorials section — disable to hide /tutorials from nav and block API */
  tutorialsEnabled: boolean;
  /** Phase 1: Time-of-day theme — disable to always serve light theme (SSR flag; client overrides still work) */
  autoDarkThemeEnabled: boolean;
};

const globalState = globalThis as typeof globalThis & {
  __tatvaopsSystemToggles?: SystemToggles;
};

const toggles: SystemToggles =
  globalState.__tatvaopsSystemToggles ?? {
    liveActivityEnabled:       true,
    notificationsEnabled:      true,
    personasEnabled:           true,
    shortsEnabled:             true,
    reputationEnabled:         true,
    crossContentSignalsEnabled:true,
    peerReviewEnabled:         true,
    ingestionEnabled:          true,
    tutorialsEnabled:          true,
    autoDarkThemeEnabled:      true,
  };

globalState.__tatvaopsSystemToggles = toggles;

export const getSystemToggles = (): SystemToggles => ({ ...toggles });

export const setSystemToggles = (next: Partial<SystemToggles>): SystemToggles => {
  const boolKeys: Array<keyof SystemToggles> = [
    "liveActivityEnabled",
    "notificationsEnabled",
    "personasEnabled",
    "shortsEnabled",
    "reputationEnabled",
    "crossContentSignalsEnabled",
    "peerReviewEnabled",
    "ingestionEnabled",
    "tutorialsEnabled",
    "autoDarkThemeEnabled",
  ];
  for (const key of boolKeys) {
    if (typeof next[key] === "boolean") {
      (toggles[key] as boolean) = next[key] as boolean;
    }
  }
  return getSystemToggles();
};
