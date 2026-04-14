"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isBeforeInstallPromptEvent(value: Event): value is BeforeInstallPromptEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "prompt" in value &&
    typeof (value as BeforeInstallPromptEvent).prompt === "function" &&
    "userChoice" in value
  );
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsSupported(true);

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // @ts-ignore - iOS Safari
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) return;
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch (error) {
      console.error("Install prompt failed:", error);
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (!isSupported) return null;

  if (isInstalled) {
    return (
      <button
        type="button"
        disabled
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50"
      >
        Installed
      </button>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F8FAFC] hover:bg-white/10"
    >
      Install App
    </button>
  );
}
