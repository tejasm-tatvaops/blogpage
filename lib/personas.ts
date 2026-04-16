import { getSystemToggles } from "@/lib/systemToggles";

export type Persona = {
  name: string;
  role: string;
  tone: "friendly" | "expert" | "sarcastic" | "beginner";
  style: "short" | "detailed" | "questioning";
};

const PERSONAS: Persona[] = [
  { name: "Arjun (Civil Engineer)", role: "civil engineer", tone: "expert", style: "detailed" },
  { name: "Meera (Site Supervisor)", role: "site supervisor", tone: "friendly", style: "short" },
  { name: "Ravi (Estimator)", role: "quantity estimator", tone: "expert", style: "questioning" },
  { name: "Kiran (New Builder)", role: "beginner contractor", tone: "beginner", style: "questioning" },
  { name: "Dev (Procurement Lead)", role: "procurement lead", tone: "sarcastic", style: "short" },
];

export const pickPersona = (): Persona => PERSONAS[Math.floor(Math.random() * PERSONAS.length)] ?? PERSONAS[0]!;

export const buildPersonaInstruction = (persona: Persona): string =>
  `Write as ${persona.name}, a ${persona.role}, with a ${persona.tone} tone and ${persona.style} style.`;

export const maybeApplyTypos = (content: string): string => {
  if (Math.random() > 0.12) return content;
  return content
    .replace(/\bthe\b/i, "teh")
    .replace(/\band\b/i, "nd")
    .replace(/\bwith\b/i, "wth");
};

export const isPersonaEnabled = (): boolean => getSystemToggles().personasEnabled;
