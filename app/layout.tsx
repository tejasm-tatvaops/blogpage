import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Navbar } from "@/components/layout/Navbar";
import { FloatingSidebar } from "@/components/layout/FloatingSidebar";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { AskAiFab } from "@/components/layout/AskAiFab";
import { UnhandledRejectionGuard } from "@/components/system/UnhandledRejectionGuard";
import { ThemeProvider } from "@/components/system/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ensureActivityRunnerStarted } from "@/lib/activityRunner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "TatvaOps Blog",
    template: "%s | TatvaOps",
  },
  description: "TatvaOps blog and internal CMS for construction estimation insights.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  if (process.env.DEV_DISABLE_AUTOMATION !== "true") {
    ensureActivityRunnerStarted();
  }
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider />
        <Script
          id="unhandled-rejection-event-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function isEventLike(reason) {
                  if (!reason) return false;
                  if (String(reason) === "[object Event]") return true;
                  if (typeof Event !== "undefined" && reason instanceof Event) return true;
                  if (typeof reason === "object") {
                    return ("isTrusted" in reason) || (("type" in reason) && ("target" in reason));
                  }
                  return false;
                }
                window.addEventListener("unhandledrejection", function (event) {
                  if (isEventLike(event.reason)) {
                    event.preventDefault();
                  }
                });
                window.addEventListener("error", function (event) {
                  if (
                    String(event && event.error) === "[object Event]" ||
                    String(event && event.message) === "[object Event]"
                  ) {
                    event.preventDefault();
                  }
                });
                window.addEventListener(
                  "error",
                  function (event) {
                    const target = event && event.target;
                    const isResourceTarget =
                      (typeof HTMLImageElement !== "undefined" && target instanceof HTMLImageElement) ||
                      (typeof HTMLVideoElement !== "undefined" && target instanceof HTMLVideoElement) ||
                      (typeof HTMLScriptElement !== "undefined" && target instanceof HTMLScriptElement) ||
                      (typeof HTMLLinkElement !== "undefined" && target instanceof HTMLLinkElement) ||
                      (typeof HTMLSourceElement !== "undefined" && target instanceof HTMLSourceElement);
                    if (String(event) === "[object Event]" && isResourceTarget) {
                      event.preventDefault();
                      if (typeof event.stopImmediatePropagation === "function") {
                        event.stopImmediatePropagation();
                      }
                    }
                  },
                  true
                );
                window.onerror = function (message, source, lineno, colno, error) {
                  if (
                    String(message) === "[object Event]" ||
                    String(error) === "[object Event]"
                  ) {
                    return true;
                  }
                  return false;
                };
              })();
            `,
          }}
        />
        <UnhandledRejectionGuard />
        <AuthProvider>
          <div className="min-h-screen overflow-x-hidden bg-app text-app">
            <FloatingSidebar />
            <LayoutShell>
              <Navbar />
              <main>{children}</main>
            </LayoutShell>
            <AskAiFab />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
