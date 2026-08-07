/**
 * NOT COPIED: `src/actions/projects.ts` → `getProjectById`
 *
 * Used only by `src/app/(app)/projects/[id]/dagsplaner/new/page.tsx`
 * to load the parent project before creating a dagsplan.
 *
 * The full action also loads call sheets, payroll lists, and other
 * dashboard surfaces — do not share that file wholesale.
 *
 * To run the “new dagsplan” page independently, provide an equivalent:
 *
 *   getProjectById(projectId) → { id, name, ... } | notFound()
 *
 * with the same auth/access checks your host app requires.
 */
export {};
