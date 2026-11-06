"use server";

import { requireInternalUser } from "@/lib/project-access";
import { searchBrregOrganizations } from "@/lib/brreg";

export async function searchBrreg(query: string) {
  await requireInternalUser();
  return searchBrregOrganizations(query);
}
