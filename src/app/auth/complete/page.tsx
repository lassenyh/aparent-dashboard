import type { Metadata } from "next";
import { CompleteAuthForm } from "./complete-auth-form";
export const metadata: Metadata = {
  title: "Velg passord · WrapUp Desk",
  robots: { index: false, follow: false }, referrer: "no-referrer",
};
export default function CompleteAuthPage() {
  return <main className="flex min-h-screen items-center justify-center p-6"><CompleteAuthForm /></main>;
}
