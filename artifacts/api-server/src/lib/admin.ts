const UNLIMITED_EMAILS = new Set([
  "frank@tray-iq.com",
]);

export function isUnlimitedUser(email?: string | null): boolean {
  if (!email) return false;
  return UNLIMITED_EMAILS.has(email.toLowerCase().trim());
}
