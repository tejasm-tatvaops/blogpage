export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
export const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUsername(username: string): boolean {
  return USERNAME_REGEX.test(String(username ?? "").trim());
}
