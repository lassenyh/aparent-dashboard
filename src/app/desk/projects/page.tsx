import { redirect } from "next/navigation";

/** Tidligere liste-URL — prosjektlisten ligger på /desk. */
export default function ProjectsListRedirect() {
  redirect("/desk");
}
