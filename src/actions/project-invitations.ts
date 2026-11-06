"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireInternalUser } from "@/lib/project-access";
import { createDashboardSession, getSessionDashboardUser, sessionCookieOptions } from "@/lib/auth-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { hashAuthToken, newAuthToken, validAuthToken } from "@/lib/auth-token";
import { hashPassword } from "@/lib/auth-password";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { supabaseAdmin, supabaseAuthClient } from "@/lib/supabase/admin";
import { invitationConfiguration, invitationOrigin } from "@/lib/invitations/config";
import { deliverInvitation } from "@/lib/invitations/delivery";
import { invitationPermissionsSchema } from "@/lib/invitations/permissions";
import { formatProjectDisplayName } from "@/lib/utils";
import { acceptProjectInvitation } from "@/lib/invitations/accept";

export type InvitationActionState = { error?: string; success?: string } | null;
const inviteSchema = z.object({
  email: z.email().max(254).transform(value => value.toLowerCase()),
  projectId: z.string().min(1), message: z.string().max(1000),
  permissions: invitationPermissionsSchema,
});

export async function sendProjectInvitation(_previous: InvitationActionState, form: FormData): Promise<InvitationActionState> {
  const actor = await requireInternalUser();
  if (!invitationConfiguration().ready) return { error: "Invitasjoner er ikke aktivert ennå. Fullfør e-post- og Supabase-oppsettet som vises på siden." };
  const parsed = inviteSchema.safeParse({ email: String(form.get("email") ?? "").trim(), projectId: form.get("projectId"), message: String(form.get("message") ?? "").trim(), permissions: Object.fromEntries(["projectInfo", "crew", "dagsplan", "callSheets", "payroll"].map(key => [key, form.get(key)])) });
  if (!parsed.success) return { error: "Kontroller e-post, prosjekt og rettigheter. Meldingen kan være maksimalt 1000 tegn." };
  const input = parsed.data;
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) return { error: "Prosjektet finnes ikke." };
  const known = await prisma.dashboardUser.findMany({ where: { email: { equals: input.email, mode: "insensitive" } }, select: { id: true, isInternal: true, isActive: true } });
  if (known.some(user => user.isInternal)) return { error: "Denne e-postadressen tilhører en administrator som allerede har tilgang til alle prosjekter." };
  if (known.some(user => !user.isActive)) return { error: "Brukeren er deaktivert. Aktiver brukeren under Brukertilgang først." };
  if (await prisma.projectMembership.findFirst({ where: { projectId: input.projectId, userId: { in: known.map(user => user.id) } } })) return { error: "Brukeren har allerede prosjekttilgang. Endre rettighetene under prosjektets Tilgang-fane." };
  if (!await allowAuthAttempt(`invite-send:${actor.id}`, 30)) return { error: "For mange invitasjoner. Prøv igjen om 15 minutter." };
  const token = newAuthToken();
  const tokenHash = hashAuthToken(token);
  const url = `${invitationOrigin()}/invitasjon/${token}`;
  const data = { email: input.email, projectId: project.id, invitedById: actor.id, inviterName: actor.fullName || actor.username, permissions: input.permissions, message: input.message, tokenHash, status: "sending", expiresAt: new Date(Date.now() + 7 * 86400000), sentAt: null, acceptedAt: null, acceptedUserId: null, providerMessageId: null };
  // Serializes resend/revoke/accept on this project-email pair. A resend rotates the token.
  const invitation = await prisma.$transaction(async tx => {
    const old = await tx.projectInvitation.findUnique({ where: { projectId_email: { projectId: project.id, email: input.email } } });
    if (old?.status === "accepted") return null;
    if (old?.status === "sending" && old.updatedAt.getTime() > Date.now() - 60000) return null;
    if (old) {
      const claimed = await tx.projectInvitation.updateMany({ where: { id: old.id, updatedAt: old.updatedAt }, data });
      return claimed.count ? { id: old.id } : null;
    }
    return tx.projectInvitation.create({ data });
  }).catch(() => null);
  if (!invitation) return { error: "Invitasjonen behandles allerede eller er godtatt. Oppdater siden før du prøver igjen." };
  try {
    const providerMessageId = await deliverInvitation({ id: invitation.id, tokenHash, email: input.email, project: formatProjectDisplayName(project), inviter: data.inviterName, message: input.message, url, permissions: input.permissions });
    const sent = await prisma.projectInvitation.updateMany({ where: { id: invitation.id, tokenHash, status: "sending" }, data: { status: "sent", providerMessageId, sentAt: new Date() } });
    if (!sent.count) return { error: "Invitasjonen ble trukket tilbake under sending og gir ikke tilgang." };
  } catch {
    await prisma.projectInvitation.updateMany({ where: { id: invitation.id, tokenHash, status: "sending" }, data: { status: "failed" } });
    revalidatePath("/brukertilgang/invitasjon");
    return { error: "E-posten kunne ikke bekreftes sendt. Kontroller Resend og prøv igjen. En ny sending erstatter den gamle lenken." };
  }
  revalidatePath("/brukertilgang/invitasjon");
  return { success: `Invitasjonen til ${input.email} er sendt. Den er gyldig i 7 dager.` };
}

