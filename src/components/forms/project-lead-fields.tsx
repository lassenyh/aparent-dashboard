"use client";

import { useId, useState } from "react";
import { createDirector, createProducer } from "@/actions/crew";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { nativeSelectClassName } from "@/lib/form-classes";
import { isLeadRole, isProducerRole, type LeadPerson } from "@/lib/project-leads";

export function ProjectLeadFields({ people, producerId = "", directorId = "" }: { people: LeadPerson[]; producerId?: string; directorId?: string }) {
  const id = useId();
  const [selected, setSelected] = useState(directorId);
  const [selectedProducer, setSelectedProducer] = useState(producerId);
  const [kind, setKind] = useState<"producer" | "director">("director");
  const title = kind === "producer" ? "Opprett produsent" : "Opprett regissør";
  const [added, setAdded] = useState<LeadPerson[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const producers = [...people, ...added].filter((person) => person.roles.some(isProducerRole))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "nb"));
  const directors = [...people, ...added].filter((person) => person.roles.some((role) => isLeadRole(role, "director")))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "nb"));
  return <>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${id}-producer`}>Produsent</Label>
        <select id={`${id}-producer`} name="producerId" value={selectedProducer} onChange={(event) => setSelectedProducer(event.target.value)} className={nativeSelectClassName}>
          <option value="">Ikke valgt</option>
          {selectedProducer && !producers.some((person) => person.id === selectedProducer) ? <option value={selectedProducer} disabled>{people.find((person) => person.id === selectedProducer)?.fullName ?? "Tidligere valgt"} – mangler produsentrolle</option> : null}
          {producers.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={() => { setKind("producer"); setError(""); setOpen(true); }}>Opprett produsent</Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-director`}>Regissør</Label>
        <select id={`${id}-director`} name="directorId" value={selected} onChange={(event) => setSelected(event.target.value)} className={nativeSelectClassName}>
          <option value="">Ikke valgt</option>
          {selected && !directors.some((person) => person.id === selected) ? <option value={selected} disabled>{people.find((person) => person.id === selected)?.fullName ?? "Tidligere valgt"} – legg til kategorien Regissør i crewregisteret</option> : null}
          {directors.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={() => { setKind("director"); setError(""); setOpen(true); }}>Opprett regissør</Button>
      </div>
      <p className="ap-help sm:col-span-2">Produsent velges fra produsenter og linjeprodusenter. Regissør velges fra crewkategorien «Regissør». Valgte personer legges til prosjektcrew ved lagring.</p>
    </div>
    <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{kind === "producer" ? "Opprettes i crewregisteret som produsent eller linjeprodusent og velges i prosjektet." : "Opprettes i crewregisteret med kategorien Regissør og velges i prosjektet."}</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (pending) return;
          const data = new FormData(event.currentTarget);
          setPending(true);
          setError("");
          try {
            const result = await (kind === "producer" ? createProducer(data) : createDirector(data));
            if (result.person) {
              setAdded((previous) => [...previous, result.person!]);
              if (kind === "producer") setSelectedProducer(result.person.id);
              else setSelected(result.person.id);
              setOpen(false);
            } else setError(result.error ?? "Kunne ikke opprette personen.");
          } catch { setError("Kunne ikke opprette personen. Prøv igjen."); }
          finally { setPending(false); }
        }}>
          {kind === "producer" ? <div className="space-y-2">
            <Label htmlFor={`${id}-role`}>Crewkategori</Label>
            <select id={`${id}-role`} name="role" defaultValue="Produsent" className={nativeSelectClassName} disabled={pending}>
              <option value="Produsent">Produsent</option>
              <option value="Linjeprodusent">Linjeprodusent</option>
            </select>
          </div> : null}
          {error ? <p role="alert" className="ap-error">{error}</p> : null}
          {([{ name: "firstName", label: "Fornavn", required: true }, { name: "lastName", label: "Etternavn", required: true }, { name: "email", label: "E-post", required: false }, { name: "phone", label: "Telefon", required: false }]).map((field) => (
            <div key={field.name} className="space-y-2"><Label htmlFor={`${id}-${field.name}`}>{field.label}</Label><Input id={`${id}-${field.name}`} name={field.name} required={field.required} type={field.name === "email" ? "email" : field.name === "phone" ? "tel" : "text"} disabled={pending} /></div>
          ))}
          <div className="flex gap-2"><Button type="submit" disabled={pending}>{pending ? "Oppretter…" : title}</Button><Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Avbryt</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
