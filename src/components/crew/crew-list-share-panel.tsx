"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  ensureCrewListShare,
  rotateCrewListShareToken,
} from "@/actions/project-crew-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CrewListSharePanel({
  projectId,
  shareUrl,
}: {
  projectId: string;
  shareUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function copy() {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
    toast.success("Lenke kopiert");
  }

  function create() {
    startTransition(async () => {
      await ensureCrewListShare(projectId);
      router.refresh();
      toast.success("Delingslenke er klar");
    });
  }

  function rotate() {
    startTransition(async () => {
      await rotateCrewListShareToken(projectId);
      router.refresh();
      toast.success("Ny lenke — den gamle virker ikke lenger");
    });
  }

  return (
    <div className="mb-8 rounded-lg border border-border bg-muted/10 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">
          Delt visning (kun tabell / PDF)
        </Label>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Mottakere trenger ikke innlogging. Lenken viser samme tabell som
        PDF-utsnittet og oppdateres når du endrer listen her.
      </p>
      {!shareUrl ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={create}
        >
          Opprett delingslenke
        </Button>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label
              htmlFor="crew-share-url"
              className="text-xs text-muted-foreground"
            >
              Lenke
            </Label>
            <Input
              id="crew-share-url"
              readOnly
              value={shareUrl}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={copy}
            >
              <Copy className="h-4 w-4" />
              Kopier
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={rotate}
            >
              <RefreshCw className="h-4 w-4" />
              Ny lenke
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
