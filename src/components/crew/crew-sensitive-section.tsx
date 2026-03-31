"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import {
  revealPersonSensitiveData,
  savePersonSensitiveData,
} from "@/actions/crew-sensitive";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/section-heading";

export type CrewSensitiveMaskedProps = {
  hasBankAccount: boolean;
  hasNationalId: boolean;
  bankMasked: string;
  nationalMasked: string;
  decryptError: boolean;
};

export function CrewSensitiveSection({
  personId,
  initial,
}: {
  personId: string;
  initial: CrewSensitiveMaskedProps;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [bankAccount, setBankAccount] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [revealPending, startReveal] = useTransition();

  const [saveState, saveAction, savePending] = useActionState(
    savePersonSensitiveData.bind(null, personId),
    null as { error: string } | { success: true } | null,
  );

  useEffect(() => {
    if (saveState && "success" in saveState && saveState.success) {
      setRevealed(false);
      setBankAccount("");
      setNationalId("");
      router.refresh();
    }
  }, [saveState, router]);

  function openConfirm() {
    setRevealError(null);
    setConfirmOpen(true);
  }

  function confirmReveal() {
    startReveal(async () => {
      const res = await revealPersonSensitiveData(personId);
      if ("error" in res) {
        setRevealError(res.error);
        setConfirmOpen(false);
        return;
      }
      setBankAccount(res.bankAccount ?? "");
      setNationalId(res.nationalId ?? "");
      setRevealed(true);
      setConfirmOpen(false);
    });
  }

  function hideAgain() {
    setRevealed(false);
    setBankAccount("");
    setNationalId("");
  }

  return (
    <section className="border-t border-border pt-8">
      <div className="mb-4 flex items-center gap-2">
        <Lock
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <SectionHeading className="mb-0">Sensitiv informasjon</SectionHeading>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Kontonummer og personnummer lagres kryptert og vises ikke i klartekst
        før du velger å vise dem.
      </p>

      {initial.decryptError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Kunne ikke lese lagrede sensitive felt. Sjekk at{" "}
          <span className="font-mono text-xs">ENCRYPTION_KEY</span> matcher den
          som ble brukt ved lagring.
        </p>
      ) : null}

      {!revealed ? (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Kontonummer: </span>
            <span className="font-mono tabular-nums">{initial.bankMasked}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Personnummer: </span>
            <span className="font-mono tabular-nums">
              {initial.nationalMasked}
            </span>
          </div>
          {revealError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {revealError}
            </p>
          ) : null}
          {!initial.decryptError ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openConfirm}
            >
              Vis sensitiv info
            </Button>
          ) : null}
        </div>
      ) : (
        <form action={saveAction} className="space-y-4">
          {saveState && "error" in saveState ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {saveState.error}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="sensitive-bank">Kontonummer</Label>
            <Input
              id="sensitive-bank"
              name="bankAccount"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="font-mono tabular-nums"
              placeholder="11 siffer"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sensitive-national">Personnummer</Label>
            <Input
              id="sensitive-national"
              name="nationalId"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              className="font-mono tabular-nums"
              placeholder="11 siffer"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" size="sm" disabled={savePending}>
              {savePending ? "Lagrer…" : "Lagre"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={hideAgain}
            >
              Skjul
            </Button>
          </div>
        </form>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bekreft</DialogTitle>
            <DialogDescription>
              Du er i ferd med å vise sensitiv informasjon.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              onClick={confirmReveal}
              disabled={revealPending}
            >
              {revealPending ? "Henter…" : "Vis"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
