export default function ProductDiscussionHubLoading() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-10">
      <div className="mb-6 space-y-3">
        <div className="h-9 w-4/5 max-w-lg animate-pulse rounded-lg bg-black/[0.08] dark:bg-white/[0.1]" />
        <div className="h-4 w-3/5 max-w-md animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.08]" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="h-80 max-w-sm animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.08] lg:max-w-none" />
        <div className="h-80 animate-pulse rounded-[18px] bg-black/[0.06] dark:bg-white/[0.08]" />
      </div>
      <div className="mt-10 h-48 animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.08]" />
    </section>
  );
}
