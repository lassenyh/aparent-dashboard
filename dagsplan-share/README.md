# Dagsplan / Daily Schedule — source share package

This folder is a **reference copy** of the Dagsplan (daily shooting schedule) feature extracted from the aparent-dashboard Next.js app.

It is **not** a runnable standalone application. Paths still use `@/` aliases as in the parent app. No existing application files were moved or modified to create this package.

---

## 1. What the functionality does

Dagsplan is an **operational one-day call sheet / shooting plan** per project. Users can:

- Create a plan for a shoot date (title, work hours, locale NO/EN)
- Manage **locations** (name, address, Google Maps links, parking text/image)
- Manage **call times** (crew rows: function, name, mobile, on-set time), seeded from project crew / crew database
- Manage **cast / actors** (name, meet time, ready on set)
- Edit a **schedule table** (from/to, I/E, D/N, info, duration, optional shot images, scene/setting, actor numbers) with drag-and-drop, row kinds (anchor / sequential / free), and row colors
- Add **department info**, free-text **info**, manual **weather**, sunrise/sunset (Oslo auto or override)
- Toggle what appears on print (actors, schedule, department info)
- **Print** a compact A4 layout and **download PDF** (Chromium headless rendering of the print page)

---

## 2. Folder / file structure

```
dagsplan-share/
├── README.md                          ← this file
├── REVIEW-BEFORE-SHARING.md           ← security / sensitivity checklist
├── package.deps.json                  ← npm deps used by the feature
├── next.config.dagsplan-notes.ts      ← Next config excerpts for PDF
├── styles/dagsplan-print.css          ← print CSS from globals.css
├── prisma/
│   ├── schema.dagsplan-excerpt.prisma ← reference schema (trimmed)
│   ├── migrations/*dagsplan*          ← historical SQL migrations
│   └── manual/upgrade_dagsplan_locations_legacy.sql
├── public/
│   ├── aparent_logo/APARENT_DOUBLE_BLACK.png
│   └── uploads/dagsplan/{agency,client,parking,schedule-shot}/.gitkeep
└── src/
    ├── actions/dagsplan.ts            ← server actions (CRUD, uploads)
    ├── actions/PROJECTS_GET_BY_ID.stub.ts  ← documented missing dependency
    ├── app/
    │   ├── (app)/dagsplaner/[id]/page.tsx          ← editor page
    │   ├── (app)/projects/[id]/dagsplaner/new/     ← create page
    │   ├── (print)/layout.tsx
    │   ├── (print)/dagsplaner/[id]/print/page.tsx ← print / PDF source
    │   └── api/
    │       ├── dagsplan/[id]/pdf/route.ts         ← PDF download
    │       └── public-image/route.ts              ← Blob image proxy
    ├── components/dagsplan/           ← feature UI
    ├── components/ui/                 ← shadcn primitives used by editor
    ├── components/{print-toolbar,public-logo-img,...}.tsx
    └── lib/                           ← helpers + trimmed shared infra
```

---

## 3. Main entry points

| Entry | Role |
|---|---|
| `src/app/(app)/projects/[id]/dagsplaner/new/page.tsx` | Create new dagsplan for a project |
| `src/app/(app)/dagsplaner/[id]/page.tsx` | Load data → map → render `DagsplanEditor` |
| `src/components/dagsplan/dagsplan-editor.tsx` | Primary client UI |
| `src/actions/dagsplan.ts` | All server mutations / queries for the feature |
| `src/app/(print)/dagsplaner/[id]/print/page.tsx` | Printable HTML used by browser print **and** PDF |
| `src/app/api/dagsplan/[id]/pdf/route.ts` | Auth → open print URL in Chromium → PDF bytes |

---

## 4. How components interact

```
Project page (host app, not copied)
    │ create / list / duplicate / delete
    ▼
new/page → createDagsplan() → redirect → /dagsplaner/[id]
                                              │
                                              ▼
                                    getDagsplanById + crew suggestions
                                              │
                                              ▼
                                       DagsplanEditor
                          ┌───────────────┼────────────────┐
                          ▼               ▼                ▼
                   ScheduleTable   Location blocks    Weather card
                          │               │
                          ▼               ▼
                   Shot dropzone    Parking dropzone
                          │               │
                          └─────── uploads via actions/dagsplan.ts
                                              │
                          Print link ─────────┼──► /dagsplaner/[id]/print
                          Download PDF ───────┘──► /api/dagsplan/[id]/pdf
                                                      │
                                                      └─ Chromium loads print URL
                                                         with session cookie
```

