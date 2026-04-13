export const CITY_LOCALITIES: Record<string, string[]> = {
  Bangalore: ["Whitefield", "Electronic City", "Sarjapur Road", "Hebbal"],
  Hyderabad: ["Gachibowli", "Kondapur", "Miyapur", "Kukatpally"],
  Chennai: ["OMR", "Velachery", "Tambaram", "Porur"],
  Pune: ["Hinjewadi", "Wakad", "Baner", "Kharadi"],
  Mumbai: ["Navi Mumbai", "Thane", "Andheri", "Borivali"],
};

export const KEYWORD_TEMPLATES = [
  "Cost to build a house in {location}",
  "Construction cost per sq ft in {location}",
  "House construction cost in {location} 2026",
  "Residential construction estimate in {location}",
  "BOQ and construction pricing guide for {location}",
];

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const getAllSeedLocations = (): string[] => {
  const expanded: string[] = [];
  for (const [city, localities] of Object.entries(CITY_LOCALITIES)) {
    expanded.push(city);
    for (const locality of localities) {
      expanded.push(`${locality}, ${city}`);
    }
  }
  return expanded;
};

export const buildKeywordForLocation = (location: string, index = 0): string => {
  const template = KEYWORD_TEMPLATES[index % KEYWORD_TEMPLATES.length];
  return template.replace("{location}", location);
};

export const buildGenerationPromptKeyword = (location: string, index = 0): string => {
  const primary = buildKeywordForLocation(location, index);
  return `${primary}. Include local labor rate trends, material availability, permit or regulation considerations, and practical FAQs for ${location}.`;
};

export const locationSlugHint = (location: string): string => slugify(location);

export const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const appendInternalLinks = (
  markdown: string,
  currentLocation: string,
  existingSlugs: string[],
): string => {
  const cityHint = locationSlugHint(currentLocation);
  const related = existingSlugs
    .filter((slug) => slug.includes("construction") || slug.includes("cost") || slug.includes(cityHint))
    .slice(0, 4);

  const links = related.map((slug) => `- [Read related guide](/blog/${slug})`).join("\n");
  const section = [
    "",
    "## Related construction cost guides",
    links || "- [Explore all cost guides](/blog)",
    "- [Get your construction estimate](/estimate)",
    "",
  ].join("\n");

  return `${markdown.trim()}\n${section}`;
};
