import { AppHeader } from "./app-header";
import { useAuth } from "../../context/auth";
import { useRouter } from "expo-router";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

export function MainHeader() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <AppHeader
      variant="brand"
      initials={initialsOf(user?.fullName ?? "")}
      onPressProfile={() => router.push("/profile")}
      onLogout={signOut}
    />
  );
}
