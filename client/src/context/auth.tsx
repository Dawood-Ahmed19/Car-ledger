import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  ApiError,
  setAuthToken,
  setUnauthorizedHandler,
} from "../lib/api";
import { deleteToken, getToken, saveToken } from "../lib/token-store";

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: "buyer" | "seller" | "admin";
}
type Status = "loading" | "signedOut" | "signedIn";
interface AuthResponse {
  token: string;
  user: User;
}
export interface SignUpInput {
  fullName: string;
  email: string;
  phone: string;
  role: "buyer" | "seller";
  password: string;
}

interface AuthValue {
  status: Status;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  // On launch: use the saved token, if any, and ask the server who it belongs to.
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return setStatus("signedOut");
      setAuthToken(token);
      try {
        const res = await api<{ user: User }>("/api/me");
        setUser(res.user);
        setStatus("signedIn");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await deleteToken(); // the server no longer accepts it
          setAuthToken(null);
        }
        setStatus("signedOut");
      }
    })();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      deleteToken();
      setAuthToken(null);
      setUser(null);
      setStatus("signedOut");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const finish = useCallback(async (res: AuthResponse) => {
    await saveToken(res.token);
    setAuthToken(res.token);
    setUser(res.user);
    setStatus("signedIn");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      signIn: async (email, password) =>
        finish(
          await api<AuthResponse>("/api/auth/login", {
            method: "POST",
            body: { email, password },
          }),
        ),
      signUp: async (input) =>
        finish(
          await api<AuthResponse>("/api/auth/signup", {
            method: "POST",
            body: input,
          }),
        ),
      signOut: async () => {
        try {
          await api("/api/auth/logout", { method: "POST" });
        } catch {}
        await deleteToken();
        setAuthToken(null);
        setUser(null);
        setStatus("signedOut");
      },
    }),
    [status, user, finish],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
