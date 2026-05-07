export type ProjectHealth = "stable" | "watch" | "risk";
export type TimelineEntryType =
  | "Progress Update"
  | "Procurement Decision"
  | "Cost Change"
  | "Issue Report"
  | "Site Milestone"
  | "Labor Update"
  | "Vendor Note"
  | "AI Insight"
  | "Media Log";

export type ProjectTimelineEntry = {
  id: string;
  weekLabel: string;
  type: TimelineEntryType;
  title: string;
  note: string;
  contributorName?: string;
  contributorBadge?: string;
  createdAtLabel?: string;
  tags: string[];
  media: Array<{ type: "image" | "video"; url: string; caption: string }>;
  aiSummary?: string;
  linkedDiscussion?: { title: string; href: string };
  commentsCount: number;
};

export type SiteJournalProject = {
  id: string;
  slug: string;
  title: string;
  city: string;
  region: string;
  marketType: string;
  projectType: string;
  budgetRange: string;
  timeline: { started: string; week: number; progressPercent: number; stage: string };
  leadContributor: { name: string; identityKey: string; badge: string };
  contributors: Array<{ name: string; badge: string }>;
  health: ProjectHealth;
  aiRiskPulse: string;
  aiSummary: string;
  procurementSignal: string;
  executionStatus: string;
  weatherRisk: string;
  activeDiscussionCount: number;
  updatePreview: string;
  mediaCover: string;
  tags: string[];
  relatedExperts: string[];
  similarProjects: string[];
  recommendations: string[];
  timelineEntries: ProjectTimelineEntry[];
};

