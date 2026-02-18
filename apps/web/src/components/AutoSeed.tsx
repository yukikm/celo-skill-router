"use client";
import { useEffect } from "react";

let seeded = false;

export function AutoSeed() {
  useEffect(() => {
    if (seeded) return;
    seeded = true;
    fetch("/api/_seed", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
