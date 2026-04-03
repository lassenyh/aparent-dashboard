import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDagsplanById } from "@/actions/dagsplan";
import { DagsplanWeatherCard } from "@/components/dagsplan/dagsplan-weather-card";
import { PrintToolbar } from "@/components/print-toolbar";
import { APARENT_LOGO_PUBLIC_PATH } from "@/lib/dagsplan-defaults";
import {
  inferDurationMinutes,
  isScheduleCallTimeRow,
  isScheduleLunchRow,
  isScheduleWrapRow,
} from "@/lib/schedule-rows";
import { normalizeScheduleRowBgColor } from "@/lib/schedule-row-colors";
import {
  crewFunctionForPrint,
  getDagsplanPrintStrings,
  parseDagsplanLocale,
} from "@/lib/dagsplan-i18n";
import {
  effectiveSunriseDisplay,
  effectiveSunsetDisplay,
} from "@/lib/sunrise-oslo";
import { Truck } from "lucide-react";
import { PublicLogoImg } from "@/components/public-logo-img";
import { sanitizePublicImageUrl } from "@/lib/img-url";
import { cn, formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

/** Tom streng når ingen verdi — ikke bindestrek i ferdig skjema. */
function fmtTime(s: string | null | undefined): string {
  if (!s?.trim()) return "";
  return s.trim();
}

/** Varighet per rad — samme logikk som i editoren (fri rad: fra–til). Viser «NN min». */
function fmtScheduleDurationMinutes(r: {
  durationMinutes: number;
  rowKind?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  info?: string | null;
}): string {
  if (isScheduleCallTimeRow(r) || isScheduleWrapRow(r)) return "";
  if (r.rowKind === "free") {
    const a = r.startTime?.trim();
    const b = r.endTime?.trim();
    if (!a && !b) return "";
    return `${inferDurationMinutes(r.startTime, r.endTime)} min`;
  }
  if (!Number.isFinite(r.durationMinutes)) return "";
  return `${Math.max(0, Math.floor(r.durationMinutes))} min`;
}

function cellText(s: string | number | null | undefined): string {
  if (s == null) return "";
  const t = String(s).trim();
  return t;
}

/** I/E: company move lagres som «truck» — samme Lucide-ikon som i editoren (monokrom). */
function isInteriorTruck(s: string | null | undefined): boolean {
  return (s ?? "").trim().toLowerCase() === "truck";
}

const CREW_MEET_MAX_ROWS_PER_TABLE = 7;

/**
 * Oppmøtetid på print: én tabell når ≤7 personer.
 * 8–14: to tabeller med maks 7 i første (7+1 … 7+7).
 * >14: kun to tabeller med jevn fordeling (8+7, 8+8, …) — ingen tredje tabell.
 */
function chunkCrewMeetForPrint<T>(entries: T[]): T[][] {
  const n = entries.length;
  if (n === 0) return [];
  if (n <= CREW_MEET_MAX_ROWS_PER_TABLE) return [entries];
  if (n <= 14) {
    return [
      entries.slice(0, CREW_MEET_MAX_ROWS_PER_TABLE),
      entries.slice(CREW_MEET_MAX_ROWS_PER_TABLE),
    ];
  }
  const mid = Math.ceil(n / 2);
  return [entries.slice(0, mid), entries.slice(mid)];
}

/** Gjør rå tekst til brukbar href for Google Maps-lenker */
function mapsHref(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function MapsLink({
  label,
  url,
}: {
  label: string;
  url: string | null | undefined;
}) {
  const display = url?.trim() ?? "";
  const href = mapsHref(url);
  if (!href || !display) return null;
  return (
    <p className="text-[10px] leading-snug text-neutral-600 print:text-[9px] print:leading-tight">
      <span className="text-neutral-500">{label}: </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all font-medium text-blue-700 underline decoration-blue-700/60 underline-offset-2 hover:text-blue-800 print:text-blue-800"
      >
        {display}
      </a>
    </p>
  );
}

/** Kompakt linjeavstand i location-blokken (mindre vertikal plass). */
const locationBodyClass =
  "text-[11px] leading-snug text-neutral-800 print:text-[10px] print:leading-tight";

/** Lokasjonstekst som lenke til Google Maps når URL er satt; ellers vanlig tekst. */
function LocationTextWithMapsLink({
  locationText,
  mapsUrl,
  googleMapsLabel,
}: {
  locationText: string | null | undefined;
  mapsUrl: string | null | undefined;
  googleMapsLabel: string;
}) {
  const text = cellText(locationText);
  const href = mapsHref(mapsUrl?.trim() ? mapsUrl : null);
  const linkClass =
    "font-medium text-blue-700 underline decoration-blue-700/60 underline-offset-2 print:text-blue-800";

  if (href) {
    return (
      <p className={cn(locationBodyClass, "whitespace-pre-wrap")}>
        {text ? (
          <>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(linkClass, "whitespace-pre-wrap")}
            >
              {text}
            </a>
            <span className="text-neutral-600"> {googleMapsLabel}</span>
          </>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {googleMapsLabel.trim()}
          </a>
        )}
      </p>
    );
  }

  return (
    <p className={cn(locationBodyClass, "whitespace-pre-wrap")}>{text}</p>
  );
}

/** Section labels — uppercase, editorial call-sheet feel */
const secTitle =
  "mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 print:mb-2.5 print:text-[9px]";

/** Vertikal luft til/fra horisontale skillelinjer (divide-y) i hovedinnholdet. */
const printSectionPadY = "pt-[20px] pb-[20px]";

/** Body / table cell */
const tdBase =
  "border border-neutral-300 px-2.5 py-2 align-top text-[11px] leading-snug text-neutral-900 print:px-2 print:py-1.5 print:text-[10px]";

const tdNum =
  "border border-neutral-300 px-2.5 py-2 text-right align-top tabular-nums text-[11px] leading-snug text-neutral-900 print:px-2 print:py-1.5 print:text-[10px]";

const thBase =
  "border border-neutral-300 bg-neutral-100 px-2.5 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-600 print:px-2 print:py-1.5 print:text-[8px]";

const thNum =
  "border border-neutral-300 bg-neutral-100 px-2.5 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-600 print:px-2 print:py-1.5 print:text-[8px]";

/** Kompakt tabell for oppmøtetid (print). */
const meetTh = cn(
  thBase,
  "px-1.5 py-1 text-[8px] leading-tight print:px-1.5 print:py-0.5 print:text-[7px]",
);
const meetTd = cn(
  tdBase,
  "px-1.5 py-1 text-[9px] leading-tight print:px-1.5 print:py-0.5 print:text-[8px]",
);

/** Fast bredde: «PÅ SET» på én linje + HH:mm (tabular). */
const meetOnSetCol = "w-[2.875rem] min-w-0 max-w-[2.875rem]";

const meetThOnSet = cn(
  meetTh,
  meetOnSetCol,
  "shrink-0 px-0.5 py-1 text-center align-middle print:px-0.5 print:py-0.5",
);

const meetTdOnSet = cn(
  meetTd,
  meetOnSetCol,
  "shrink-0 overflow-hidden px-0.5 text-right tabular-nums print:px-0.5",
);

/** Mobil: unngå linjeskift for internasjonale numre (f.eks. +46 70-825 23 03). */
const meetTdMobile = cn(meetTd, "whitespace-nowrap tabular-nums");

/** Funksjon: litt ekstra rom til lange titler (f.eks. «Innspillingsleder»). */
const meetTdFunction = cn(meetTd, "min-w-0 break-words");

const tableShell =
  "w-full table-fixed border-collapse border border-neutral-300 text-neutral-900";

/** Timeplan: time columns — stronger scan line */
const thTime = cn(thNum, "bg-neutral-200/90");
const tdTime = cn(
  tdNum,
  "whitespace-nowrap bg-neutral-50/80 font-medium text-neutral-950"
);

/** Lunsj-rad: rød tekst på print (info = «Lunsj»). */
const lunchPrintText = "text-red-700 print:text-red-800";
const lunchPrintTimeBg = "bg-red-50/40 print:bg-red-50/50";

export default async function DagsplanPrintPage({ params }: PageProps) {
  const { id } = await params;
  const d = await getDagsplanById(id);
  if (!d) notFound();

  const agencyLogo = d.agencyLogoUrl || d.project.agency?.logoUrl || null;
  const clientLogo = d.clientLogoUrl || d.project.customer?.logoUrl || null;

  const crewMeetChunks =
    d.crewEntries.length > 0 ? chunkCrewMeetForPrint(d.crewEntries) : [];
  const showShotColumn = d.showShotColumn === true;
  const printLocale = parseDagsplanLocale(d.displayLocale);
  const pt = getDagsplanPrintStrings(printLocale);
  const onSetPrint = pt.onSet.replace(/\s+/g, "\u00A0");

  return (
    <div className="dagsplan-print mx-auto max-w-[210mm] px-6 py-10 text-[11px] leading-relaxed text-neutral-900 antialiased print:max-w-none print:px-0 print:py-0 print:text-[10px]">
      <PrintToolbar backHref={`/dagsplaner/${d.id}`} />

      {/* Rad 1: alle tre logoer på samme linje. Rad 2: tittel + metadata (hero). */}
      <header className="mb-8 border-b border-neutral-200 pb-4 print:mb-6 print:pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5 print:gap-4">
          <div className="flex items-center justify-start">
            {sanitizePublicImageUrl(agencyLogo) ? (
              <PublicLogoImg
                src={agencyLogo}
                alt=""
                className="max-h-14 max-w-full object-contain object-left print:max-h-12"
              />
            ) : (
              <span className="text-neutral-300"> </span>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={APARENT_LOGO_PUBLIC_PATH}
              alt=""
              className="h-10 w-auto object-contain print:h-9"
            />
          </div>
          <div className="flex items-center justify-end">
            {sanitizePublicImageUrl(clientLogo) ? (
              <PublicLogoImg
                src={clientLogo}
                alt=""
                className="max-h-14 max-w-full object-contain object-right print:max-h-12"
              />
            ) : (
              <span className="text-neutral-300"> </span>
            )}
          </div>
        </div>

        <div className="mt-[60px] flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-sm leading-snug text-neutral-600 print:mt-[60px] print:flex-nowrap print:gap-x-3 print:text-[11px]">
          <h1 className="min-w-0 max-w-full text-balance font-bold tracking-tight">
            <span className="font-normal text-neutral-600">{d.project.name}</span>
            <span className="font-normal text-neutral-600"> · </span>
            <span className="text-neutral-950">{d.title}</span>
          </h1>
          <span className="shrink-0 text-neutral-300" aria-hidden>
            ·
          </span>
          <span className="shrink-0 tabular-nums">
            {formatDate(d.shootDate)}
          </span>
          {d.workStartTime?.trim() || d.workEndTime?.trim() ? (
            <>
              <span className="shrink-0 text-neutral-300" aria-hidden>
                ·
              </span>
              <span className="shrink-0">
                {pt.workHours}: {fmtTime(d.workStartTime)} –{" "}
                {fmtTime(d.workEndTime)}
              </span>
            </>
          ) : null}
        </div>
      </header>

      <div className="divide-y divide-neutral-200">
        {/* Locations — full width, to kolonner */}
        <section className="pb-[20px]">
          <div className="min-w-0">
            {d.locations.length ? (
              <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 print:grid-cols-2 print:gap-x-4 print:gap-y-4">
                {d.locations.map((loc, i) => (
                  <div key={loc.id} className="min-w-0">
                    <h2 className={cn(secTitle, "mb-2 print:mb-1.5")}>
                      {pt.location}
                      {d.locations.length > 1 ? ` ${i + 1}` : ""}
                    </h2>
                    {cellText(loc.locationName) ? (
                      <p
                        className={cn(
                          locationBodyClass,
                          "mb-1 font-semibold text-neutral-950 print:mb-0.5",
                        )}
                      >
                        {cellText(loc.locationName)}
                      </p>
                    ) : null}
                    <LocationTextWithMapsLink
                      locationText={loc.locationText}
                      mapsUrl={loc.locationMapsUrl}
                      googleMapsLabel={pt.googleMaps}
                    />
                    <h3 className="mt-[10px] text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-500 print:mt-[10px] print:text-[8px]">
                      {pt.parkingTransport}
                    </h3>
                    <p
                      className={cn(
                        locationBodyClass,
                        "mt-1.5 whitespace-pre-wrap print:mt-1",
                      )}
                    >
                      {cellText(loc.parkingText)}
                    </p>
                    <div className="mt-1.5 print:mt-1">
                      <MapsLink label={pt.parkingMaps} url={loc.parkingMapsUrl} />
                    </div>
                    {loc.parkingImageUrl?.trim() ? (
                      <p className="mt-1.5 text-[10px] font-medium italic leading-snug text-neutral-600 print:mt-1 print:text-[9px] print:leading-tight">
                        {pt.parkingImageNote}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                <h2 className={secTitle}>{pt.location}</h2>
                <p className="min-h-[1em] text-[11px] print:text-[10px]" />
              </div>
            )}
          </div>
        </section>

        <section className={cn("min-w-0", printSectionPadY)}>
          <h2 className={secTitle}>{pt.callTime}</h2>
          <div
            className={cn(
              "grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 sm:gap-x-5 print:grid-cols-2 print:gap-x-4 print:gap-y-4",
              crewMeetChunks.length === 1 && "sm:grid-cols-1 print:grid-cols-1",
            )}
          >
            {crewMeetChunks.length === 0 ? (
              <div className="min-w-0 w-full">
                <table
                  className={cn(tableShell, "min-w-0 sm:max-w-full print:max-w-full")}
                >
                  <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[32%]" />
                    <col className="w-[30%]" />
                    <col
                      className={meetOnSetCol}
                      style={{ width: "2.875rem", maxWidth: "2.875rem" }}
                    />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(meetTh, "w-[24%]")}>{pt.function}</th>
                      <th className={cn(meetTh, "w-[32%]")}>{pt.name}</th>
                      <th className={cn(meetTh, "w-[30%]")}>{pt.mobile}</th>
                      <th className={meetThOnSet} aria-label={pt.onSet}>
                        <span
                          className="block whitespace-nowrap text-center leading-tight"
                          aria-hidden
                        >
                          {onSetPrint}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} className={meetTd} />
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              crewMeetChunks.map((chunk, chunkIndex) => (
                <div
                  key={chunk[0]?.id ?? `crew-${chunkIndex}`}
                  className="min-w-0 w-full"
                >
                  <table className={cn(tableShell, "min-w-0")}>
                    <colgroup>
                      <col className="w-[24%]" />
                      <col className="w-[32%]" />
                      <col className="w-[30%]" />
                      <col
                        className={meetOnSetCol}
                        style={{ width: "2.875rem", maxWidth: "2.875rem" }}
                      />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(meetTh, "w-[24%]")}>{pt.function}</th>
                        <th className={cn(meetTh, "w-[32%]")}>{pt.name}</th>
                        <th className={cn(meetTh, "w-[30%]")}>{pt.mobile}</th>
                        <th className={meetThOnSet} aria-label={pt.onSet}>
                          <span
                            className="block whitespace-nowrap text-center leading-tight"
                            aria-hidden
                          >
                            {onSetPrint}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.map((r) => (
                        <tr key={r.id}>
                          <td className={meetTdFunction}>
                            {crewFunctionForPrint(
                              r.departmentTitle,
                              printLocale,
                            )}
                          </td>
                          <td className={meetTd}>{cellText(r.personName)}</td>
                          <td className={meetTdMobile}>{cellText(r.mobile)}</td>
                          <td className={meetTdOnSet}>
                            {fmtTime(r.onSetTime)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </section>

        {d.printIncludeActors ? (
          <section className={printSectionPadY}>
            <h2 className={secTitle}>{pt.cast}</h2>
            <table className={tableShell}>
              <thead>
                <tr>
                  <th className={cn(thNum, "w-[7%]")}>{pt.nr}</th>
                  <th className={cn(thBase, "w-[22%]")}>{pt.name}</th>
                  <th className={cn(thBase, "w-[18%]")}>{pt.phone}</th>
                  <th className={cn(thBase, "w-[14%]")}>{pt.film}</th>
                  <th className={thNum}>{pt.meet}</th>
                  <th className={thNum}>{pt.readyOnSet}</th>
                </tr>
              </thead>
              <tbody>
                {d.actorEntries.length ? (
                  d.actorEntries.map((r) => (
                    <tr key={r.id}>
                      <td className={tdNum}>{cellText(r.actorNumber)}</td>
                      <td className={tdBase}>{cellText(r.actorName)}</td>
                      <td className={tdBase}>{cellText(r.phone)}</td>
                      <td className={tdBase}>{cellText(r.film)}</td>
                      <td className={tdNum}>{fmtTime(r.meetTime)}</td>
                      <td className={tdNum}>{fmtTime(r.readyOnSetTime)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className={tdBase} />
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        ) : null}

        <section className={printSectionPadY}>
          <h2 className={secTitle}>{pt.schedule}</h2>
          <p className="mb-2 text-[11px] leading-snug text-neutral-700 print:text-[10px]">
            <span className="font-semibold">{pt.sunrise}:</span>{" "}
            <span className="tabular-nums">
              {effectiveSunriseDisplay(
                d.shootDate.toISOString().slice(0, 10),
                d.sunriseTimeOverride,
              )}
            </span>
            <span className="mx-2 text-neutral-400">·</span>
            <span className="font-semibold">{pt.sunset}:</span>{" "}
            <span className="tabular-nums">
              {effectiveSunsetDisplay(
                d.shootDate.toISOString().slice(0, 10),
                d.sunsetTimeOverride,
              )}
            </span>
          </p>
          <table className={tableShell}>
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              {/* Shot: bred nok kolonne — ellers skaleres bildet ned av smal celle (object-contain). */}
              {showShotColumn ? <col className="w-[20%]" /> : null}
              <col className={showShotColumn ? "w-[17%]" : "w-[37%]"} />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr>
                <th className={thTime}>{pt.from}</th>
                <th className={thTime}>{pt.to}</th>
                <th className={thBase}>I/E</th>
                <th className={thBase}>D/N</th>
                <th className={thBase}>{pt.info}</th>
                <th className={thNum}>{pt.duration}</th>
                {showShotColumn ? (
                  <th className={cn(thBase, "text-center")}>{pt.shot}</th>
                ) : null}
                <th className={thBase}>{pt.sceneSetting}</th>
                <th className={cn(thNum, "whitespace-nowrap")}>{pt.actors}</th>
              </tr>
            </thead>
            <tbody>
              {d.scheduleEntries.length ? (
                d.scheduleEntries.map((r) => {
                  const lunch = isScheduleLunchRow(r);
                  const rowBg = normalizeScheduleRowBgColor(r.rowBgColor ?? "");
                  return (
                    <tr
                      key={r.id}
                      style={
                        rowBg ? { backgroundColor: rowBg } : undefined
                      }
                    >
                      <td
                        className={cn(
                          tdTime,
                          lunch && lunchPrintText,
                          lunch && lunchPrintTimeBg,
                        )}
                      >
                        {fmtTime(r.startTime)}
                      </td>
                      <td
                        className={cn(
                          tdTime,
                          lunch && lunchPrintText,
                          lunch && lunchPrintTimeBg,
                        )}
                      >
                        {isScheduleCallTimeRow(r) || isScheduleWrapRow(r)
                          ? ""
                          : fmtTime(r.endTime)}
                      </td>
                      <td
                        className={cn(
                          tdBase,
                          lunch && lunchPrintText,
                          isInteriorTruck(r.interiorExterior) && "text-center",
                        )}
                      >
                        {isInteriorTruck(r.interiorExterior) ? (
                          <Truck
                            className="mx-auto inline-block h-3.5 w-3.5 text-foreground print:text-black"
                            strokeWidth={2}
                            aria-hidden
                          />
                        ) : (
                          cellText(r.interiorExterior)
                        )}
                      </td>
                      <td className={cn(tdBase, lunch && lunchPrintText)}>
                        {cellText(r.dayNight)}
                      </td>
                      <td className={cn(tdBase, lunch && lunchPrintText)}>
                        {cellText(r.info)}
                      </td>
                      <td
                        className={cn(
                          tdNum,
                          lunch && lunchPrintText,
                          lunch && lunchPrintTimeBg,
                        )}
                      >
                        {fmtScheduleDurationMinutes(r)}
                      </td>
                      {showShotColumn ? (
                        <td
                          className={cn(
                            tdBase,
                            "p-1.5 align-middle text-center print:p-1.5",
                            lunch && lunchPrintText,
                          )}
                        >
                          {sanitizePublicImageUrl(r.shotImageUrl) ? (
                            <PublicLogoImg
                              src={r.shotImageUrl}
                              alt=""
                              className="mx-auto block h-auto w-full max-h-80 object-contain object-center"
                            />
                          ) : null}
                        </td>
                      ) : null}
                      <td className={cn(tdBase, lunch && lunchPrintText)}>
                        {cellText(r.sceneSetting)}
                      </td>
                      <td className={cn(tdNum, lunch && lunchPrintText)}>
                        {cellText(r.actorNumbers)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={showShotColumn ? 9 : 8}
                    className={tdBase}
                  />
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Info / vær — under timeplan */}
        <section className={printSectionPadY}>
          <div className="min-w-0 max-w-none space-y-2.5">
            <h2 className={secTitle}>{pt.infoWeather}</h2>
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-800 print:text-[10px]">
              {cellText(d.infoText)}
            </p>
            <DagsplanWeatherCard
              variant="print"
              className="mt-4 max-w-xl"
              weatherIcon={d.weatherIcon}
              weatherTempMin={d.weatherTempMin}
              weatherTempMax={d.weatherTempMax}
              weatherText={d.weatherText}
            />
          </div>
        </section>

        {d.printIncludeDepartmentInfo ? (
          <section className={printSectionPadY}>
            <h2 className={secTitle}>{pt.deptInfo}</h2>
            <table className={tableShell}>
              <thead>
                <tr>
                  <th className={cn(thBase, "w-[30%]")}>{pt.department}</th>
                  <th className={thBase}>{pt.info}</th>
                </tr>
              </thead>
              <tbody>
                {d.departmentInfos.length ? (
                  d.departmentInfos.map((r) => (
                    <tr key={r.id}>
                      <td className={cn(tdBase, "font-medium text-neutral-950")}>
                        {cellText(r.departmentName)}
                      </td>
                      <td className={cn(tdBase, "whitespace-pre-wrap")}>
                        {cellText(r.info)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className={tdBase} />
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>

      <footer className="mt-12 border-t border-neutral-200 pt-8 print:mt-10 print:pt-6">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-12 print:grid-cols-2 print:gap-10">
          <div className="space-y-2">
            <h3 className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-[8px]">
              {pt.emergencyNumbers}
            </h3>
            <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-neutral-800 print:text-[9px]">
              {cellText(d.emergencyNumbersText)}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-[8px]">
              {pt.radioChannels}
            </h3>
            <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-neutral-800 print:text-[9px]">
              {cellText(d.radioChannelsText)}
            </p>
          </div>
        </div>
      </footer>

      {d.locations.map((loc, i) =>
        sanitizePublicImageUrl(loc.parkingImageUrl) ? (
          <section
            key={loc.id}
            className="dagsplan-print-parking-attachment mx-auto max-w-[210mm] px-6 py-10 print:max-w-none print:px-0 print:py-0"
            aria-label={
              d.locations.length > 1
                ? pt.parkingAttachmentAriaLocationTemplate.replace(
                    "{n}",
                    String(i + 1),
                  )
                : pt.parkingAttachmentAria
            }
          >
            <div className="flex min-h-[calc(100vh-24mm)] flex-col print:min-h-[calc(297mm-24mm)]">
              <h2 className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 print:mb-1 print:text-[9px]">
                {d.locations.length > 1
                  ? pt.parkingSketchLocationTemplate.replace(
                      "{n}",
                      String(i + 1),
                    )
                  : pt.parkingSketch}
              </h2>
              <div className="flex w-full justify-center">
                <PublicLogoImg
                  src={loc.parkingImageUrl}
                  alt="Parking"
                  className="max-h-[min(1000px,calc(100vh-120px))] w-full max-w-full object-contain object-center print:max-h-[calc(297mm-40mm)]"
                />
              </div>
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
