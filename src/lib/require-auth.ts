import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

export async function getAuthSessionId(): Promise<string | null> {
  const c = await cookies();
  return c.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function requireAuth(): Promise<string> {
  const id = await getAuthSessionId();
  if (!id) redirect("/login");
  return id;
}
