"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BefaringLocationOption } from "@/lib/befaring-mail";

/**
 * Utkast for teknisk befaring, lagret i nettleseren (localStorage) per prosjekt.
 * Ikke delt mellom brukere eller enheter.
 */
export type BefaringDraftLocation = BefaringLocationOption & { included: boolean };

export type BefaringDraft = {
  date: string;
  time: string;
  transport: string;
  selected: string[];
  locations: BefaringDraftLocation[];
};

type Stored = BefaringDraft & { v: 1; savedAt: string };

export const AUTOSAVE_INTERVAL_MS = 30_000;

const key = (projectId: string) => `befaring-draft:v1:${projectId}`;

export function loadBefaringDraft(projectId: string): (BefaringDraft & { savedAt: string }) | null {
  try {
    const raw = localStorage.getItem(key(projectId));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Stored>;
    if (data.v !== 1) return null;
    return {
      date: typeof data.date === "string" ? data.date : "",
      time: typeof data.time === "string" ? data.time : "",
      transport: typeof data.transport === "string" ? data.transport : "",
      selected: Array.isArray(data.selected) ? data.selected.filter((s) => typeof s === "string") : [],
      locations: Array.isArray(data.locations) ? data.locations : [],
      savedAt: typeof data.savedAt === "string" ? data.savedAt : "",
    };
  } catch {
    return null;
  }
}

function saveBefaringDraft(projectId: string, draft: BefaringDraft): string | null {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(key(projectId), JSON.stringify({ v: 1, savedAt, ...draft } satisfies Stored));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearBefaringDraft(projectId: string) {
  try {
    localStorage.removeItem(key(projectId));
  } catch {}
}

/**
 * Lagrer utkastet hvert 30. sekund når det er endret, og advarer ved forsøk på å forlate siden
 * med ulagrede endringer: nettleserens egen advarsel ved lukking/omlasting, og `leaveTarget`
 * (vises som dialog av siden) ved klikk på interne lenker.
 */
export function useBefaringAutosave(
  projectId: string,
  draft: BefaringDraft,
  initialSavedAt: string | null,
) {
  const serialized = JSON.stringify(draft);
  /* Utgangspunktet regnes som «lagret»: ingen advarsel før brukeren faktisk endrer noe. */
  const [savedSnapshot, setSavedSnapshot] = useState(serialized);
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  /** Intern lenke brukeren prøvde å gå til med ulagrede endringer. */
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const dirty = serialized !== savedSnapshot;

  const latest = useRef({ draft, serialized, dirty });
  useEffect(() => {
    latest.current = { draft, serialized, dirty };
  });

  const saveNow = useCallback(() => {
    const { draft: d, serialized: s } = latest.current;
    const at = saveBefaringDraft(projectId, d);
    if (!at) return false;
    setSavedSnapshot(s);
    setSavedAt(at);
    return true;
  }, [projectId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (latest.current.dirty) saveNow();
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [saveNow]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!latest.current.dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    /* Klientnavigasjon (Next-lenker) utløser ikke beforeunload — fang klikk på interne lenker. */
    function onClick(e: MouseEvent) {
      if (!latest.current.dirty || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      /* Stopp navigasjonen og la siden vise sin egen dialog (native confirm blokkeres i noen nettlesere). */
      e.preventDefault();
      e.stopPropagation();
      setLeaveTarget(url.pathname + url.search + url.hash);
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const reset = useCallback((next: BefaringDraft) => {
    clearBefaringDraft(projectId);
    setSavedSnapshot(JSON.stringify(next));
    setSavedAt(null);
  }, [projectId]);

  return { dirty, savedAt, saveNow, reset, leaveTarget, cancelLeave: () => setLeaveTarget(null) };
}
