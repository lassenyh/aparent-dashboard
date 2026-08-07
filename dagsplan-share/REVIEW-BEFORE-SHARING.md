# Review before sharing externally

This package is intended for an external developer. Check the following before sending.

## Intentionally excluded

- `.env` / secrets / connection strings / tokens
- Uploaded parking / shot / logo **images** from production (only empty upload dirs)
- Payroll, call sheets, crew import, sensitive encryption modules
- Full `src/actions/projects.ts` (loads unrelated project surfaces)
- Project detail page UI that lists dagsplaner beside other modules
- Person fields for bank account / national ID encryption (not in schema excerpt)

## Included — review carefully

| Item | Why review |
|---|---|
| `src/lib/auth-session.ts` + `auth-cookie.ts` | Shows how sessions are resolved (cookie → `DashboardUser`). No secrets, but exposes auth design. |
| `src/lib/project-access.ts` | Trimmed, but still documents internal vs membership access and `isInternal` bypass. |
| `src/actions/dagsplan.ts` | Full business logic: crew emails/phones on plan, file upload paths, permission checks. |
| `src/lib/logo-upload.ts` | Mentions customer/agency upload entities; uses `BLOB_READ_WRITE_TOKEN` from env at runtime (not embedded). |
| `src/lib/chromium-for-pdf.ts` | Local Chrome discovery paths / serverless Chromium launch options. |
| `public/aparent_logo/APARENT_DOUBLE_BLACK.png` | Brand asset — confirm you want to share the logo. |
| `prisma/schema.dagsplan-excerpt.prisma` | Includes `DashboardUser.passwordHash` **field name** (no hashes). Confirm OK. |
| Print + editor copy | May mention Norwegian production workflows / default emergency & radio text in `dagsplan-defaults.ts`. |

## Not self-contained

Expect the recipient to **port** into their own Next.js + Prisma + auth setup. Imports (`@/…`) and Server Actions assume the parent app conventions.
