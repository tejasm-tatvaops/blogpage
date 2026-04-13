import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
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
        <div className="min-h-screen bg-white text-slate-900">
          <Navbar />
          <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
