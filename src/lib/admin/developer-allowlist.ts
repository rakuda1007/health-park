/**
 * サーバー専用。`DEVELOPER_ADMIN_EMAILS` はカンマ区切り（大文字小文字は区別しない）。
 */
export function parseDeveloperAdminEmails(): string[] {
  const raw = process.env.DEVELOPER_ADMIN_EMAILS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isDeveloperAdminEmail(email: string | undefined | null): boolean {
  if (!email) {
    return false;
  }
  const list = parseDeveloperAdminEmails();
  if (list.length === 0) {
    return false;
  }
  return list.includes(email.trim().toLowerCase());
}
