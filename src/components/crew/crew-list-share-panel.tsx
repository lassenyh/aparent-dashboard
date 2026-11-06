"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Share2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  ensureCrewListShare,
  rotateCrewListShareToken,
} from "@/actions/project-crew-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CrewListSharePanel({
  projectId,
  shareUrl: initialShareUrl,
}: {
  projectId: string;
  shareUrl: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [pending, startTransition] = useTransition();

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(new URL(shareUrl, window.location.origin).href);
      toast.success("Lenke kopiert");
    } catch { toast.error("Kunne ikke kopiere lenken. Kopier den fra feltet."); }
  }

  function create() {
    startTransition(async () => {
      try {
        const share = await ensureCrewListShare(projectId);
        setShareUrl(new URL(`/share/crewliste/${share.token}`, window.location.origin).href);
        router.refresh();
      } catch { toast.error("Kunne ikke opprette delingslenke. Prøv igjen."); }
    });
  }

  function rotate() {
    startTransition(async () => {
      try {
        await rotateCrewListShareToken(projectId);
        const share = await ensureCrewListShare(projectId);
        setShareUrl(new URL(`/share/crewliste/${share.token}`, window.location.origin).href);
        router.refresh();
        toast.success("Ny lenke — den gamle virker ikke lenger");
      } catch { toast.error("Kunne ikke fornye delingslenken. Prøv igjen."); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
      <Button type="button" variant="outline" size="sm" onClick={() => { if (!shareUrl && !pending) create(); }}>
        <Share2 className="h-4 w-4" />
        Del
      </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Del crewliste</DialogTitle>
          <DialogDescription>Mottakere trenger ikke innlogging. Lenken viser crewlisten og oppdateres når du endrer den.</DialogDescription>
        </DialogHeader>
      {!shareUrl ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={create}
        >
          {pending ? "Oppretter lenke…" : "Opprett delingslenke"}
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
      </DialogContent>
    </Dialog>
  );
}
