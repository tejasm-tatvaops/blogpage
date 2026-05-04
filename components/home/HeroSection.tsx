import Link from "next/link";

export function HeroSection() {
  return (
    <div
      className="relative flex min-h-[580px] items-center overflow-hidden rounded-[22px] border border-black/5 dark:border-white/10 sm:rounded-[28px]"
      style={{
        backgroundImage: "url('/images/construction/site-team-3.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#040818]/92 via-[#09122a]/72 to-[#0b142e]/32" />
      <div className="absolute inset-0 bg-[radial-gradient(95%_100%_at_88%_18%,rgba(255,255,255,0.08),transparent_60%)]" />

      {/* Content */}
      <div className="relative z-10 max-w-[860px] px-16 py-12">
        {/* Badge */}
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300 sm:mb-4 sm:text-[11px]">
          <span className="text-orange-400" aria-hidden>•</span>
          TATVAOPS PLATFORM
        </p>

        {/* Heading */}
        <h1 className="font-serif break-words text-[clamp(2.2rem,4.5vw,3.2rem)] leading-[1.1] font-bold text-white sm:text-[52px] lg:text-[58px]">
          AI-Powered Construction Content,{" "}
          <span className="italic text-[#f97316]">Community,</span>{" "}
          and Decision Support
        </h1>

        {/* Subtitle */}
        <p className="mt-5 max-w-[560px] text-[0.8rem] leading-relaxed text-orange-100/80">
          TatvaOps combines a smart blog engine, practical city-wise cost guides, and a live
          forums community so builders, estimators, and teams can plan, discuss, and execute
          with confidence.
        </p>

        {/* CTA buttons */}
        <div className="mt-6 flex flex-wrap gap-2.5 sm:gap-3">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-white shadow-[0_4px_16px_rgba(249,115,22,0.35)] transition-all duration-200 hover:bg-orange-400 hover:shadow-[0_6px_20px_rgba(249,115,22,0.45)] sm:px-6"
          >
            Explore Blogs
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/forums"
            className="inline-flex items-center rounded-xl border border-white/25 bg-white/8 px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/14 hover:border-white/40 sm:px-6"
          >
            Join Forums
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-8 grid grid-cols-1 gap-[14px] sm:grid-cols-3">
          {[
            {
              title: "Blogs",
              body: "AI-generated, SEO-structured, editable content.",
              href: "/blog",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                </svg>
              ),
              iconBg: "bg-[#ea580c]/20 text-orange-400",
            },
            {
              title: "Forums",
              body: "Q&A, opinions, voting, and practical discussion.",
              href: "/forums",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
                </svg>
              ),
              iconBg: "bg-emerald-500/20 text-emerald-400",
            },
            {
              title: "Shorts",
              body: "CMS, moderation, autopopulate, and analytics.",
              href: "/shorts",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              ),
              iconBg: "bg-white/10 text-white/60",
            },
          ].map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="flex items-start gap-3 rounded-[18px] border border-white/12 bg-white/6 p-[16px] backdrop-blur-md transition-colors duration-200 hover:bg-white/10 hover:border-white/20"
            >
              <span
                className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${card.iconBg}`}
              >
                {card.icon}
              </span>
              <div>
                <p className="text-[0.8rem] font-semibold text-white">{card.title}</p>
                <p className="mt-0.5 text-[0.72rem] leading-relaxed text-white/60">{card.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
