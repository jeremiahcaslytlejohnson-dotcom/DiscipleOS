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

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const syncInstalledState = () => {
      const installed = isStandaloneMode();
      setIsInstalled(installed);

      if (installed) {
        setDeferredPrompt(null);
        setIsInstalling(false);
      }
    };

    setIsIos(isIosDevice());
    syncInstalledState();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
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

    if (deferredPrompt) {
      try {
        setIsInstalling(true);
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        if (choice.outcome !== "accepted") {
          setIsInstalling(false);
        }
      } catch (error) {
        console.error("Install prompt failed:", error);
        setIsInstalling(false);
      }
      return;
    }

    if (isIos) {
      alert('To install DiscipleOS on iPhone or iPad, tap Share, then "Add to Home Screen".');
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
        "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 text-sm transition-[background-color,border-color,transform] active:translate-y-px",
        isInstalled
          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
          : disabled
            ? "border-white/10 bg-white/5 text-white/45"
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