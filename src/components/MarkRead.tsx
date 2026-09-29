"use client";
import { useEffect } from "react";

export function MarkRead() {
  useEffect(() => {
    fetch("/api/notifications", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
