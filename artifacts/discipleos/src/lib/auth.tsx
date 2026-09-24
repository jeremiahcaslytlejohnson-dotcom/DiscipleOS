import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { EmailCodeAuth } from "./email-code-auth";

export type AuthUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

type AuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  user: AuthUser | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
export const AUTH_CHANGE_EVENT = "discipleos-auth-changed";
const AUTH_CHANGE_KEY = "discipleos-auth-changed";
const AUTH_CHANNEL_NAME = "discipleos-auth";
export type AuthChangeType = "signed-in" | "signed-out";

type AuthChangeMessage = {
  type: AuthChangeType;
  at: number;
};

function parseAuthChange(value: unknown): AuthChangeMessage | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed?.type !== "signed-in" && parsed?.type !== "signed-out") return null;
    return {
      type: parsed.type,
      at: typeof parsed.at === "number" ? parsed.at : Date.now(),
    };
  } catch {
    return null;
  }
}

export function notifyAuthChange(type: AuthChangeType) {
  const message: AuthChangeMessage = { type, at: Date.now() };
  try {
    localStorage.setItem(AUTH_CHANGE_KEY, JSON.stringify(message));
  } catch {
    // The server session remains authoritative when storage is unavailable.
  }
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.postMessage(message);
      channel.close();
    }
  } catch {
    // The storage event below remains the cross-tab fallback.
  }
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: message }));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const payload = await response.json();
      setUser(payload.authenticated && payload.user ? payload.user : null);
    } catch {
      // Keep local-first browsing available when the API is offline.
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const handleAuthChange = (event: Event | MessageEvent) => {
      const message =
        event instanceof StorageEvent
          ? parseAuthChange(event.newValue)
          : event instanceof MessageEvent
            ? parseAuthChange(event.data)
            : parseAuthChange((event as CustomEvent<AuthChangeMessage>).detail);

      // A successful logout is authoritative in the originating tab. Clear
      // this tab's identity before the network refresh completes so account
      // controls and account-bound consumers stop using the old identity.
      if (message?.type === "signed-out") {
        setUser(null);
      }
      void refresh();
    };
    const handleFocus = () => void refresh();
    let channel: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      }
    } catch {
      // Storage events remain available when BroadcastChannel is unavailable.
    }

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.addEventListener("focus", handleFocus);
    channel?.addEventListener("message", handleAuthChange);
    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener("focus", handleFocus);
      channel?.removeEventListener("message", handleAuthChange);
      channel?.close();
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      await refresh();
      throw new Error("Could not sign out.");
    }
    setUser(null);
    notifyAuthChange("signed-out");
    window.location.assign(import.meta.env.BASE_URL || "/");
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoaded,
      isSignedIn: Boolean(user),
      userId: user?.id ?? null,
      user,
      signOut,
      refresh,
    }),
    [isLoaded, refresh, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Auth hooks must be used inside AuthProvider");
  return context;
}

export function useAuth() {
  const { isLoaded, isSignedIn, userId, signOut, refresh } = useAuthContext();
  return { isLoaded, isSignedIn, userId, signOut, refresh };
}

export function useAccount() {
  return { user: useAuthContext().user };
}

export function AuthEmail() {
  return <EmailCodeAuth />;
}
