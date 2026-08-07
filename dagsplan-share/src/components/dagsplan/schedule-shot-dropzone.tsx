"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  removeDagsplanScheduleShot,
  uploadDagsplanScheduleShot,
} from "@/actions/dagsplan";
import { PublicLogoImg } from "@/components/public-logo-img";
import { Button } from "@/components/ui/button";
import { MAX_SCHEDULE_SHOT_IMAGE_BYTES } from "@/lib/upload-limits";
import {
  getShotDropzoneStringsFull,
  type DagsplanLocale,
  type ShotDropzoneStrings,
} from "@/lib/dagsplan-i18n";
import { cn } from "@/lib/utils";

/** Kompakt celle: min ~104px høyde, bilde maks ~96px — lesbart storyboard-utsnitt. */
const PREVIEW_IMG =
  "max-h-24 max-w-full rounded border border-border object-contain";

export function ScheduleShotDropzone({
  scheduleEntryId,
  imageUrl,
  onImageUrlChange,
  locale = "no",
  strings: stringsProp,
}: {
  scheduleEntryId: string;
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  locale?: DagsplanLocale;
  strings?: ShotDropzoneStrings;
}) {
  const str = stringsProp ?? getShotDropzoneStringsFull(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error(str.toastNotImage);
        return;
      }
      if (file.size > MAX_SCHEDULE_SHOT_IMAGE_BYTES) {
        toast.error(str.toastTooBig);
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.set("shotImage", file);
        const r = await uploadDagsplanScheduleShot(scheduleEntryId, fd);
        if ("error" in r && r.error) {
          toast.error(r.error);
          return;
        }
        if ("publicPath" in r && r.publicPath) {
          onImageUrlChange(r.publicPath);
        }
        toast.success(str.toastSaved);
      } finally {
        setUploading(false);
      }
    },
    [scheduleEntryId, onImageUrlChange, str],
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
      const r = await removeDagsplanScheduleShot(scheduleEntryId);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      onImageUrlChange("");
      toast.success(str.toastRemoved);
    } finally {
      setRemoving(false);
    }
  };

  const hasImage = Boolean(imageUrl.trim());

  return (
    <div className="flex min-h-[104px] w-full min-w-0 flex-col justify-center gap-1 py-0.5">
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
        <div className="flex min-w-0 flex-col items-center gap-1">
          <PublicLogoImg src={imageUrl} alt="" className={PREVIEW_IMG} />
          <div className="flex w-full flex-wrap justify-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px]"
              disabled={uploading || removing}
              onClick={() => inputRef.current?.click()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {uploading ? str.uploading : str.replace}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-destructive"
              disabled={uploading || removing}
              onClick={() => void onRemove()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {removing ? str.removeEllipsis : str.remove}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onPointerDown={(e) => e.stopPropagation()}
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
            "flex min-h-[88px] w-full min-w-0 flex-col items-center justify-center rounded border border-dashed border-border/80 bg-muted/20 px-1 py-1.5 text-center text-[10px] leading-tight text-muted-foreground transition-colors",
            dragActive && "border-primary bg-muted/50 text-foreground",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <span className="font-medium text-foreground/90">{str.shot}</span>
          <span className="px-0.5">{str.dropOrClick}</span>
        </button>
      )}
    </div>
  );
}
