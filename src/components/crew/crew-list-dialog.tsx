"use client";

import type { ReactNode } from "react";
import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** «Del crewliste»-knapp som åpner crewlisten i en popup. Innholdet rendres på serveren. */
export function CrewListDialog({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Share aria-hidden /> Del crewliste
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden p-0 sm:w-[calc(100vw-4rem)]">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Crewliste</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
