import { buildFeed } from "@/lib/feedService";

export async function getPersonalizedFeed(input: Parameters<typeof buildFeed>[0]) {
  return buildFeed(input);
}