**Schedule logic** lives in `lib/schedule-rows.ts` (duration chaining, call-time / wrap / lunch detection) and is shared by editor, editor page mapping, and print.

**i18n** (`lib/dagsplan-i18n.ts`) drives editor strings, print labels, and crew role translations (NO/EN).

---

## 5. External npm / package dependencies

See `package.deps.json`. Notable ones:

| Package | Why |
|---|---|
| `@dnd-kit/*` | Schedule row drag-and-drop |
| `suncalc` | Oslo sunrise/sunset |
| `puppeteer-core` + `@sparticuz/chromium` | PDF generation |
| `@vercel/blob` | Optional cloud storage for logos/images |
| `zod` | Save payload validation |
| `sonner` | Toasts (host layout must mount `<Toaster />`) |
| `lucide-react` | Icons |
| Radix + CVA + clsx + tailwind-merge | shadcn UI primitives |
| `@prisma/client` / `prisma` | Persistence |
| `next` / `react` | App Router, Server Actions |

---

## 6. Database / API dependencies

### Database
- Core: `Dagsplan`, `DagsplanLocation`, `DagsplanCrewEntry`, `DagsplanActorEntry`, `DagsplanScheduleEntry`, `DagsplanDepartmentInfoEntry`, enum `WeatherIconKind`
- Host context: `Project`, `ProjectCrew`, `Person`, `Agency`, `Customer` (logo defaults on create)
- Auth/access: `DashboardUser`, `ProjectMembership` (`canViewDagsplan`, `canEditDagsplan`)

Reference excerpt: `prisma/schema.dagsplan-excerpt.prisma`  
Historical migrations: `prisma/migrations/*`

### HTTP / server APIs
- `GET /api/dagsplan/[id]/pdf` — PDF download
- `GET /api/public-image?url=…` — proxy for Vercel Blob images in `<img>` (Safari-friendly)
- Server Actions in `actions/dagsplan.ts` (not REST)

### Env vars the feature expects (names only — **do not commit values**)
- `DATABASE_URL`, `DIRECT_URL`
- `BLOB_READ_WRITE_TOKEN` (optional; else local `/public/uploads`)
- `PUPPETEER_EXECUTABLE_PATH` / `USE_CHROMIUM_PACK` / `PDF_DEBUG_ERRORS` / `VERCEL` for PDF

---

## 7. Functionality that could not reasonably be isolated

| Dependency | Why it stays coupled |
|---|---|
| Project + membership auth | Every action checks session + `canEditDagsplan` / `canViewDagsplan` |
| Project crew / Person DB | Creating a plan seeds crew rows; editor pickers query crew database |
| Agency / Customer logos | Copied into dagsplan fields on create |
| Host app shell | Root layout (fonts, Toaster), Tailwind theme, middleware/login |
| `getProjectById` | New-page entry; full action also loads unrelated modules — **stubbed**, not copied |
| Project detail page UI | List / duplicate / delete links live on the project page (not copied) |
| `logo-upload.ts` | Also knows `customer` / `agency` entity paths (shared upload helper) |

Trimmed for share (see headers in files):
- `lib/utils.ts`, `lib/person.ts`, `lib/snapshot.ts`, `lib/db.ts`, `lib/project-access.ts`

---

## 8. What would be required to run independently

1. A Next.js App Router host with TypeScript, Tailwind, and `@/` → `src/` path alias  
2. Prisma schema merged from the excerpt + migrations applied to Postgres  
3. Auth equivalent to `getSessionDashboardUser` / membership flags  
4. Wire routes under `(app)`, `(print)`, and `api/` as in this tree  
5. Mount UI primitives + `sonner` Toaster; include `styles/dagsplan-print.css` in global CSS  
6. Merge `next.config.dagsplan-notes.ts` (Chromium tracing, body size for uploads)  
7. Provide `getProjectById` (or change the new page)  
8. Chrome/Chromium available for PDF (local) or `@sparticuz/chromium` on Linux serverless  
9. Brand asset at `public/aparent_logo/APARENT_DOUBLE_BLACK.png` (or change `APARENT_LOGO_PUBLIC_PATH`)

Until then, treat this folder as a **code/reference package** for review and porting — not `npm install && npm run dev`.
