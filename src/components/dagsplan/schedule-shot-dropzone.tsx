"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Images, LoaderCircle, Minus, Move, Plus, RotateCcw, Search, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadDagsplanImageAsset } from "@/actions/dagsplan";
import { PublicLogoImg } from "@/components/public-logo-img";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { DagsplanLocale, ShotDropzoneStrings } from "@/lib/dagsplan-i18n";
import type { ScheduleImageFit } from "@/lib/schedule-rows";
import { DEFAULT_SCHEDULE_SHOT_FRAMING, scheduleShotImageStyle } from "@/lib/schedule-shot-framing";
import { ImagePrepareError, prepareImageForUpload } from "@/lib/prepare-image-upload";
import { MAX_IMAGE_INPUT_BYTES, MAX_SCHEDULE_SHOT_IMAGE_BYTES } from "@/lib/upload-limits";
import { cn } from "@/lib/utils";

type Asset = { id: string; url: string; name: string };
type ImageState = { assetId: string; url: string; zoom: number; x: number; y: number; fit: ScheduleImageFit };

function FramedImage({ image }: { image: ImageState }) {
  return <PublicLogoImg src={image.url} alt="" draggable={false} className={cn("pointer-events-none absolute inset-0 block h-full w-full select-none", image.fit === "cover" ? "object-cover" : "object-contain")} style={scheduleShotImageStyle(image)} />;
}

