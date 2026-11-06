"use client";
import { useEffect } from "react";

export function SupabaseAuthRedirect() {
  useEffect(() => {
    if (window.location.pathname === "/auth/complete") return;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.has("access_token") || hash.has("error_description")) {
      window.location.replace(`/auth/complete${window.location.hash}`);
    }
  }, []);
  return null;
}
