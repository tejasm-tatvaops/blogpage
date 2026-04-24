export function maskEmail(email?: string | null): string | null {
  const safe = String(email ?? "").trim();
  if (!safe || !safe.includes("@")) return null;
  const [name, domain] = safe.split("@");
  if (!name || !domain) return null;
  return `${name[0] ?? "*"}***@${domain}`;
}

export function maskPhone(phone?: string | null): string | null {
  const safe = String(phone ?? "").trim();
  if (!safe) return null;
  const digits = safe.replace(/\D+/g, "");
  if (digits.length < 4) return null;
  return `****${digits.slice(-4)}`;
}