export async function revokeProjectInvitation(id: string) {
  await requireInternalUser();
  await prisma.$transaction(async tx => {
    // Lock first, so revocation also removes a membership accepted concurrently.
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM project_invitations WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) return;
    const invite = await tx.projectInvitation.findUniqueOrThrow({ where: { id } });
    if (invite.acceptedUserId) await tx.projectMembership.deleteMany({ where: { projectId: invite.projectId, userId: invite.acceptedUserId } });
    await tx.projectInvitation.update({ where: { id }, data: { status: "revoked" } });
  });
  revalidatePath("/brukertilgang");
  revalidatePath("/brukertilgang/invitasjon");
  revalidatePath("/", "layout");
}

export async function acceptInvitation(token: string, _previous: InvitationActionState, form: FormData): Promise<InvitationActionState> {
  if (!validAuthToken(token)) return { error: "Invitasjonen er ugyldig." };
  const tokenHash = hashAuthToken(token);
  const invite = await prisma.projectInvitation.findUnique({ where: { tokenHash } });
  if (!invite || invite.status !== "sent" || invite.expiresAt <= new Date()) return { error: "Invitasjonen er utløpt, trukket tilbake eller allerede brukt." };
  if (!await allowAuthAttempt(`invite-accept:${invite.id}`, 15)) return { error: "For mange forsøk. Prøv igjen om 15 minutter." };
  const mode = String(form.get("mode") ?? "");
  let user = await getSessionDashboardUser();
  if (mode === "session") {
    if (!user || user.email?.toLowerCase() !== invite.email) return { error: "Logg inn med kontoen som tilhører den inviterte e-postadressen." };
  } else {
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();
    if (password.length < 8 || password.length > 128) return { error: "Passordet må være mellom 8 og 128 tegn." };
    if (mode !== "register" && mode !== "login") return { error: "Velg opprett konto eller logg inn." };
    if (mode === "register" && (!fullName || fullName.length > 120)) return { error: "Oppgi fullt navn (maksimalt 120 tegn)." };
    const localUsers = await prisma.dashboardUser.findMany({ where: { email: { equals: invite.email, mode: "insensitive" } } });
    if (localUsers.some(row => !row.supabaseAuthId)) return { error: "Du har allerede en WrapUp-konto. Bruk lenken «Logg inn med eksisterende brukernavn» nedenfor og godta invitasjonen etter innlogging." };
    if (localUsers.some(row => !row.isActive)) return { error: "Kontoen er deaktivert. Kontakt administrator." };
    let authId: string;
    try {
      if (mode === "register") {
        // Possession of the unexpired email token proves control of this address.
        // No Supabase email is sent: Resend delivered the invitation.
        const { data, error } = await supabaseAdmin().auth.admin.createUser({ email: invite.email, password, email_confirm: true, user_metadata: { full_name: fullName } });
        if (error || !data.user) return { error: "Kontoen kunne ikke opprettes. Hvis du allerede har en konto, velg Logg inn. Ellers kontakt administrator." };
        authId = data.user.id;
      } else {
        const { data, error } = await supabaseAuthClient().auth.signInWithPassword({ email: invite.email, password });
        if (error || !data.user?.email_confirmed_at || data.user.email?.toLowerCase() !== invite.email) return { error: "Feil e-post eller passord, eller e-postadressen er ikke bekreftet." };
        authId = data.user.id;
      }
      const existing = await prisma.dashboardUser.findUnique({ where: { supabaseAuthId: authId } });
      if (existing) {
        if (!existing.isActive || existing.email?.toLowerCase() !== invite.email) return { error: "Kontoen kan ikke knyttes til invitasjonen. Kontakt administrator." };
        user = existing;
      } else {
        // Never merge by mutable metadata, username, or email alone.
        user = await prisma.dashboardUser.create({ data: {
          username: invite.email, email: invite.email, fullName: fullName || null,
          supabaseAuthId: authId, passwordHash: await hashPassword(newAuthToken()), isInternal: false,
        } });
      }
    } catch {
      return { error: "Kunne ikke fullføre kontoen. Prøv Logg inn hvis kontoen ble opprettet, eller kontakt administrator." };
    }
  }
  if (!user) return { error: "Logg inn for å godta invitasjonen." };
  const accepted = await acceptProjectInvitation(prisma, { tokenHash, userId: user.id, email: invite.email });
  if (!accepted) return { error: "Invitasjonen er ikke lenger gyldig. Kontakt avsender." };
  const sessionToken = await createDashboardSession(user.id);
  (await cookies()).set(AUTH_COOKIE_NAME, sessionToken, sessionCookieOptions);
  revalidatePath("/brukertilgang");
  revalidatePath("/brukertilgang/invitasjon");
  redirect(`/projects/${invite.projectId}`);
}
