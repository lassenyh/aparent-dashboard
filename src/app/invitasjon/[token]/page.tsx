import type { Metadata } from "next";
import { ProductLockup } from "@/components/product-mark";
import { InvitationAcceptForm } from "@/components/invitation-accept-form";
import { prisma } from "@/lib/db";
import { hashAuthToken, validAuthToken } from "@/lib/auth-token";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { accessLabels, invitationPermissionsSchema, permissionModules } from "@/lib/invitations/permissions";
import { formatProjectDisplayName } from "@/lib/utils";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Din invitasjon · WrapUp Desk", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = validAuthToken(token) ? await prisma.projectInvitation.findUnique({ where: { tokenHash: hashAuthToken(token) }, include: { project: { select: { name: true, internalTitle: true } } } }) : null;
  const available = invite?.status === "sent" && invite.expiresAt > new Date();
  const user = available ? await getSessionDashboardUser() : null;
  const permissions = available ? invitationPermissionsSchema.parse(invite.permissions) : null;
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12"><section className="w-full max-w-lg border border-border bg-card p-6 sm:p-10"><ProductLockup size="lg" />{!available || !permissions ? <div className="mt-8 space-y-4"><h1 className="text-2xl font-medium">Invitasjonen er ikke tilgjengelig</h1><p className="text-sm text-muted-foreground">Lenken er ugyldig, utløpt, trukket tilbake eller allerede brukt. Be avsender om en ny invitasjon. Har du allerede godtatt, kan du logge inn som vanlig.</p><a href="/login" className="text-sm underline">Gå til innlogging</a></div> : <div className="mt-8 space-y-6"><div><h1 className="text-2xl font-medium">Du er invitert med.</h1><p className="mt-3 text-sm text-muted-foreground">{invite.inviterName} inviterer deg til å samarbeide i WrapUp Desk.</p></div><div className="border-l-2 border-seal bg-muted/40 p-4"><p className="ap-kicker text-muted-foreground">Ditt prosjekt</p><h2 className="mt-2 text-xl font-medium">{formatProjectDisplayName(invite.project)}</h2><ul className="mt-4 space-y-2 text-xs"><li className="flex justify-between"><span>Prosjektinfo</span><span>{accessLabels[permissions.projectInfo ?? "read"]}</span></li>{permissionModules.map(m => <li key={m.key} className="flex justify-between gap-2"><span>{m.label}</span><span>{accessLabels[permissions[m.key]]}</span></li>)}</ul></div>{invite.message && <p className="whitespace-pre-wrap text-sm">{invite.message}</p>}<InvitationAcceptForm token={token} email={invite.email} matchingSession={user?.email?.toLowerCase() === invite.email} /><p className="text-xs leading-relaxed text-muted-foreground">Tilgangen gjelder bare dette prosjektet. Du får ingen admin-tilgang eller tilgang til andre prosjekter. Invitasjonen utløper {invite.expiresAt.toLocaleDateString("nb-NO")}.</p></div>}</section></main>;
}
