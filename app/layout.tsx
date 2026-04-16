import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Navbar } from "@/components/layout/Navbar";
import { UnhandledRejectionGuard } from "@/components/system/UnhandledRejectionGuard";
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
  return (
    <html lang="en">
      <body>
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
              })();
            `,
          }}
        />
        <UnhandledRejectionGuard />
        <div className="min-h-screen bg-white text-slate-900">
          <Navbar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
