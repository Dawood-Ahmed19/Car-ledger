export function displayName(u: { fullName: string; hideFullName?: boolean }) {
  if (!u.hideFullName) return u.fullName;
  const parts = u.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "User";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
