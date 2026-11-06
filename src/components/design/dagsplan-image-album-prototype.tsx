"use client";

/* eslint-disable @next/next/no-img-element -- Prototypen må støtte lokale object-URL-er fra filvelgeren. */

import { ImagePlus, Images, Minus, Move, Plus, RotateCcw, Search, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Asset = { id: string; name: string; src: string; used: number };
type Framing = { zoom: number; x: number; y: number; fit: "cover" | "contain" };
type PrototypeRow = { id: string; from: string; to: string; info: string; scene: string; assetId: string | null; framing: Framing };

const DEFAULT_FRAMING: Framing = { zoom: 1, x: 50, y: 50, fit: "contain" };
const SHOT_ROOT = "/uploads/dagsplan/schedule-shot";

const INITIAL_ASSETS: Asset[] = [
  { id: "hero", name: "Performance workout", src: `${SHOT_ROOT}/002dccbb-559c-4059-88ab-2e2bd825be5f-9628367bd38b8441.png`, used: 2 },
  { id: "fjord", name: "Establishing fjord", src: `${SHOT_ROOT}/40e7bb08-aef7-4eeb-bb4d-b9800a72279e-88baa4b92accdbae.png`, used: 0 },
  { id: "shot-3", name: "Glowing table – wide", src: `${SHOT_ROOT}/7618b64e-2101-49bb-a0ad-45ddc2d1cf52-ab8451a45aee3d03.png`, used: 2 },
  { id: "shot-4", name: "Godfisk – close up", src: `${SHOT_ROOT}/a11365db-f9e6-46b8-a92c-5d3658e0f4ad-169feedd55883975.png`, used: 1 },
  { id: "shot-5", name: "Fridge – inside", src: `${SHOT_ROOT}/b0ff4a13-83c2-4a43-8552-47e886cc8dec-9113077585e81c04.png`, used: 0 },
  { id: "shot-6", name: "Podium still", src: `${SHOT_ROOT}/18e31f4d-6a09-486a-a8b0-a714d459819a-d4a735b3e8fa6340.png`, used: 0 },
  { id: "portrait", name: "Vertikalt referansebilde", src: `${SHOT_ROOT}/95b0e45d-312c-4d93-8254-b80d45ff8e10-b679f7774525cc49.png`, used: 1 },
];

const INITIAL_ROWS: PrototypeRow[] = [
  { id: "row-1", from: "16:55", to: "17:10", info: "Opptak", scene: "Performance workout", assetId: "hero", framing: { ...DEFAULT_FRAMING } },
  { id: "row-2", from: "17:10", to: "17:15", info: "Setup", scene: "Setup glowing table", assetId: null, framing: DEFAULT_FRAMING },
  { id: "row-3", from: "17:15", to: "17:22", info: "Opptak", scene: "Vertikalt bilde i bred Shot-ramme", assetId: "portrait", framing: { ...DEFAULT_FRAMING } },
  { id: "row-4", from: "17:22", to: "17:25", info: "Opptak", scene: "Glowing table + SoMe – Wide", assetId: "shot-3", framing: { ...DEFAULT_FRAMING } },
];

function FramedImage({ asset, framing }: { asset: Asset; framing: Framing }) {
  const maxPan = ((framing.zoom - 1) * 50) / framing.zoom;
  const translateX = ((50 - framing.x) / 50) * maxPan;
  const translateY = ((50 - framing.y) / 50) * maxPan;
  return <img src={asset.src} alt="" draggable={false} className={cn("pointer-events-none h-full w-full select-none", framing.fit === "cover" ? "object-cover" : "object-contain")} style={{ transform: `translate(${translateX}%, ${translateY}%) scale(${framing.zoom})` }} />;
}

export function DagsplanImageAlbumPrototype() {
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"album" | "adjust">("album");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const activeRow = rows.find((row) => row.id === activeRowId) ?? null;
  const activeAsset = activeRow ? assets.find((asset) => asset.id === activeRow.assetId) ?? null : null;
  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("no");
    return normalized ? assets.filter((asset) => asset.name.toLocaleLowerCase("no").includes(normalized)) : assets;
  }, [assets, query]);

  const patchRow = (id: string, patch: Partial<PrototypeRow>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  const patchFraming = (patch: Partial<Framing>) => {
    if (!activeRowId) return;
    setRows((current) => current.map((row) => row.id === activeRowId ? { ...row, framing: { ...row.framing, ...patch } } : row));
  };
  const openImageEditor = (row: PrototypeRow) => {
    setActiveRowId(row.id);
    setMode(row.assetId ? "adjust" : "album");
    setQuery("");
    setOpen(true);
  };
  const openProjectAlbum = () => {
    setActiveRowId(rows[0]?.id ?? null);
    setMode("album");
    setQuery("");
    setOpen(true);
  };
  const chooseAsset = (assetId: string) => {
    if (!activeRow) return;
    patchRow(activeRow.id, { assetId, framing: { ...DEFAULT_FRAMING } });
    setMode("adjust");
  };
  const addLocalFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const added = Array.from(files).filter((file) => file.type.startsWith("image/")).map((file) => ({ id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ""), src: URL.createObjectURL(file), used: 0 }));
    setAssets((current) => [...added, ...current]);
    if (added[0]) chooseAsset(added[0].id);
  };
  const beginReframe = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeRow) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, startX: activeRow.framing.x, startY: activeRow.framing.y };
  };
  const reframe = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !activeRow) return;
    const rect = event.currentTarget.getBoundingClientRect();
    patchFraming({
      x: Math.max(0, Math.min(100, dragRef.current.startX - ((event.clientX - dragRef.current.x) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, dragRef.current.startY - ((event.clientY - dragRef.current.y) / rect.height) * 100)),
    });
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 lg:px-6">
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="ap-kicker mb-2">DESIGNPROTOTYPE / DAGSPLAN</div>
          <h1 className="ap-page-title">Bildealbum og utsnitt</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Prøv å gjenbruke samme prosjektbilde i flere ruter og lagre et eget utsnitt per rad.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 py-1.5"><span className="size-1.5 rounded-full bg-[#b45309]" />Prototype · ingenting lagres</Badge>
      </header>

      <section className="border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="ap-section-title">Timeplan</h2><p className="mt-1 text-xs text-muted-foreground">Klikk på et bilde eller en tom Shot-rute for å åpne prosjektalbumet.</p></div>
          <Button variant="outline" size="sm" onClick={openProjectAlbum}><Images /> Åpne prosjektalbum</Button>
        </div>
        <div className="overflow-x-auto p-4">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[68px_68px_minmax(150px,1fr)_180px_minmax(220px,1.4fr)] gap-1 px-2 pb-2 text-xs font-medium text-muted-foreground"><div>Fra</div><div>Til</div><div>Info</div><div>Shot</div><div>Scene / setting</div></div>
            <div className="divide-y divide-border border-y border-border">
              {rows.map((row, index) => {
                const asset = assets.find((item) => item.id === row.assetId);
                return (
                  <div key={row.id} className={cn("grid min-h-[128px] grid-cols-[68px_68px_minmax(150px,1fr)_180px_minmax(220px,1.4fr)] items-center gap-1 px-2 py-3", index % 2 === 0 ? "bg-[#fff2df]" : "bg-[#e4f8e9]")}>
                    <Input value={row.from} readOnly className="h-8 px-2 text-xs" /><Input value={row.to} readOnly className="h-8 px-2 text-xs" /><Input value={row.info} readOnly className="h-8" />
                    <div className="group relative mx-auto aspect-video w-[168px] overflow-hidden border border-dashed border-border bg-card/50">
                      <button type="button" onClick={() => openImageEditor(row)} className="relative h-full w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                        {asset ? <><FramedImage asset={asset} framing={row.framing} /><span className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1 bg-black/70 px-2 py-1.5 text-[11px] text-white transition-transform group-hover:translate-y-0 group-focus-within:translate-y-0"><SlidersHorizontal className="size-3" /> Bytt eller tilpass</span></> : <span className="flex h-full flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground"><ImagePlus className="size-5" /><span className="font-medium text-foreground">Shot</span><span>Velg fra album</span></span>}
                      </button>
                      {asset ? (
                        <button
                          type="button"
                          onClick={() => patchRow(row.id, { assetId: null, framing: { ...DEFAULT_FRAMING } })}
                          className="absolute right-1 top-1 z-10 flex size-7 items-center justify-center bg-black/65 text-white opacity-0 transition-opacity hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100 group-focus-within:opacity-100"
                          aria-label="Fjern bilde fra denne ruten"
                          title="Fjern bilde fra denne ruten"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <Input value={row.scene} readOnly className="h-8" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] w-[min(1080px,calc(100vw-32px))] max-w-none flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 py-4 pr-12">
            <div className="flex flex-wrap items-center gap-3"><DialogTitle>{mode === "album" ? "Velg bilde" : "Tilpass utsnitt"}</DialogTitle><Badge variant="secondary">Prosjektalbum · SFN Godfisk</Badge></div>
            <DialogDescription>{mode === "album" ? "Bildet gjenbrukes fra prosjektet uten ny opplasting." : "Utsnittet gjelder bare denne raden. Originalbildet endres ikke."}</DialogDescription>
          </DialogHeader>
          {mode === "album" ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søk i prosjektalbumet…" className="pl-9" /></label>
                <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => addLocalFiles(event.target.files)} />
                <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload /> Last opp nytt</Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredAssets.map((asset) => <button key={asset.id} type="button" onClick={() => chooseAsset(asset.id)} className="group overflow-hidden border border-border bg-card text-left transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><div className="aspect-video overflow-hidden bg-muted"><img src={asset.src} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" /></div><div className="flex items-start justify-between gap-2 p-2.5"><span className="line-clamp-2 text-xs font-medium">{asset.name}</span>{asset.used > 0 ? <span className="shrink-0 text-[10px] text-muted-foreground">{asset.used}× brukt</span> : null}</div></button>)}
              </div>
            </div>
          ) : activeRow && activeAsset ? (
            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex min-h-[420px] items-center justify-center bg-[#171719] p-6">
                <div className="relative aspect-video w-full max-w-[720px] cursor-grab overflow-hidden bg-black active:cursor-grabbing" onPointerDown={beginReframe} onPointerMove={reframe} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
                  <FramedImage asset={activeAsset} framing={activeRow.framing} />
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">{Array.from({ length: 9 }).map((_, index) => <span key={index} className="border-[0.5px] border-white/40" />)}</div>
                  <span className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 bg-black/70 px-2.5 py-1.5 text-xs text-white"><Move className="size-3.5" /> Dra for å flytte utsnittet</span>
                </div>
              </div>
              <aside className="flex flex-col gap-6 border-l border-border p-5">
                <div><div className="mb-3 flex items-center justify-between"><label htmlFor="prototype-zoom" className="text-xs font-medium">Zoom</label><span className="font-mono text-xs text-muted-foreground">{Math.round(activeRow.framing.zoom * 100)}%</span></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="size-8" onClick={() => patchFraming({ zoom: Math.max(1, activeRow.framing.zoom - 0.1) })} aria-label="Zoom ut"><Minus /></Button><input id="prototype-zoom" type="range" min="1" max="3" step="0.05" value={activeRow.framing.zoom} onChange={(event) => patchFraming({ zoom: Number(event.target.value) })} className="h-1.5 min-w-0 flex-1 cursor-pointer accent-foreground" /><Button variant="outline" size="icon" className="size-8" onClick={() => patchFraming({ zoom: Math.min(3, activeRow.framing.zoom + 0.1) })} aria-label="Zoom inn"><Plus /></Button></div></div>
                <div><div className="mb-2 text-xs font-medium">Visning</div><div className="grid grid-cols-2 border border-border p-1">{(["cover", "contain"] as const).map((fit) => <button key={fit} type="button" onClick={() => patchFraming({ fit, zoom: fit === "contain" ? 1 : activeRow.framing.zoom })} className={cn("px-3 py-2 text-xs font-medium", activeRow.framing.fit === fit ? "bg-foreground text-background" : "hover:bg-muted")}>{fit === "cover" ? "Fyll ruten" : "Vis hele"}</button>)}</div></div>
                <div className="border-t border-border pt-4"><div className="mb-1 text-xs font-medium">{activeAsset.name}</div><p className="text-xs text-muted-foreground">Samme bilde kan ha et annet utsnitt i hver rute.</p></div>
                <div className="mt-auto space-y-2"><Button variant="outline" className="w-full justify-start" onClick={() => patchFraming({ ...DEFAULT_FRAMING })}><RotateCcw /> Tilbakestill utsnitt</Button><Button variant="outline" className="w-full justify-start" onClick={() => setMode("album")}><Images /> Bytt bilde</Button><Button variant="destructive" className="w-full justify-start" onClick={() => { patchRow(activeRow.id, { assetId: null, framing: { ...DEFAULT_FRAMING } }); setOpen(false); }}><Trash2 /> Fjern fra denne ruten</Button></div>
              </aside>
            </div>
          ) : null}
          <DialogFooter className="border-t border-border px-5 py-3"><Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>{mode === "adjust" ? <Button onClick={() => setOpen(false)}>Bruk utsnitt</Button> : null}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
