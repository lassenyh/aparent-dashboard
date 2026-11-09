import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Felles WrapUp-konto (Supabase Auth, samme prosjekt som Sign og Planner).
 * Administrator setter passordet; e-posten regnes som bekreftet fordi en
 * intern bruker oppretter kontoen for en kjent person.
 */
export async function createWrapupAccount(input: {
  email: string;
  password: string;
  fullName?: string | null;
}): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await supabaseAdmin().auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      email_confirm: true,
      user_metadata: input.fullName ? { full_name: input.fullName } : undefined,
    });
    if (error || !data.user) {
      return {
        error:
          error?.message?.toLowerCase().includes("already")
            ? "Det finnes allerede en WrapUp-konto med denne e-posten. Kontoen må kobles til av administrator."
            : "Kunne ikke opprette WrapUp-konto. Prøv igjen eller kontakt administrator.",
      };
    }
    return { id: data.user.id };
  } catch (err) {
    return {
      error:
        err instanceof Error && err.message.includes("konfigurert")
          ? err.message
          : "Kunne ikke opprette WrapUp-konto. Prøv igjen eller kontakt administrator.",
    };
  }
}
