import { z } from "zod";

export const accessSchema = z.enum(["none", "read", "write"]);
export const invitationPermissionsSchema = z.object({
  projectInfo: z.enum(["read", "write"]).optional(),
  crew: accessSchema,
  dagsplan: accessSchema,
  callSheets: accessSchema,
  payroll: accessSchema,
});
export type InvitationPermissions = z.infer<typeof invitationPermissionsSchema>;
export const permissionModules = [
  { key: "crew", label: "Crew" },
  { key: "dagsplan", label: "Dagsplaner" },
  { key: "callSheets", label: "Call sheets" },
  { key: "payroll", label: "Lønningslister" },
] as const;
export const accessLabels = { none: "Ingen tilgang", read: "Kan lese", write: "Kan lese og redigere" };
export const readPermissions: InvitationPermissions = { projectInfo: "read", crew: "read", dagsplan: "read", callSheets: "read", payroll: "none" };
export const editPermissions: InvitationPermissions = { projectInfo: "write", crew: "write", dagsplan: "write", callSheets: "write", payroll: "none" };
export function membershipPermissions(input: unknown) {
  const p = invitationPermissionsSchema.parse(input);
  return {
    role: Object.values(p).includes("write") ? "editor" as const : "viewer" as const,
    canViewProjectInfo: true,
    canEditProjectInfo: p.projectInfo === "write",
    canViewCrew: p.crew !== "none", canEditCrew: p.crew === "write",
    canViewDagsplan: p.dagsplan !== "none", canEditDagsplan: p.dagsplan === "write",
    canViewCallSheets: p.callSheets !== "none", canEditCallSheets: p.callSheets === "write",
    canViewPayroll: p.payroll !== "none", canEditPayroll: p.payroll === "write",
    canViewSensitiveData: false, canImportCrewDatabase: false,
  };
}
