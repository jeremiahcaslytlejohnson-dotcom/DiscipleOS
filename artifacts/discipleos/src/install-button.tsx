"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, CheckCircle2 } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
const deferredPromptSubscribers = new Set<
  (prompt: BeforeInstallPromptEvent | null) => void
>();

function updateSharedDeferredPrompt(prompt: BeforeInstallPromptEvent | null) {
  sharedDeferredPrompt = prompt;
  deferredPromptSubscribers.forEach((subscriber) => subscriber(prompt));
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent.toLowerCase();
  const isIPhone = /iphone/.test(ua);
  const isIPad = /ipad/.test(ua);
  const isIPod = /ipod/.test(ua);
  const isModernIPad =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return isIPhone || isIPad || isIPod || isModernIPad;
}

function isAndroidDevice() {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const mediaStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;

  const iosStandalone =
    isIosDevice() &&
      typeof (window.navigator as Navigator & { standalone?: boolean }).standalone === "boolean"
      ? Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
      : false;

  return mediaStandalone || iosStandalone;
}

export default function InstallButton({
  compact = false,
  testId = "install-app-button",
}: { compact?: boolean; testId?: string }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const syncDeferredPrompt = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
    };
    deferredPromptSubscribers.add(syncDeferredPrompt);
    syncDeferredPrompt(sharedDeferredPrompt);

    const syncInstalledState = () => {
      const installed = isStandaloneMode();
      setIsInstalled(installed);

      if (installed) {
        updateSharedDeferredPrompt(null);
        setIsInstalling(false);
      }
    };

    setIsIos(isIosDevice());
    syncInstalledState();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      updateSharedDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      updateSharedDeferredPrompt(null);
      setIsInstalling(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncInstalledState();
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("focus", syncInstalledState);
    window.addEventListener("pageshow", syncInstalledState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      deferredPromptSubscribers.delete(syncDeferredPrompt);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("focus", syncInstalledState);
      window.removeEventListener("pageshow", syncInstalledState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const label = useMemo(() => {
    if (isInstalled) return "Installed";
    if (isInstalling) return "Installing...";
    return "Install App";
  }, [isInstalled, isInstalling]);

  const handleInstall = async () => {
    if (isInstalled || isInstalling) return;

    const prompt = sharedDeferredPrompt;
    if (prompt) {
      updateSharedDeferredPrompt(null);
      try {
        setIsInstalling(true);
        await prompt.prompt();
        await prompt.userChoice;
      } catch (error) {
        console.error("Install prompt failed:", error);
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    if (isIos) {
      alert('To install DiscipleOS on iPhone or iPad, tap Share, then "Add to Home Screen".');
      return;
    }

    if (isAndroidDevice()) {
      alert(
        "DiscipleOS updates from the website, so you do not need to reinstall it. After a new version is published, close and reopen the Home Screen app or refresh this page. To install it for the first time, tap Chrome’s ⋮ menu and choose “Install app” or “Add to Home screen.” No APK download is used.",
      );
      return;
    }

    alert(
      "Install isn’t available yet. Try Chrome or Edge, then refresh and try again."
    );
  };

  const disabled = isInstalled || isInstalling;

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={handleInstall}
      disabled={disabled}
      aria-disabled={disabled}
      title={
        isInstalled
          ? "App is already installed"
          : deferredPrompt
            ? "Install DiscipleOS"
            : isIos
              ? "Show iPhone/iPad install instructions"
              : "Install may not be available yet in this browser state"
      }
      className={[
        "inline-flex w-full items-center justify-center whitespace-nowrap border transition-[background-color,border-color,transform] active:translate-y-px",
        compact
          ? "discipleos-control--compact h-9 gap-1.5 px-3 py-2 text-xs md:h-11"
          : "discipleos-action h-11 gap-2 px-4 text-sm",
        isInstalled
          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
          : disabled
            ? "border-white/10 bg-white/5 text-white/45"
            : compact
              ? "border-white/10 bg-white/[0.04] text-[#94A3B8] hover:-translate-y-0.5 hover:border-[#D4A017]/50 hover:bg-white/10 hover:text-white"
              : "border-white/10 bg-white/5 text-[#F8FAFC] hover:bg-white/10",
      ].join(" ")}
    >
      {isInstalled ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}