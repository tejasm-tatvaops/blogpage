import { humanizeHubSlug } from "@/lib/hubs/humanizeSlug";

export function HubHeader({ hubSlug }: { hubSlug: string }) {
  const display = humanizeHubSlug(hubSlug);
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-bold text-app">#{display} Knowledge Hub</h1>
      <p className="mt-2 text-sm text-muted">
        Unified discovery across community forums and blog articles for this topic.
      </p>
    </header>
  );
}
