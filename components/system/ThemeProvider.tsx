"use client";

/**
 * ThemeProvider — applies the initial theme before first paint to avoid FOUC.
 *
 * Inject as a script that runs synchronously before React hydrates.
 * The <ThemeToggle> component in the Navbar uses useTheme() for interactive control.
 */

import Script from "next/script";

/** Inline script that reads localStorage and applies data-theme immediately */
const ANTI_FOUC_SCRIPT = `
(function () {
  try {
    var DAYTIME_START = 6;
    var DAYTIME_END   = 19;
    var stored = localStorage.getItem("tatvaops_theme");
    var theme;
    if (stored === "light" || stored === "dark") {
      theme = stored;
    } else {
      var hour = new Date().getHours();
      theme = (hour >= DAYTIME_START && hour < DAYTIME_END) ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export function ThemeProvider() {
  return (
    <Script
      id="tatvaops-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }}
    />
  );
}
