"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  removeDagsplanLocationParkingImage,
  uploadDagsplanLocationParkingImage,
} from "@/actions/dagsplan";
import { PublicLogoImg } from "@/components/public-logo-img";
import { Button } from "@/components/ui/button";
import { MAX_PARKING_IMAGE_BYTES } from "@/lib/upload-limits";
import { cn } from "@/lib/utils";

export function ParkingImageDropzone({
  locationId,
  imageUrl,
}: {
  locationId: string;
  imageUrl: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  /** router.refresh() kan være sen; skjul miniatyr straks fjerning er OK på server. */
  const [clearedUntilRefresh, setClearedUntilRefresh] = useState(false);
  /** Ny URL fra server action før props oppdateres etter refresh. */
  const [pendingUploadUrl, setPendingUploadUrl] = useState<string | null>(null);

  useEffect(() => {
    setClearedUntilRefresh(false);
    setPendingUploadUrl(null);
  }, [imageUrl, locationId]);

  const displayUrl = (pendingUploadUrl ?? imageUrl).trim();

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Velg en bildefil");
        return;
      }
      if (file.size > MAX_PARKING_IMAGE_BYTES) {
        toast.error("Bildet er for stort (maks 8 MB)");
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.set("parkingImage", file);
        const r = await uploadDagsplanLocationParkingImage(locationId, fd);
        if ("error" in r && r.error) {
          toast.error(r.error);
          return;
        }
        setClearedUntilRefresh(false);
        if ("publicPath" in r && r.publicPath) {
          setPendingUploadUrl(r.publicPath);
        }
        toast.success("Bilde lastet opp");
        router.refresh();
      } finally {
        setUploading(false);
      }
    },
    [locationId, router],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const onRemove = async () => {
    setRemoving(true);
    try {
      const r = await removeDagsplanLocationParkingImage(locationId);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      setClearedUntilRefresh(true);
      setPendingUploadUrl(null);
      toast.success("Bilde fjernet");
      router.refresh();
    } finally {
      setRemoving(false);
    }
  };

  const hasImage =
    !clearedUntilRefresh && Boolean(displayUrl.trim());

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onInputChange}
        disabled={uploading || removing}
      />
      {hasImage ? (
        <div className="space-y-2">
          <PublicLogoImg
            src={displayUrl}
            alt="Parking"
            className="max-h-56 w-auto max-w-full rounded-md border border-border object-contain"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || removing}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Laster opp…" : "Bytt bilde"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={uploading || removing}
              onClick={() => void onRemove()}
            >
              {removing ? "Fjerner…" : "Fjern bilde"}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDragActive(false);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={onDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground transition-colors",
            dragActive && "border-primary bg-muted/60 text-foreground",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <span className="font-medium text-foreground">
            Slipp parkeringskart / skisse her
          </span>
          <span>eller klikk for å velge (PNG, JPG, WebP, GIF — maks 8 MB)</span>
          {uploading ? (
            <span className="text-xs">Laster opp…</span>
          ) : (
            <span className="text-xs">Vises som egen side ved utskrift</span>
          )}
        </button>
      )}
    </div>
  );
}
