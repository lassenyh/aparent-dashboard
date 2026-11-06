"use client";
import { useActionState, useState } from "react";
import { Check, ChevronsUpDown, Mail, ShieldCheck } from "lucide-react";
import { sendProjectInvitation } from "@/actions/project-invitations";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { invitationEmail } from "@/lib/invitations/email";
import { nativeSelectClassName } from "@/lib/form-classes";
import { accessLabels, editPermissions, permissionModules, readPermissions, type InvitationPermissions } from "@/lib/invitations/permissions";
import { cn } from "@/lib/utils";

export function ProjectInvitationForm({ projects, inviter, ready, initialProjectId }: {
  projects: { id: string; name: string }[]; inviter: string; ready: boolean; initialProjectId?: string;
}) {
  const [state, action, pending] = useActionState(sendProjectInvitation, null);
  const [projectId, setProjectId] = useState(projects.find(p => p.id === initialProjectId)?.id ?? projects[0]?.id ?? "");
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [showMessage, setShowMessage] = useState(true);
  const [message, setMessage] = useState("Hei! Bli med på prosjektet vårt. Her finner du crew og oppdaterte planer for produksjonen.");
  const [permissions, setPermissions] = useState<InvitationPermissions>(readPermissions);
  const project = projects.find(p => p.id === projectId);
  const preview = invitationEmail({ project: project?.name || "Velg prosjekt", inviter, message: showMessage ? message : "", permissions, url: "#invitasjon" });
  return <div className="grid gap-6 xl:grid-cols-2">
    <section className="border border-border bg-card p-5 sm:p-7">
      <p className="ap-kicker text-muted-foreground">01 / Inviter til prosjekt</p>
      <h2 className="mt-3 text-2xl font-medium">Gi riktig tilgang</h2>
      <form action={action} className="mt-6 space-y-5">
        <div className="space-y-2"><Label htmlFor="invite-email">Mottakerens e-post</Label><Input id="invite-email" name="email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="navn@firma.no" /></div>
        <div className="space-y-2">
          <Label htmlFor="invite-project">Prosjekt</Label>
          <input type="hidden" name="projectId" value={projectId} />
          <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
            <PopoverTrigger asChild>
              <Button id="invite-project" type="button" variant="outline" role="combobox" aria-expanded={projectPickerOpen} aria-label="Velg prosjekt" className="h-11 w-full justify-between px-3 font-normal" disabled={!projects.length}>
                <span className="truncate">{project?.name ?? "Velg prosjekt"}</span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] border-border p-0 shadow-md">
              <Command>
                <CommandInput placeholder="Søk etter prosjektnummer eller navn …" />
                <CommandList>
                  <CommandEmpty>Ingen prosjekter funnet.</CommandEmpty>
                  <CommandGroup>
                    {projects.map((option) => (
                      <CommandItem key={option.id} value={`${option.name} ${option.id}`} onSelect={() => { setProjectId(option.id); setProjectPickerOpen(false); }}>
                        <Check className={cn("mr-2 size-4", projectId === option.id ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{option.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {!projects.length && <p className="text-sm text-muted-foreground">Opprett et prosjekt før du inviterer.</p>}
        </div>
        <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Rettigheter i dette prosjektet</legend><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setPermissions(readPermissions)}>Kun lese</Button><Button type="button" variant="outline" size="sm" onClick={() => setPermissions(editPermissions)}>Bidra og redigere</Button></div>
          <div className="divide-y divide-border border-y border-border"><div className="flex items-center justify-between gap-3 py-3"><Label htmlFor="access-projectInfo">Prosjektinfo</Label><select id="access-projectInfo" name="projectInfo" className={`${nativeSelectClassName} max-w-[190px]`} value={permissions.projectInfo ?? "read"} onChange={e => setPermissions(old => ({ ...old, projectInfo: e.target.value as "read" | "write" }))}><option value="read">Kan lese</option><option value="write">Kan lese og redigere</option></select></div>{permissionModules.map(m => <div key={m.key} className="flex items-center justify-between gap-3 py-3"><Label htmlFor={`access-${m.key}`}>{m.label}</Label><select id={`access-${m.key}`} name={m.key} className={`${nativeSelectClassName} max-w-[190px]`} value={permissions[m.key]} onChange={e => setPermissions(old => ({ ...old, [m.key]: e.target.value }))}>{Object.entries(accessLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>)}</div>
        </fieldset>
        <div className="flex gap-3 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="size-4 shrink-0" /><p>Kun valgt prosjekt. Ingen admin-tilgang, invitasjonsrett, felles crewdatabase eller sensitive personopplysninger. Lønningslister kan inneholde honorarer og må velges særskilt.</p></div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showMessage} onChange={e => setShowMessage(e.target.checked)} className="size-4 accent-primary" />Vis personlig melding i invitasjonen</label>
          {showMessage && <div className="space-y-2"><Label htmlFor="invite-message">Personlig melding</Label><textarea id="invite-message" name="message" className="min-h-24 w-full border border-input bg-card p-3 text-sm" value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} /></div>}
        </div>
        {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}{state?.success && <p role="status" className="text-sm text-foreground">{state.success}</p>}
        <Button type="submit" className="w-full" disabled={pending || !ready || !project}><Mail className="size-4" />{pending ? "Sender invitasjon …" : "Send invitasjon"}</Button>
        {!ready ? <p className="text-xs text-muted-foreground">E-postsending er konfigurert i produksjon, men er ikke tilgjengelig i denne lokale forhåndsvisningen.</p> : null}
        <p className="text-xs text-muted-foreground">Personlig lenke, gyldig i 7 dager. En ny invitasjon til samme prosjekt og e-post erstatter den forrige.</p>
      </form>
    </section>
    <section className="border border-border bg-muted/30 p-5 sm:p-7"><p className="ap-kicker text-muted-foreground">02 / Forhåndsvisning av e-post</p><div className="mt-5 border border-border bg-card"><div className="border-b border-border p-4 text-xs text-muted-foreground"><p>Til: {email || "navn@firma.no"}</p><p className="mt-1">Emne: Du er invitert til {project?.name || "ditt prosjekt"}</p></div><iframe title="Forhåndsvisning av invitasjonsmail" srcDoc={preview.html} sandbox="" className="block h-[780px] w-full border-0" /></div></section>
  </div>;
}
