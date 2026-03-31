import { redirect } from "next/navigation";

/** Tidligere liste-URL — forsiden viser nå prosjekter. */
export default function ProjectsListRedirect() {
  redirect("/");
}
