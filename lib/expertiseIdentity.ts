export const PROFESSIONS = [
  "Site Engineer",
  "Quantity Surveyor",
  "Contractor",
  "Architect",
  "Procurement Manager",
  "Structural Consultant",
  "Project Manager",
  "Civil Engineer",
] as const;

export const EXPERTISE_AREAS = [
  "Cost Estimation",
  "Procurement",
  "Structural Design",
  "BOQ Planning",
  "Vendor Management",
  "Site Execution",
  "RCC Work",
  "MEP Coordination",
] as const;

export const EXPERIENCE_LEVELS = ["0-2", "3-5", "5-10", "10+"] as const;
export const COMPANY_TYPES = [
  "Independent",
  "Contractor Firm",
  "Consultancy",
  "Developer",
  "Vendor/Supplier",
] as const;
export const VERIFICATION_PREFERENCES = [
  "none",
  "linkedin_later",
  "company_email_later",
  "manual_review_later",
] as const;
export const EXPERTISE_BADGE_OPTIONS = [
  "Site Expert",
  "Cost Analyst",
  "Procurement Pro",
  "Structural Contributor",
  "Verified Contractor",
  "Senior QS",
  "MEP Specialist",
  "Construction Contributor",
  "Project Delivery Lead",
  "Civil Works Contributor",
  "Design Contributor",
  "BOQ Strategist",
  "BOQ Contributor",
] as const;

export type Profession = (typeof PROFESSIONS)[number];
export type ExpertiseArea = (typeof EXPERTISE_AREAS)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type CompanyType = (typeof COMPANY_TYPES)[number];
export type VerificationPreference = (typeof VERIFICATION_PREFERENCES)[number];

type BadgeInput = {
  profession?: string | null;
  expertise?: string | null;
  yearsOfExperience?: string | null;
  publicExpertiseEnabled?: boolean | null;
  reputationScore?: number | null;
  helpfulSignals?: number | null;
  adminOverrideBadge?: string | null;
};

const normalize = (value: unknown): string =>
  String(value ?? "").trim();

export const hasProfessionalIdentity = (input: {
  profession?: string | null;
  expertise?: string | null;
}): boolean => normalize(input.profession) !== "" && normalize(input.expertise) !== "";

export const deriveExpertiseBadge = (input: BadgeInput): string | null => {
  if (!input.publicExpertiseEnabled) return null;
  const override = normalize(input.adminOverrideBadge);
  if (override) return override.slice(0, 60);

  const profession = normalize(input.profession);
  const expertise = normalize(input.expertise);
  if (!profession || !expertise) return null;

  const rep = Number(input.reputationScore ?? 0);
  const helpful = Number(input.helpfulSignals ?? 0);
  const years = normalize(input.yearsOfExperience);
  const senior = years === "10+" || years === "5-10";

  if (profession === "Quantity Surveyor") {
    if (rep >= 500 || helpful >= 40) return "Senior QS";
    return "Cost Analyst";
  }
  if (profession === "Contractor") {
    if (rep >= 300 || helpful >= 30) return "Verified Contractor";
    return "Construction Contributor";
  }
  if (profession === "Procurement Manager" || expertise === "Procurement") return "Procurement Pro";
  if (expertise === "Structural Design" || profession === "Structural Consultant") return "Structural Contributor";
  if (expertise === "MEP Coordination") return "MEP Specialist";
  if (expertise === "BOQ Planning") return senior ? "BOQ Strategist" : "BOQ Contributor";
  if (profession === "Site Engineer" || expertise === "Site Execution") return "Site Expert";
  if (profession === "Project Manager") return "Project Delivery Lead";
  if (profession === "Civil Engineer") return "Civil Works Contributor";
  if (profession === "Architect") return "Design Contributor";
  return `${expertise} Contributor`.slice(0, 60);
};
