export function getLevelMeta(level: string) {
  switch (level) {
    case "Bronze":
      return { label: "Bronze", color: "bg-amber-700 text-white", icon: "🟤" };
    case "Silver":
      return { label: "Silver", color: "bg-gray-300 text-black", icon: "⚪" };
    case "Gold":
      return { label: "Gold", color: "bg-yellow-400 text-black", icon: "🟡" };
    case "Platinum":
      return { label: "Platinum", color: "bg-purple-500 text-white", icon: "💎" };
    default:
      return { label: "Member", color: "bg-gray-200 text-gray-700", icon: "" };
  }
}

export function getLevelFromReputationScore(score: number): string {
  if (score >= 2000) return "Platinum";
  if (score >= 500) return "Gold";
  if (score >= 100) return "Silver";
  return "Bronze";
}
