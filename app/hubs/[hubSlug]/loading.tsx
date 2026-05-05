export default function HubLoading() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-10">
      <div className="mb-6 space-y-3">
        <div className="h-9 w-2/3 max-w-md animate-pulse rounded-lg bg-black/[0.08] dark:bg-white/[0.1]" />
        <div className="h-4 w-1/2 max-w-sm animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.08]" />
      </div>
      <div className="mb-8 h-48 animate-pulse rounded-[18px] bg-black/[0.06] dark:bg-white/[0.08]" />
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.08]" />
        ))}
      </div>
    </section>
  );
}
