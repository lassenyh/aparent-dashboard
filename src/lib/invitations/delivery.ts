import "server-only";
import { invitationEmail } from "./email";
import type { InvitationPermissions } from "./permissions";
export async function deliverInvitation(input: {
  id: string; tokenHash: string; email: string; project: string; inviter: string;
  message: string; url: string; permissions: InvitationPermissions;
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!key || !from) throw new Error("E-post er ikke konfigurert.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: {
      Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      "Idempotency-Key": `project-invite/${input.id}/${input.tokenHash}`,
    }, body: JSON.stringify({ from, to: [input.email], ...invitationEmail(input) }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.id !== "string") {
    // Provider responses can contain personal data; do not return or log them.
    console.error("Invitation email failed", { status: response.status });
    throw new Error("E-posten kunne ikke sendes. Kontroller Resend-oppsettet og prøv igjen.");
  }
  return body.id as string;
}
