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
  { name: "Neha (Project Planner)", role: "project planner", tone: "friendly", style: "detailed" },
  { name: "Siddharth (PMC Consultant)", role: "pmc consultant", tone: "expert", style: "detailed" },
  { name: "Aisha (Structural Engineer)", role: "structural engineer", tone: "expert", style: "questioning" },
  { name: "Rohan (Contractor)", role: "general contractor", tone: "friendly", style: "short" },
  { name: "Pallavi (Procurement Analyst)", role: "procurement analyst", tone: "expert", style: "short" },
  { name: "Imran (Site QA)", role: "site quality engineer", tone: "expert", style: "questioning" },
  { name: "Vivek (BOQ Lead)", role: "boq specialist", tone: "expert", style: "detailed" },
  { name: "Harsha (Young Architect)", role: "architect", tone: "beginner", style: "questioning" },
  { name: "Nithin (Vendor Manager)", role: "vendor manager", tone: "friendly", style: "short" },
  { name: "Shreya (Estimator)", role: "cost estimator", tone: "expert", style: "detailed" },
  { name: "Anil (Infra PM)", role: "infrastructure project manager", tone: "expert", style: "short" },
  { name: "Madhavi (Site Coordinator)", role: "site coordinator", tone: "friendly", style: "questioning" },
  { name: "Tarun (Execution Engineer)", role: "execution engineer", tone: "expert", style: "short" },
  { name: "Farah (Design Coordinator)", role: "design coordinator", tone: "friendly", style: "detailed" },
  { name: "Pranav (Procurement Ops)", role: "procurement operations lead", tone: "sarcastic", style: "questioning" },
];

export const pickPersona = (): Persona => PERSONAS[Math.floor(Math.random() * PERSONAS.length)] ?? PERSONAS[0]!;

export const buildPersonaInstruction = (persona: Persona): string =>
  `Write as ${persona.name}, a ${persona.role}, with a ${persona.tone} tone and ${persona.style} style.`;

export const maybeApplyTypos = (content: string): string => {
  // Keep typo rate low so content still feels credible.
  if (Math.random() > 0.05) return content;
  return content
    .replace(/\bthe\b/i, "teh")
    .replace(/\band\b/i, "an")
    .replace(/\bwith\b/i, "wth");
};

export const isPersonaEnabled = (): boolean => getSystemToggles().personasEnabled;
