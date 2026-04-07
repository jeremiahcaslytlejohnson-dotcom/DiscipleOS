"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function PushSubscribe() {
  const [status, setStatus] = useState("");
const testLocalNotification = async () => {
  try {
    if (!("serviceWorker" in navigator)) {
      setStatus("Service worker not supported");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Notifications not granted");
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification("DiscipleOS Test", {
      body: "Immediate notification test",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: "discipleos-test",
    });

    setStatus("Test notification sent");
  } catch (error) {
    console.error(error);
    setStatus("Test notification failed");
  }
};
  const subscribe = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        setStatus("Service worker not supported");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Notifications not granted");
        return;
      }

      const vapidPublicKey = "BC_R-09PEHK4oePTLQwpb6tICfyvjUxBnTqUBUuWWtW97CpMTYpQzOoyn6jt71zAnNP9SfhRerq3FPwvNvZvJVQ";

     const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
});

await fetch("/api/push", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(subscription),
});

console.log("PUSH SUBSCRIPTION:", JSON.stringify(subscription));
setStatus("Subscribed and push test sent.");
    } catch (error) {
      console.error(error);
      setStatus("Subscription failed");
    }
  };

  return (
  <div className="mt-3">
    <button
      onClick={subscribe}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F8FAFC] hover:bg-white/10"
    >
      Enable Push Notifications
    </button>
	
    <button
      onClick={testLocalNotification}
      className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F8FAFC] hover:bg-white/10"
    >
      Test Notification
    </button>

    {status ? <div className="mt-2 text-sm text-white/60">{status}</div> : null}
  </div>
);
}