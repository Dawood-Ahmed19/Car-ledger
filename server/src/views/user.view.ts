export function displayName(user: {
  fullName: string;
  hideFullName?: boolean;
}) {
  if (!user.hideFullName) return user.fullName;
  const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "User";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function publicUser(user: {
  id: string;
  fullName: string;
  hideFullName: boolean;
}) {
  return { id: user.id, name: displayName(user) };
}

export function accountUser(user: {
  id: string;
  username: string;
  fullName: string;
  role: string;
}) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  };
}
