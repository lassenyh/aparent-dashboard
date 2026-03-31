import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDagsplanById } from "@/actions/dagsplan";
import { DagsplanWeatherCard } from "@/components/dagsplan/dagsplan-weather-card";
import { PrintToolbar } from "@/components/print-toolbar";
import { APARENT_LOGO_PUBLIC_PATH } from "@/lib/dagsplan-defaults";
import {
  inferDurationMinutes,
  isScheduleLunchRow,
} from "@/lib/schedule-rows";
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
}): string {
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

/** Korte titler på utskrift (full tekst i redigeringsvisning). */
function abbreviateCrewFunctionForPrint(raw: string | null | undefined): string {
  const t = cellText(raw);
  if (!t) return "";
  const norm = t.toLowerCase().replace(/[-\s]+/g, "");
  if (norm === "produksjonsassistent") return "Prodass";
  if (norm === "produksjonsleder") return "Prodleder";
  return t;
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
}: {
  locationText: string | null | undefined;
  mapsUrl: string | null | undefined;
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
            <span className="text-neutral-600"> (Google Maps)</span>
          </>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            (Google Maps)
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

/** Fast bredde så kolonnen ikke suger restbredde (table-fixed + %). */
const meetOnSetCol = "w-[2.75rem] min-w-0 max-w-[2.75rem]";

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

  return (
    <div className="dagsplan-print mx-auto max-w-[210mm] px-6 py-10 text-[11px] leading-relaxed text-neutral-900 antialiased print:max-w-none print:px-0 print:py-0 print:text-[10px]">
      <PrintToolbar backHref={`/dagsplaner/${d.id}`} />

      {/* Rad 1: alle tre logoer på samme linje. Rad 2: tittel + metadata (hero). */}
      <header className="mb-8 border-b border-neutral-200 pb-4 print:mb-6 print:pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5 print:gap-4">
          <div className="flex items-center justify-start">
            {agencyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
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
            {clientLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
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
                Arbeidstid: {fmtTime(d.workStartTime)} – {fmtTime(d.workEndTime)}
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
                      Location{d.locations.length > 1 ? ` ${i + 1}` : ""}
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
                    />
                    <h3 className="mt-[10px] text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-500 print:mt-[10px] print:text-[8px]">
                      Parking / transport
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
                      <MapsLink label="Parking maps" url={loc.parkingMapsUrl} />
                    </div>
                    {loc.parkingImageUrl?.trim() ? (
                      <p className="mt-1.5 text-[10px] font-medium italic leading-snug text-neutral-600 print:mt-1 print:text-[9px] print:leading-tight">
                        Bildebeskrivelse vedlagt
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                <h2 className={secTitle}>Location</h2>
                <p className="min-h-[1em] text-[11px] print:text-[10px]" />
              </div>
            )}
          </div>
        </section>

        <section className={cn("min-w-0", printSectionPadY)}>
          <h2 className={secTitle}>Oppmøtetid</h2>
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
                    <col className="w-[22%]" />
                    <col className="w-[40%]" />
                    <col className="w-[20%]" />
                    <col
                      className={meetOnSetCol}
                      style={{ width: "2.75rem", maxWidth: "2.75rem" }}
                    />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(meetTh, "w-[22%]")}>Funksjon</th>
                      <th className={cn(meetTh, "w-[40%]")}>Navn</th>
                      <th className={cn(meetTh, "w-[20%]")}>Mobil</th>
                      <th className={meetThOnSet} aria-label="På sett">
                        <span
                          className="block whitespace-nowrap text-center leading-tight"
                          aria-hidden
                        >
                          {"PÅ\u00A0SET"}
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
                      <col className="w-[22%]" />
                      <col className="w-[40%]" />
                      <col className="w-[20%]" />
                      <col
                        className={meetOnSetCol}
                        style={{ width: "2.75rem", maxWidth: "2.75rem" }}
                      />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(meetTh, "w-[22%]")}>Funksjon</th>
                        <th className={cn(meetTh, "w-[40%]")}>Navn</th>
                        <th className={cn(meetTh, "w-[20%]")}>Mobil</th>
                        <th className={meetThOnSet} aria-label="På sett">
                          <span
                            className="block whitespace-nowrap text-center leading-tight"
                            aria-hidden
                          >
                            {"PÅ\u00A0SET"}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.map((r) => (
                        <tr key={r.id}>
                          <td className={meetTd}>
                            {abbreviateCrewFunctionForPrint(r.departmentTitle)}
                          </td>
                          <td className={meetTd}>{cellText(r.personName)}</td>
                          <td className={meetTd}>{cellText(r.mobile)}</td>
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
            <h2 className={secTitle}>Aktører</h2>
            <table className={tableShell}>
              <thead>
                <tr>
                  <th className={cn(thNum, "w-[7%]")}>Nr</th>
                  <th className={cn(thBase, "w-[22%]")}>Navn</th>
                  <th className={cn(thBase, "w-[18%]")}>Tlf</th>
                  <th className={cn(thBase, "w-[14%]")}>Film</th>
                  <th className={thNum}>Oppmøte</th>
                  <th className={thNum}>Klar på sett</th>
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
          <h2 className={secTitle}>Timeplan</h2>
          <table className={tableShell}>
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              <col className="w-[37%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr>
                <th className={thTime}>Fra</th>
                <th className={thTime}>Til</th>
                <th className={thBase}>I/E</th>
                <th className={thBase}>D/N</th>
                <th className={thBase}>Info</th>
                <th className={thNum}>Varighet</th>
                <th className={thBase}>Scene / setting</th>
                <th className={cn(thNum, "whitespace-nowrap")}>Aktør(er)</th>
              </tr>
            </thead>
            <tbody>
              {d.scheduleEntries.length ? (
                d.scheduleEntries.map((r) => {
                  const lunch = isScheduleLunchRow(r);
                  return (
                    <tr key={r.id}>
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
                        {fmtTime(r.endTime)}
                      </td>
                      <td className={cn(tdBase, lunch && lunchPrintText)}>
                        {cellText(r.interiorExterior)}
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
                  <td colSpan={8} className={tdBase} />
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Info / vær — under timeplan */}
        <section className={printSectionPadY}>
          <div className="min-w-0 max-w-none space-y-2.5">
            <h2 className={secTitle}>Info / vær</h2>
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
            <h2 className={secTitle}>Avdelingsinfo</h2>
            <table className={tableShell}>
              <thead>
                <tr>
                  <th className={cn(thBase, "w-[30%]")}>Avdeling</th>
                  <th className={thBase}>Info</th>
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
              Nødnummer
            </h3>
            <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-neutral-800 print:text-[9px]">
              {cellText(d.emergencyNumbersText)}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500 print:text-[8px]">
              Radiokanaler
            </h3>
            <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-neutral-800 print:text-[9px]">
              {cellText(d.radioChannelsText)}
            </p>
          </div>
        </div>
      </footer>

      {d.locations.map((loc, i) =>
        loc.parkingImageUrl?.trim() ? (
          <section
            key={loc.id}
            className="dagsplan-print-parking-attachment mx-auto max-w-[210mm] px-6 py-10 print:max-w-none print:px-0 print:py-0"
            aria-label={
              d.locations.length > 1
                ? `Parking — location ${i + 1}`
                : "Parking — attachment"
            }
          >
            <div className="flex min-h-[calc(100vh-24mm)] flex-col print:min-h-[calc(297mm-24mm)]">
              <h2 className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 print:mb-1 print:text-[9px]">
                {d.locations.length > 1
                  ? `Parking / sketch — location ${i + 1}`
                  : "Parking / sketch"}
              </h2>
              <div className="flex w-full justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
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
