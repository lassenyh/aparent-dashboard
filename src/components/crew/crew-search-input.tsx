"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function CrewSearchInput({ defaultValue }: { defaultValue: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return <div className="relative">
    <Input
      ref={inputRef}
      id="q"
      name="q"
      defaultValue={defaultValue}
      placeholder="Navn, e-post, telefon, rolle, by…"
      className="peer pr-10"
    />
    <button
      type="button"
      aria-label="Tøm søk"
      title="Tøm søk"
      className="absolute inset-y-0 right-1 my-auto flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring peer-placeholder-shown:hidden"
      onClick={() => {
        const input = inputRef.current;
        if (!input) return;
        input.value = "";
        input.defaultValue = "";
        input.form?.requestSubmit();
        input.focus();
      }}
    >
      <X aria-hidden="true" className="h-4 w-4" />
    </button>
  </div>;
}
