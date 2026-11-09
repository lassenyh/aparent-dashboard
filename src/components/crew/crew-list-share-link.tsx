"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ensureCrewListShare, rotateCrewListShareToken } from "@/actions/project-crew-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Offentlig delingslenke til crewlisten: opprett, kopier eller forny. */
export function CrewListShareLink({
  projectId,
  shareUrl: initialShareUrl,
}: {
  projectId: string;
  shareUrl: string | null;
}) {
  const router = useRouter();
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [pending, startTransition] = useTransition();

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(new URL(shareUrl, window.location.origin).href);
      toast.success("Lenke kopiert");
    } catch {
      toast.error("Kunne ikke kopiere lenken. Kopier den fra feltet.");
    }
  }

  function create() {
    startTransition(async () => {
      try {
        const share = await ensureCrewListShare(projectId);
        setShareUrl(new URL(`/share/crewliste/${share.token}`, window.location.origin).href);
        router.refresh();
      } catch {
        toast.error("Kunne ikke opprette delingslenke. Prøv igjen.");
      }
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
      } catch {
        toast.error("Kunne ikke fornye delingslenken. Prøv igjen.");
      }
    });
  }

  if (!shareUrl) {
    return (
      <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={create}>
        {pending ? "Oppretter lenke…" : "Opprett delingslenke"}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor="crew-share-url" className="text-xs text-muted-foreground">
          Delingslenke — mottakere trenger ikke innlogging
        </Label>
        <Input id="crew-share-url" readOnly value={shareUrl} className="font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={copy}>
          <Copy className="h-4 w-4" />
          Kopier
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={rotate}>
          <RefreshCw className="h-4 w-4" />
          Ny lenke
        </Button>
      </div>
    </div>
  );
}