export function ScheduleShotDropzone({ projectId, image, assets, onChange, onAssetCreated }: {
  projectId: string; image: ImageState; assets: Asset[];
  onChange: (image: ImageState) => void; onAssetCreated: (asset: Asset) => void;
  locale?: DagsplanLocale; strings?: ShotDropzoneStrings;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"album" | "adjust">("album");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ImageState>(image);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const filtered = useMemo(() => { const q = query.trim().toLocaleLowerCase("no"); return q ? assets.filter((a) => a.name.toLocaleLowerCase("no").includes(q)) : assets; }, [assets, query]);
  const patch = (next: Partial<ImageState>) => setDraft((current) => ({ ...current, ...next }));
  const clear = () => onChange({ assetId: "", url: "", ...DEFAULT_SCHEDULE_SHOT_FRAMING });
  const choose = (asset: Asset) => { setDraft({ assetId: asset.id, url: asset.url, ...DEFAULT_SCHEDULE_SHOT_FRAMING }); setMode("adjust"); };
  const openEditor = () => { setDraft(image); setMode(image.url ? "adjust" : "album"); setQuery(""); setOpen(true); };
  const upload = async (file: File) => {
    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) return toast.error("Velg en bildefil");
    if (file.size > MAX_IMAGE_INPUT_BYTES) return toast.error("Bildet er for stort (maks 40 MB)");
    setUploading(true);
    try {
      const prepared = await prepareImageForUpload(file, { maxBytes: MAX_SCHEDULE_SHOT_IMAGE_BYTES });
      const fd = new FormData(); fd.set("shotImage", prepared);
      const result = await uploadDagsplanImageAsset(projectId, fd);
      if ("error" in result && result.error) return toast.error(result.error);
      if ("asset" in result && result.asset) {
        const asset = { id: result.asset.id, url: result.asset.url, name: result.asset.name || prepared.name };
        onAssetCreated(asset); choose(asset); toast.success("Bildet er lagt i prosjektalbumet");
      }
    } catch (err) {
      toast.error(err instanceof ImagePrepareError ? err.message : "Opplastingen feilet. Prøv igjen.");
    } finally { setUploading(false); }
  };

  return <>
    <div className="group relative mx-auto aspect-video w-full overflow-hidden border border-dashed border-border bg-background/55">
      <button type="button" onClick={openEditor} onPointerDown={(e) => e.stopPropagation()} className="relative h-full w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        {image.url ? <><FramedImage image={image} /><span className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1 bg-black/70 px-1 py-1 text-[9px] text-white transition-transform group-hover:translate-y-0 group-focus-within:translate-y-0"><SlidersHorizontal className="size-3" /> Tilpass</span></> : <span className="flex h-full flex-col items-center justify-center text-center text-[10px] text-muted-foreground"><ImagePlus className="mb-1 size-4" /><span className="font-medium text-foreground">Shot</span><span>Velg fra album</span></span>}
      </button>
      {image.url ? <button type="button" onClick={(e) => { e.stopPropagation(); clear(); }} onPointerDown={(e) => e.stopPropagation()} className="absolute right-1 top-1 z-10 flex size-6 items-center justify-center bg-black/65 text-white opacity-0 transition-opacity hover:bg-black/85 focus:opacity-100 group-hover:opacity-100" aria-label="Fjern bilde fra denne raden" title="Fjern bilde fra denne raden"><Trash2 className="size-3.5" /></button> : null}
    </div>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="flex max-h-[90vh] w-[min(1080px,calc(100vw-32px))] max-w-none flex-col gap-0 overflow-hidden p-0">
      <DialogHeader className="border-b border-border px-5 py-4 pr-12"><div className="flex flex-wrap items-center gap-3"><DialogTitle>{mode === "album" ? "Velg bilde" : "Tilpass utsnitt"}</DialogTitle><Badge variant="secondary">Prosjektalbum</Badge></div><DialogDescription>{mode === "album" ? "Gjenbruk et prosjektbilde uten å laste det opp på nytt." : "Utsnittet gjelder bare denne raden. Originalbildet endres ikke."}</DialogDescription></DialogHeader>
      {mode === "album" ? <div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="mb-4 flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk i prosjektalbumet…" className="pl-9" /></label><input ref={inputRef} type="file" accept="image/*,.heic,.heif" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} /><Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? <LoaderCircle className="animate-spin" /> : <Upload />} Last opp nytt</Button></div>
        {filtered.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{filtered.map((asset) => <button key={asset.id} type="button" onClick={() => choose(asset)} className="group overflow-hidden border border-border bg-card text-left hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="aspect-video overflow-hidden bg-black"><PublicLogoImg src={asset.url} alt="" className="h-full w-full object-contain" /></div><div className="line-clamp-2 p-2.5 text-xs font-medium">{asset.name}</div></button>)}</div> : <div className="flex min-h-48 flex-col items-center justify-center border border-dashed border-border text-center"><Images className="mb-2 size-6 text-muted-foreground" /><p className="text-sm font-medium">Ingen bilder i prosjektalbumet</p><p className="mt-1 text-xs text-muted-foreground">Last opp det første bildet for å bruke det i dagsplanen.</p></div>}
      </div> : draft.url ? <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="flex min-h-[420px] items-center justify-center bg-[#171719] p-6"><div className="relative aspect-video w-full max-w-[720px] cursor-grab overflow-hidden bg-black active:cursor-grabbing" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragRef.current = { px: e.clientX, py: e.clientY, x: draft.x, y: draft.y }; }} onPointerMove={(e) => { if (!dragRef.current) return; const rect = e.currentTarget.getBoundingClientRect(); patch({ x: Math.max(0, Math.min(100, dragRef.current.x - ((e.clientX - dragRef.current.px) / rect.width) * 100)), y: Math.max(0, Math.min(100, dragRef.current.y - ((e.clientY - dragRef.current.py) / rect.height) * 100)) }); }} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}><FramedImage image={draft} /><div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">{Array.from({ length: 9 }).map((_, i) => <span key={i} className="border-[0.5px] border-white/40" />)}</div><span className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 bg-black/70 px-2.5 py-1.5 text-xs text-white"><Move className="size-3.5" /> Dra for å flytte utsnittet</span></div></div>
        <aside className="flex flex-col gap-6 border-l border-border p-5"><div><div className="mb-3 flex items-center justify-between"><label htmlFor="shot-zoom" className="text-xs font-medium">Zoom</label><span className="font-mono text-xs text-muted-foreground">{Math.round(draft.zoom * 100)}%</span></div><div className="flex items-center gap-2"><Button type="button" variant="outline" size="icon" className="size-8" onClick={() => patch({ zoom: Math.max(1, draft.zoom - .1) })}><Minus /></Button><input id="shot-zoom" type="range" min="1" max="3" step="0.05" value={draft.zoom} onChange={(e) => patch({ zoom: Number(e.target.value) })} className="h-1.5 min-w-0 flex-1 cursor-pointer accent-foreground" /><Button type="button" variant="outline" size="icon" className="size-8" onClick={() => patch({ zoom: Math.min(3, draft.zoom + .1) })}><Plus /></Button></div></div><div><div className="mb-2 text-xs font-medium">Visning</div><div className="grid grid-cols-2 border border-border p-1">{(["cover", "contain"] as const).map((fit) => <button key={fit} type="button" onClick={() => patch({ fit, zoom: fit === "contain" ? 1 : draft.zoom })} className={cn("px-3 py-2 text-xs font-medium", draft.fit === fit ? "bg-foreground text-background" : "hover:bg-muted")}>{fit === "cover" ? "Fyll ruten" : "Vis hele"}</button>)}</div></div><div className="mt-auto space-y-2"><Button type="button" variant="outline" className="w-full justify-start" onClick={() => patch(DEFAULT_SCHEDULE_SHOT_FRAMING)}><RotateCcw /> Tilbakestill utsnitt</Button><Button type="button" variant="outline" className="w-full justify-start" onClick={() => setMode("album")}><Images /> Bytt bilde</Button><Button type="button" variant="destructive" className="w-full justify-start" onClick={() => { clear(); setOpen(false); }}><Trash2 /> Fjern fra denne raden</Button></div></aside>
      </div> : null}
      <DialogFooter className="border-t border-border px-5 py-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>{mode === "adjust" ? <Button type="button" onClick={() => { onChange(draft); setOpen(false); }}>Bruk utsnitt</Button> : null}</DialogFooter>
    </DialogContent></Dialog>
  </>;
}
