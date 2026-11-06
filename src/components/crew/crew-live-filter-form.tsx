"use client";

import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function CrewLiveFilterForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRequested = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  function cancelSearch() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function search(form: HTMLFormElement) {
    cancelSearch();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    startTransition(() => router.replace(`/crew?${params}`, { scroll: false }));
  }

  useEffect(() => {
    if (pending || !resetRequested.current) return;
    resetRequested.current = false;
    for (const name of ["q", "role", "city", "active", "sort"]) {
      const control = formRef.current?.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
        control.value = name === "active" ? "all" : name === "sort" ? "name" : "";
      }
    }
  }, [pending]);

  useEffect(() => {
    function restoreFilters() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const params = new URLSearchParams(window.location.search);
      for (const name of ["q", "role", "city", "active", "sort"]) {
        const control = formRef.current?.elements.namedItem(name);
        if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
          control.value = params.get(name) ?? (name === "active" ? "all" : name === "sort" ? "name" : "");
        }
      }
    }
    window.addEventListener("popstate", restoreFilters);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("popstate", restoreFilters);
    };
  }, []);

  return <form
    ref={formRef}
    method="get"
    className="ap-filter-bar mb-6 border-b border-border pb-6"
    aria-busy={pending}
    onSubmit={(event) => { event.preventDefault(); search(event.currentTarget); }}
    onChange={(event) => {
      resetRequested.current = false;
      const form = event.currentTarget;
      cancelSearch();
      if (event.target instanceof HTMLInputElement && event.target.name === "q") {
        timer.current = setTimeout(() => search(form), 300);
      } else search(form);
    }}
    onReset={(event) => {
      event.preventDefault();
      resetRequested.current = true;
      cancelSearch();
      for (const name of ["q", "role", "city", "active", "sort"]) {
        const control = event.currentTarget.elements.namedItem(name);
        if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
          control.value = name === "active" ? "all" : name === "sort" ? "name" : "";
        }
      }
      startTransition(() => router.replace("/crew", { scroll: false }));
    }}
  >
    {children}
    <span role="status" className="sr-only">{pending ? "Oppdaterer søkeresultater…" : ""}</span>
  </form>;
}
