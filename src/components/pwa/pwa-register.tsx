"use client";

import { useEffect } from "react";
import { captureInstallEvents } from "./install-store";

let started = false;

export function PwaRegister() {
  useEffect(() => {
    if (started) return;
    started = true;
    captureInstallEvents();
    if ("serviceWorker" in navigator && (window.location.protocol === "https:" || window.location.hostname === "localhost")) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);
  return null;
}
