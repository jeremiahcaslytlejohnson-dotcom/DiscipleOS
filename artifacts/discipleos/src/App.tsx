import { useEffect, useState } from "react";
import Home from "@/pages/Home";
import MountainRhythm from "@/pages/MountainRhythm";
import Settings, { type ReadingDefaults } from "@/pages/Settings";
import {
  loadReadingDefaults,
  normalizeReadingDefaults,
  saveReadingDefaults,
} from "@/lib/reading-settings";
import NotFound from "@/pages/not-found";
import {
  AuthProvider,
  AuthEmail,
  useAuth,
  useAccount,
} from "@/lib/auth";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import PWARegister from "./pwa-register";
import { apiFetch } from "@/lib/api-fetch";
import FeedbackWidget from "@/components/FeedbackWidget";

const fetch = apiFetch;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const FEEDBACK_OWNER_EMAIL = "jeremiah.cas.lytle.johnson@gmail.com";

function LaunchSplash() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), 1200);
    const removeTimer = window.setTimeout(() => setIsVisible(false), 1650);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`launch-splash${isExiting ? " launch-splash--exiting" : ""}`}
      role="status"
      aria-label="Loading DiscipleOS"
    >
      <img src="/splash.jpg" alt="" />
    </div>
  );
}

function EmailAuthPage() {
  return (
    <div className="discipleos-auth-shell">
      <div className="discipleos-auth-card min-w-0">
        <AuthEmail />
      </div>
    </div>
  );
}

function SettingsRoute() {
  const { isLoaded: isAuthLoaded, isSignedIn, userId } = useAuth();
  const { user } = useAccount();
  const appUserId = userId;
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState("syncing");
  const [defaults, setDefaults] = useState<ReadingDefaults>(() => loadReadingDefaults());

  useEffect(() => {
    if (!isAuthLoaded) return;
    if (!isSignedIn || !appUserId) {
      window.location.assign(`${basePath}/sign-in`);
      return;
    }

    let cancelled = false;
    const localDefaults = loadReadingDefaults(appUserId);
    setDefaults(localDefaults);
    setIsLoading(true);
    setSyncStatus("syncing");

    fetch("/api/settings")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load settings");
        const payload = await response.json();
        return normalizeReadingDefaults(payload?.settings);
      })
      .then((nextDefaults) => {
        if (cancelled) return;
        setDefaults(saveReadingDefaults(nextDefaults, appUserId));
        setSyncStatus("synced");
      })
      .catch(() => {
        if (cancelled) return;
        setSyncStatus("offline");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appUserId, isAuthLoaded, isSignedIn]);

  const identity = user
    ? {
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
        email: user.email || null,
        imageUrl: user.profileImageUrl,
      }
    : null;
  const isFeedbackOwner =
    user?.email?.trim().toLowerCase() === FEEDBACK_OWNER_EMAIL;

  async function handleSave(nextDefaults: ReadingDefaults) {
    if (!appUserId) return;
    setIsSaving(true);
    try {
      const normalized = saveReadingDefaults(nextDefaults, appUserId);
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });
      if (!response.ok) throw new Error("Could not save settings");
      const payload = await response.json();
      setDefaults(saveReadingDefaults(payload?.settings || normalized, appUserId));
      setSyncStatus("synced");
    } catch (error) {
      setSyncStatus("offline");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  if (isAuthLoaded && !isSignedIn) return null;

  return (
    <Settings
      identity={identity}
      isFeedbackOwner={isFeedbackOwner}
      syncStatus={syncStatus}
      isLoading={!isAuthLoaded || isLoading}
      isSaving={isSaving}
      {...defaults}
      onSave={handleSave}
      onSignOut={() => void signOut()}
    />
  );
}

function AppRoutes() {
  const [location] = useLocation();
  const isAuthRoute = /^\/sign-(in|up)(\/|$)/.test(location);

  return (
    <AuthProvider>
      <PWARegister />
      {!isAuthRoute ? <LaunchSplash /> : null}
      {!isAuthRoute ? <FeedbackWidget /> : null}
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/mountain-rhythm" component={MountainRhythm} />
        <Route path="/settings" component={SettingsRoute} />
        <Route path="/sign-in/*?" component={EmailAuthPage} />
        <Route path="/sign-up/*?" component={EmailAuthPage} />
        <Route component={NotFound} />
      </Switch>
    </AuthProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRoutes />
    </WouterRouter>
  );
}

export default App;