export const SITE_JOURNALS: SiteJournalProject[] = [
  {
    id: "project-1",
    slug: "g-plus-2-residential-miyapur",
    title: "G+2 Residential Build - Miyapur",
    city: "Hyderabad",
    region: "Telangana",
    marketType: "Residential",
    projectType: "Residential Construction",
    budgetRange: "INR 1.2Cr - INR 1.5Cr",
    timeline: { started: "Jan 2026", week: 14, progressPercent: 58, stage: "Structure + Procurement" },
    leadContributor: { name: "Tejasdagr8", identityKey: "google:69e9f4b0edb7e6fc5d18d099", badge: "Cost Analyst" },
    contributors: [
      { name: "Ravi K", badge: "Procurement Pro" },
      { name: "Naveen S", badge: "Structural Contributor" },
    ],
    health: "watch",
    aiRiskPulse: "Procurement risk increasing due to steel volatility.",
    aiSummary: "Execution is moving steadily with moderate supplier risk and manageable schedule pressure.",
    procurementSignal: "Steel pricing volatility + transport variability",
    executionStatus: "On-track with watchlist procurement actions",
    weatherRisk: "Low weather disruption risk this week",
    activeDiscussionCount: 18,
    updatePreview: "Switched local supplier due to transport delays and negotiated split delivery.",
    mediaCover: "/images/construction/steel-frame-1.png",
    tags: ["boq", "procurement", "rcc", "hyderabad"],
    relatedExperts: ["Cost Estimation Specialists", "Vendor Negotiation Mentors", "RCC Supervisors"],
    similarProjects: ["Bangalore Villa Build", "Pune Mid-rise Residential"],
    recommendations: [
      "Lock 30-day steel pricing for upcoming slab cycle.",
      "Diversify vendor dependency before week 18.",
      "Pre-stage cement inventory for monsoon buffer.",
    ],
    timelineEntries: [
      {
        id: "p1-e1",
        weekLabel: "Week 14",
        type: "Procurement Decision",
        title: "Steel supplier changed after repeated dispatch delays",
        note: "Primary vendor could not guarantee rolling dispatch slots. Team switched to a regional supplier with staged delivery.",
        tags: ["steel", "vendor", "timeline"],
        media: [{ type: "image", url: "/images/construction/steel-frame-1.png", caption: "Rebar stock validation at site gate" }],
        aiSummary: "Supplier concentration risk reduced, but unit rate increased by ~3.2%.",
        linkedDiscussion: { title: "Should contractors lock pricing early?", href: "/forums/blocks" },
        commentsCount: 12,
      },
      {
        id: "p1-e2",
        weekLabel: "Week 13",
        type: "Cost Change",
        title: "Material cost moved up by 8%",
        note: "Combined impact from steel and logistics update increased projected package spend.",
        tags: ["cost", "budget", "forecast"],
        media: [],
        aiSummary: "Budget variance remains recoverable if procurement windows are tightened in next two cycles.",
        commentsCount: 8,
      },
    ],
  },
  {
    id: "project-2",
    slug: "villa-execution-sarjapur-phase-2",
    title: "Villa Execution Cluster - Sarjapur Phase 2",
    city: "Bangalore",
    region: "Karnataka",
    marketType: "Residential",
    projectType: "Villa Construction",
    budgetRange: "INR 4.8Cr - INR 5.6Cr",
    timeline: { started: "Dec 2025", week: 22, progressPercent: 71, stage: "Finishing + MEP" },
    leadContributor: { name: "Arjun BuildOps", identityKey: "fp:arjun-buildops", badge: "Execution Lead" },
    contributors: [{ name: "Priya M", badge: "MEP Contributor" }],
    health: "stable",
    aiRiskPulse: "Execution stable; monitor labor distribution over weekends.",
    aiSummary: "Finishing quality is strong, with minor labor imbalance risk during parallel handover prep.",
    procurementSignal: "MEP item lead times normalized",
    executionStatus: "Stable progress toward scheduled handover",
    weatherRisk: "Moderate rain watch over next 5 days",
    activeDiscussionCount: 11,
    updatePreview: "Re-sequenced MEP and painting teams to reduce rework overlap.",
    mediaCover: "/images/construction/site-team-2.png",
    tags: ["villa", "finishing", "mep", "bangalore"],
    relatedExperts: ["MEP Coordinators", "Finishing Supervisors"],
    similarProjects: ["Miyapur G+2 Residential", "Pune Mid-rise Residential"],
    recommendations: ["Maintain quality audit cadence every 3 days.", "Keep backup labor pool for weekend catch-up."],
    timelineEntries: [
      {
        id: "p2-e1",
        weekLabel: "Week 22",
        type: "Site Milestone",
        title: "Block A finishing reached 85%",
        note: "Tile and ceiling close-out completed for upper floors with snag list under control.",
        tags: ["milestone", "quality"],
        media: [{ type: "image", url: "/images/construction/site-team-2.png", caption: "Finishing progress checkpoint" }],
        commentsCount: 6,
      },
    ],
  },
  {
    id: "project-3",
    slug: "mid-rise-kharadi-package-b",
    title: "Mid-rise Package B - Kharadi",
    city: "Pune",
    region: "Maharashtra",
    marketType: "Mid-rise Residential",
    projectType: "Residential Mid-rise",
    budgetRange: "INR 8.2Cr - INR 9.1Cr",
    timeline: { started: "Feb 2026", week: 9, progressPercent: 36, stage: "Foundation + Frame" },
    leadContributor: { name: "Neha QS", identityKey: "fp:neha-qs", badge: "Procurement Pro" },
    contributors: [{ name: "Sohan V", badge: "Structural Contributor" }],
    health: "risk",
    aiRiskPulse: "Delay risk rising from labor shortage and rebar queueing.",
    aiSummary: "Project faces moderate delay pressure unless labor and rebar sequencing are stabilized quickly.",
    procurementSignal: "Rebar queue congestion across two vendors",
    executionStatus: "Schedule under pressure",
    weatherRisk: "Low weather risk; labor is primary constraint",
    activeDiscussionCount: 9,
    updatePreview: "Night shift trial started to recover slab cycle slippage.",
    mediaCover: "/images/construction/steel-frame-1.png",
    tags: ["pune", "labor", "rebar", "schedule"],
    relatedExperts: ["Labor Planning Specialists", "Structural PMs"],
    similarProjects: ["Sarjapur Villa Cluster", "Miyapur G+2 Residential"],
    recommendations: [
      "Introduce secondary reinforcement yard fallback.",
      "Lock labor subcontractor retention incentives for next 3 weeks.",
    ],
    timelineEntries: [
      {
        id: "p3-e1",
        weekLabel: "Week 9",
        type: "Issue Report",
        title: "Labor attendance dropped below planned threshold",
        note: "Frame and shuttering crews fell below expected strength, impacting cycle continuity.",
        tags: ["labor", "delay"],
        media: [],
        aiSummary: "AI predicts up to 2-week delay if attendance remains below 82% for 10 days.",
        commentsCount: 10,
      },
    ],
  },
];
