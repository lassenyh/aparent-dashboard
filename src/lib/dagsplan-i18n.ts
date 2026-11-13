/**
 * Språk for dagsplan-editor og print (UI + rolleoversettelser).
 */

export type DagsplanLocale = "no" | "en";

export function parseDagsplanLocale(v: unknown): DagsplanLocale {
  return v === "en" ? "en" : "no";
}

/** Normaliser rolle-tittel for oppslag (små bokstaver, bindestrek/space fjernet). */
function normRoleKey(s: string): string {
  return s.trim().toLowerCase().replace(/[-\s_]+/g, "");
}

/**
 * Norsk rolle → engelsk visning (brukerliste + vanlige varianter).
 * Ukjente titler returneres uendret.
 */
export function translateCrewDepartmentTitle(
  raw: string | null | undefined,
  locale: DagsplanLocale,
): string {
  const t = raw?.trim() ?? "";
  if (!t || locale === "no") return t;
  const k = normRoleKey(t);
  const map: Record<string, string> = {
    produsent: "Producer",
    regissør: "Director",
    regissor: "Director",
    bfoto: "Focus Puller",
    "bfotograf": "Focus Puller",
    innspillingsleder: "1AD",
    lysmester: "Gaffer",
    lysassistent: "Best boy",
    lysmeister: "Gaffer",
    mua: "MUA",
    makeup: "MUA",
    prodleder: "Prod manager",
    produksjonsleder: "Prod manager",
    kostyme: "Costume",
    produksjonsassistent: "PA",
  };
  return map[k] ?? t;
}

/** Kort form til print (crew-funksjon), avhengig av språk. */
export function crewFunctionForPrint(
  raw: string | null | undefined,
  locale: DagsplanLocale,
): string {
  const t = raw?.trim() ?? "";
  if (!t) return "";
  if (locale === "no") {
    const norm = normRoleKey(t);
    if (norm === "produksjonsassistent") return "Prodass";
    if (norm === "produksjonsleder") return "Prodleder";
    return t;
  }
  return translateCrewDepartmentTitle(t, "en");
}

export type DagsplanEditorT = {
  language: string;
  langNo: string;
  langEn: string;
  previewPrint: string;
  previewDialogHint: string;
  previewDownloadPdf: string;
  previewDownloadingPdf: string;
  previewLoading: string;
  previewLoadError: string;
  previewRetry: string;
  collapseSection: string;
  expandSection: string;
  duplicate: string;
  save: string;
  saveAll: string;
  saving: string;
  branding: string;
  planDetails: string;
  agencyLogo: string;
  clientLogo: string;
  uploadAgencyLogo: string;
  uploadClientLogo: string;
  upload: string;
  uploadEllipsis: string;
  removeLogo: string;
  removingLogo: string;
  emptyLogoHint: string;
  title: string;
  shootDate: string;
  workFrom: string;
  workTo: string;
  /** Arbeid fra/til settes fra timeplan */
  workHoursAuto: string;
  /** Når timeplan er ekskludert fra print */
  workHoursManual: string;
  locations: string;
  newLocation: string;
  noLocationsHint: string;
  locationAdded: string;
  locationRemoved: string;
  infoWeather: string;
  generalInfo: string;
  weatherForecastLocation: string;
  weatherSearchPlaceholder: string;
  weatherFetch: string;
  weatherFetching: string;
  weatherFetched: string;
  weatherFetchError: string;
  weatherNeedLocation: string;
  weatherForecastHint: string;
  weatherAttribution: string;
  weatherLocationSelected: string;
  weatherSelectedLocation: string;
  weatherNoSelectedLocation: string;
  weatherSuggestion: string;
  weatherAddSuggestion: string;
  weatherSuggestionAdded: string;
  weatherIcon: string;
  pickIcon: string;
  minTemp: string;
  maxTemp: string;
  weatherNotes: string;
  weatherPreviewHint: string;
  crewMeet: string;
  crewMeetIntro: string;
  addFromCrewDb: string;
  addFromProjectCrew: string;
  pickPerson: string;
  pick: string;
  crewFunction: string;
  crewName: string;
  crewMobile: string;
  crewEmail: string;
  crewOnSet: string;
  crewOnSetAll: string;
  crewApplyOnSetAll: string;
  crewRow: string;
  /** Oppmøtetid: åpne e-postklient med alle i listen som mottakere */
  sendCrewEmail: string;
  /** Tooltip når ingen har e-post */
  sendCrewEmailNeedAddresses: string;
  actors: string;
  excludeFromPrint: string;
  actorNr: string;
  actorName: string;
  actorPhone: string;
  actorFilm: string;
  actorMeet: string;
  actorReadyOnSet: string;
  schedule: string;
  optionalScheduleColumns: string;
  optionalScheduleColumnsHint: string;
  showShotColumn: string;
  showInteriorExteriorColumn: string;
  showDayNightColumn: string;
  showActorColumn: string;
  showCostumeColumn: string;
  addScheduleRows: string;
  addCallTime: string;
  addRow: string;
  addUntimedRow: string;
  addLunch: string;
  /** Timeplan: legg til rad med forhåndsutfylt info/scene fra valgt location */
  addCompanyMove: string;
  /** Når det finnes locations: manuelt felt under listen */
  companyMoveManualOr: string;
  /** Når det ikke finnes locations: forklaring før manuelt felt */
  companyMoveManualHint: string;
  companyMoveManualPlaceholder: string;
  addPrerigg: string;
  addRecording: string;
  addPreWrap: string;
  addWrap: string;
  deptInfo: string;
  deptName: string;
  deptInfoCol: string;
  emergencyRadio: string;
  emergency: string;
  radio: string;
  deletePlan: string;
  confirmDeletePlan: string;
  toastSaved: string;
  toastLogoUploaded: string;
  toastLocationSaved: string;
  toastCrewRowAdded: string;
  toastCrewRowFromDb: string;
  toastLocationAdded: string;
  toastLocationRemoved: string;
};

const editorNo: DagsplanEditorT = {
  language: "Språk",
  langNo: "Norsk",
  langEn: "English",
  previewPrint: "Forhåndsvisning / print",
  previewDialogHint: "Forhåndsvisning av lagret dagsplan.",
  previewDownloadPdf: "Last ned PDF",
  previewDownloadingPdf: "Forbereder PDF…",
  previewLoading: "Forbereder PDF-forhåndsvisning…",
  previewLoadError:
    "Forhåndsvisningen brukte for lang tid eller kunne ikke lastes inn.",
  previewRetry: "Prøv igjen",
  collapseSection: "Skjul",
  expandSection: "Vis",
  duplicate: "Dupliser",
  save: "Lagre",
  saveAll: "Lagre alle endringer",
  saving: "Lagrer…",
  branding: "Branding",
  planDetails: "Dagsplaninfo",
  agencyLogo: "Byrålogo",
  clientLogo: "Kundelogo",
  uploadAgencyLogo: "Last opp byrålogo",
  uploadClientLogo: "Last opp kundelogo",
  upload: "Last opp",
  uploadEllipsis: "…",
  removeLogo: "Fjern logo",
  removingLogo: "Fjerner…",
  emptyLogoHint:
    "Tom visning bruker prosjektets byrå-/kundelogo som forslag.",
  title: "Tittel",
  shootDate: "Innspillingsdato",
  workFrom: "Arbeid fra",
  workTo: "Arbeid til",
  workHoursAuto:
    "Settes automatisk fra tidligste start- og seneste sluttid i timeplan.",
  workHoursManual:
    "Fylles manuelt — timeplan er ikke med på utskrift, så arbeidstid styres ikke fra tabellen.",
  locations: "Locations",
  newLocation: "+ Ny location",
  noLocationsHint:
    "Ingen locations ennå. Bruk «Ny location» for å legge til adresse, kart, parkering og parkeringsbilde.",
  locationAdded: "Location lagt til",
  locationRemoved: "Location fjernet",
  infoWeather: "Info og vær",
  generalInfo: "Generell info",
  weatherForecastLocation: "Lokasjon for værvarsel",
  weatherSearchPlaceholder: "Søk…",
  weatherFetch: "Hent værvarsel",
  weatherFetching: "Henter vær…",
  weatherFetched: "Værvarselet er hentet",
  weatherFetchError: "Kunne ikke hente værvarselet. Prøv igjen.",
  weatherNeedLocation:
    "Søk og velg en egen værlokasjon først.",
  weatherForecastHint:
    "Fyller inn min/maks temperatur og ikon. En valgfri værmerknad foreslås uten å overskrive friteksten.",
  weatherAttribution: "Værdata fra MET Norway",
  weatherLocationSelected: "Værlokasjonen er valgt.",
  weatherSelectedLocation: "Valgt værlokasjon",
  weatherNoSelectedLocation: "Ingen valgt",
  weatherSuggestion: "Forslag til værmerknad",
  weatherAddSuggestion: "Legg til i merknad",
  weatherSuggestionAdded: "Værmerknaden er lagt til",
  weatherIcon: "Vær (ikon)",
  pickIcon: "Velg ikon",
  minTemp: "Min temp (°C)",
  maxTemp: "Max temp (°C)",
  weatherNotes: "Vær / merknader (fritekst)",
  weatherPreviewHint: "Forhåndsvisning (som på print)",
  crewMeet: "Stab og oppmøtetid",
  crewMeetIntro:
    "Stabsliste: funksjon, navn, mobil og e-post (som ved import). Velg fra crew-database eller fra prosjektcrew — eller fyll inn for hånd.",
  addFromCrewDb: "Legg til fra crew-database",
  addFromProjectCrew: "Legg til fra prosjektcrew",
  pickPerson: "Velg person…",
  pick: "Velg…",
  crewFunction: "Funksjon",
  crewName: "Navn",
  crewMobile: "Mobil",
  crewEmail: "E-post",
  crewOnSet: "På sett",
  crewOnSetAll: "Felles på sett",
  crewApplyOnSetAll: "Bruk på alle",
  crewRow: "+ Rad",
  sendCrewEmail: "Send e-post",
  sendCrewEmailNeedAddresses:
    "Legg inn minst én e-postadresse i tabellen for å sende til alle.",
  actors: "Aktører",
  excludeFromPrint: "Ekskluder fra utskrift",
  actorNr: "Nr",
  actorName: "Navn",
  actorPhone: "Tlf",
  actorFilm: "Film",
  actorMeet: "Oppmøte",
  actorReadyOnSet: "Klar på sett",
  schedule: "Timeplan",
  optionalScheduleColumns: "Valgfrie kolonner",
  optionalScheduleColumnsHint:
    "Vis eller skjul kolonner uten å slette innholdet som allerede er lagret.",
  showShotColumn: "Vis bildekolonne",
  showInteriorExteriorColumn: "I/E",
  showDayNightColumn: "D/N",
  showActorColumn: "Aktører",
  showCostumeColumn: "Kostyme",
  addScheduleRows: "Legg til rader",
  addCallTime: "Call time",
  addRow: "Rad",
  addUntimedRow: "Uten tid",
  addLunch: "Lunsj",
  addCompanyMove: "Company move",
  companyMoveManualOr: "Eller skriv adresse manuelt:",
  companyMoveManualHint:
    "Ingen lagrede locations — skriv adressen i feltet under (scene/adresse på raden).",
  companyMoveManualPlaceholder: "Adresse",
  addPrerigg: "Prerigg",
  addRecording: "Opptak",
  addPreWrap: "Pre-wrap",
  addWrap: "Wrap",
  deptInfo: "Avdelingsinfo",
  deptName: "Avdeling",
  deptInfoCol: "Info",
  emergencyRadio: "Nødnummer og radio",
  emergency: "Nødnummer",
  radio: "Radiokanaler",
  deletePlan: "Slett dagsplan",
  confirmDeletePlan: "Slette denne dagsplanen?",
  toastSaved: "Lagret",
  toastLogoUploaded: "Logo lastet opp",
  toastLocationSaved: "Lagret",
  toastCrewRowAdded: "Rad lagt til",
  toastCrewRowFromDb: "Rad lagt til fra crew-database",
  toastLocationAdded: "Location lagt til",
  toastLocationRemoved: "Location fjernet",
};

const editorEn: DagsplanEditorT = {
  language: "Language",
  langNo: "Norwegian",
  langEn: "English",
  previewPrint: "Preview / print",
  previewDialogHint: "Preview of the saved day plan.",
  previewDownloadPdf: "Download PDF",
  previewDownloadingPdf: "Preparing PDF…",
  previewLoading: "Preparing PDF preview…",
  previewLoadError: "The preview took too long or could not be loaded.",
  previewRetry: "Try again",
  collapseSection: "Collapse",
  expandSection: "Expand",
  duplicate: "Duplicate",
  save: "Save",
  saveAll: "Save all changes",
  saving: "Saving…",
  branding: "Branding",
  planDetails: "Day plan details",
  agencyLogo: "Agency logo",
  clientLogo: "Client logo",
  uploadAgencyLogo: "Upload agency logo",
  uploadClientLogo: "Upload client logo",
  upload: "Upload",
  uploadEllipsis: "…",
  removeLogo: "Remove logo",
  removingLogo: "Removing…",
  emptyLogoHint:
    "When empty, the project’s agency/client logos are used as a fallback.",
  title: "Title",
  shootDate: "Shoot date",
  workFrom: "Work from",
  workTo: "Work to",
  workHoursAuto:
    "Set automatically from the earliest start and latest end in the schedule.",
  workHoursManual:
    "Enter manually — the schedule is excluded from print, so work hours are not taken from the table.",
  locations: "Locations",
  newLocation: "+ New location",
  noLocationsHint:
    "No locations yet. Use “New location” to add address, maps, parking and parking image.",
  locationAdded: "Location added",
  locationRemoved: "Location removed",
  infoWeather: "Info & weather",
  generalInfo: "General info",
  weatherForecastLocation: "Forecast location",
  weatherSearchPlaceholder: "Search…",
  weatherFetch: "Fetch weather forecast",
  weatherFetching: "Fetching weather…",
  weatherFetched: "Weather forecast fetched",
  weatherFetchError: "Could not fetch the weather forecast. Please try again.",
  weatherNeedLocation:
    "Search for and select a dedicated weather location first.",
  weatherForecastHint:
    "Fills in min/max temperature and icon. An optional weather note is suggested without replacing free text.",
  weatherAttribution: "Weather data from MET Norway",
  weatherLocationSelected: "Weather location selected.",
  weatherSelectedLocation: "Selected weather location",
  weatherNoSelectedLocation: "None selected",
  weatherSuggestion: "Suggested weather note",
  weatherAddSuggestion: "Add to notes",
  weatherSuggestionAdded: "Weather note added",
  weatherIcon: "Weather (icon)",
  pickIcon: "Choose icon",
  minTemp: "Min temp (°C)",
  maxTemp: "Max temp (°C)",
  weatherNotes: "Weather / notes",
  weatherPreviewHint: "Preview (as on print)",
  crewMeet: "Crew & call times",
  crewMeetIntro:
    "Crew list: role, name, mobile and email (as in import). Pick from crew database or project crew — or type manually.",
  addFromCrewDb: "Add from crew database",
  addFromProjectCrew: "Add from project crew",
  pickPerson: "Choose person…",
  pick: "Choose…",
  crewFunction: "Role",
  crewName: "Name",
  crewMobile: "Mobile",
  crewEmail: "Email",
  crewOnSet: "On set",
  crewOnSetAll: "Shared on-set time",
  crewApplyOnSetAll: "Apply to all",
  crewRow: "+ Row",
  sendCrewEmail: "Send email",
  sendCrewEmailNeedAddresses:
    "Add at least one email in the table to email everyone.",
  actors: "Cast",
  excludeFromPrint: "Exclude from print",
  actorNr: "No.",
  actorName: "Name",
  actorPhone: "Phone",
  actorFilm: "Film",
  actorMeet: "Call time",
  actorReadyOnSet: "Ready on set",
  schedule: "Schedule",
  optionalScheduleColumns: "Optional columns",
  optionalScheduleColumnsHint:
    "Show or hide columns without deleting content that is already saved.",
  showShotColumn: "Show image column",
  showInteriorExteriorColumn: "I/E",
  showDayNightColumn: "D/N",
  showActorColumn: "Cast",
  showCostumeColumn: "Costume",
  addScheduleRows: "Add rows",
  addCallTime: "Call time",
  addRow: "Row",
  addUntimedRow: "No time",
  addLunch: "Lunch",
  addCompanyMove: "Company move",
  companyMoveManualOr: "Or type an address manually:",
  companyMoveManualHint:
    "No saved locations — enter the address below (scene/address on the row).",
  companyMoveManualPlaceholder: "Address",
  addPrerigg: "Pre-rig",
  addRecording: "Shoot",
  addPreWrap: "Pre-wrap",
  addWrap: "Wrap",
  deptInfo: "Department info",
  deptName: "Department",
  deptInfoCol: "Info",
  emergencyRadio: "Emergency & radio",
  emergency: "Emergency numbers",
  radio: "Radio channels",
  deletePlan: "Delete day plan",
  confirmDeletePlan: "Delete this day plan?",
  toastSaved: "Saved",
  toastLogoUploaded: "Logo uploaded",
  toastLocationSaved: "Saved",
  toastCrewRowAdded: "Row added",
  toastCrewRowFromDb: "Row added from crew database",
  toastLocationAdded: "Location added",
  toastLocationRemoved: "Location removed",
};

export function getDagsplanEditorStrings(
  locale: DagsplanLocale,
): DagsplanEditorT {
  return locale === "en" ? editorEn : editorNo;
}

/** Schedule table (timeplan) */
export type ScheduleTableT = {
  sunrise: string;
  sunset: string;
  useOsloAuto: string;
  sunTimesManual: string;
  sunTimesAutoBeforeDate: string;
  sunTimesAutoAfterDate: string;
  from: string;
  to: string;
  info: string;
  durationMin: string;
  scene: string;
  actors: string;
  costume: string;
  shot: string;
  moveRow: string;
  anchorAuto: string;
  /** Kort merkelapp på fri-rad */
  freeRowShort: string;
  freeRow: string;
  untimedRow: string;
  totalPlanned: string;
  min: string;
  h: string;
  /** title på sol-tid inputs */
  osloHint: string;
  actions: string;
};

const scheduleNo: ScheduleTableT = {
  sunrise: "Soloppgang",
  sunset: "Solnedgang",
  useOsloAuto: "Bruk automatisk",
  sunTimesManual: "Manuelle tider — lagres på dagsplanen.",
  sunTimesAutoBeforeDate: "Automatisk fra {location} på opptaksdato (",
  sunTimesAutoAfterDate: ").",
  from: "Fra",
  to: "Til",
  info: "Info",
  durationMin: "Varighet",
  scene: "Scene / setting",
  actors: "Aktør(er)",
  costume: "Kostyme",
  shot: "Shot",
  moveRow: "Flytt og radfarge",
  anchorAuto: "Anker eller auto",
  freeRowShort: "Fri",
  freeRow: "Frifelt",
  untimedRow: "Uten tid",
  totalPlanned: "Totalt planlagt",
  min: "min",
  h: "t",
  osloHint: "Automatisk fra valgt værlokasjon. Kan overstyres manuelt.",
  actions: "Handlinger",
};

const scheduleEn: ScheduleTableT = {
  sunrise: "Sunrise",
  sunset: "Sunset",
  useOsloAuto: "Use automatic",
  sunTimesManual: "Manual times — saved on the day plan.",
  sunTimesAutoBeforeDate: "Automatic from {location} on shoot date (",
  sunTimesAutoAfterDate: ").",
  from: "From",
  to: "To",
  info: "Info",
  durationMin: "Duration",
  scene: "Scene / setting",
  actors: "Cast",
  costume: "Costume",
  shot: "Shot",
  moveRow: "Move & row colour",
  anchorAuto: "Anchor or auto",
  freeRowShort: "Free",
  freeRow: "Free row",
  untimedRow: "No time",
  totalPlanned: "Total planned",
  min: "min",
  h: "h",
  osloHint: "Automatic from the selected forecast location. Can be overridden manually.",
  actions: "Actions",
};

export function getScheduleTableStrings(locale: DagsplanLocale): ScheduleTableT {
  return locale === "en" ? scheduleEn : scheduleNo;
}

export type ShotDropzoneT = {
  shot: string;
  dropOrClick: string;
  replace: string;
  remove: string;
  removeEllipsis: string;
  uploading: string;
};

const shotNo: ShotDropzoneT = {
  shot: "Shot",
  dropOrClick: "Slipp bilde eller klikk",
  replace: "Bytt bilde",
  remove: "Fjern bilde",
  removeEllipsis: "Fjerner…",
  uploading: "…",
};

const shotEn: ShotDropzoneT = {
  shot: "Shot",
  dropOrClick: "Drop image or click",
  replace: "Replace image",
  remove: "Remove image",
  removeEllipsis: "Removing…",
  uploading: "…",
};

/** Utvid shot med toast-tekster */
export type ShotDropzoneStrings = ShotDropzoneT & {
  toastNotImage: string;
  toastTooBig: string;
  toastSaved: string;
  toastRemoved: string;
};

const shotStringsNo: ShotDropzoneStrings = {
  ...shotNo,
  toastNotImage: "Velg en bildefil",
  toastTooBig: "Bildet er for stort (maks 40 MB)",
  toastSaved: "Shot-bilde lagret",
  toastRemoved: "Shot-bilde fjernet",
};

const shotStringsEn: ShotDropzoneStrings = {
  ...shotEn,
  toastNotImage: "Choose an image file",
  toastTooBig: "Image too large (max 40 MB)",
  toastSaved: "Shot image saved",
  toastRemoved: "Shot image removed",
};

export function getShotDropzoneStringsFull(
  locale: DagsplanLocale,
): ShotDropzoneStrings {
  return locale === "en" ? shotStringsEn : shotStringsNo;
}

export function getShotDropzoneStrings(locale: DagsplanLocale): ShotDropzoneT {
  return locale === "en" ? shotEn : shotNo;
}

/** Print page (server) */
export type DagsplanPrintT = {
  workHours: string;
  location: string;
  callTime: string;
  function: string;
  name: string;
  mobile: string;
  onSet: string;
  cast: string;
  schedule: string;
  infoWeather: string;
  /** Print: egen overskrift under Info (vær). */
  weather: string;
  deptInfo: string;
  nr: string;
  phone: string;
  film: string;
  meet: string;
  readyOnSet: string;
  from: string;
  to: string;
  duration: string;
  scene: string;
  actors: string;
  costume: string;
  shot: string;
  department: string;
  info: string;
  parkingImageNote: string;
  googleMaps: string;
  parkingTransport: string;
  parkingMaps: string;
  sunrise: string;
  sunset: string;
  emergencyNumbers: string;
  radioChannels: string;
  parkingSketch: string;
  /** Bruk {n} for lokasjonsnummer */
  parkingSketchLocationTemplate: string;
  parkingAttachmentAria: string;
  /** Bruk {n} for lokasjonsnummer */
  parkingAttachmentAriaLocationTemplate: string;
  /** Toolbar: last ned PDF */
  downloadPdf: string;
};

const printNo: DagsplanPrintT = {
  workHours: "Arbeidstid",
  location: "Location",
  callTime: "Oppmøtetid",
  function: "Funksjon",
  name: "Navn",
  mobile: "Mobil",
  onSet: "PÅ SET",
  cast: "Aktører",
  schedule: "Timeplan",
  infoWeather: "Info og vær",
  weather: "Vær",
  deptInfo: "Avdelingsinfo",
  nr: "Nr",
  phone: "Tlf",
  film: "Film",
  meet: "Oppmøte",
  readyOnSet: "Klar på sett",
  from: "Fra",
  to: "Til",
  duration: "Varighet",
  scene: "Scene / setting",
  actors: "Aktør(er)",
  costume: "Kostyme",
  shot: "Shot",
  department: "Avdeling",
  info: "Info",
  parkingImageNote: "Bildebeskrivelse vedlagt",
  googleMaps: "(Google Maps)",
  parkingTransport: "Parkering / transport",
  parkingMaps: "Parkering kart",
  sunrise: "Soloppgang",
  sunset: "Solnedgang",
  emergencyNumbers: "Nødnummer",
  radioChannels: "Radiokanaler",
  parkingSketch: "Parkering / skisse",
  parkingSketchLocationTemplate: "Parkering / skisse — lokasjon {n}",
  parkingAttachmentAria: "Parkering — vedlegg",
  parkingAttachmentAriaLocationTemplate: "Parkering — lokasjon {n}",
  downloadPdf: "Last ned PDF",
};

const printEn: DagsplanPrintT = {
  workHours: "Work hours",
  location: "Location",
  callTime: "Call time",
  function: "Role",
  name: "Name",
  mobile: "Mobile",
  onSet: "ON SET",
  cast: "Cast",
  schedule: "Schedule",
  infoWeather: "Info and weather",
  weather: "Weather",
  deptInfo: "Department info",
  nr: "No.",
  phone: "Phone",
  film: "Film",
  meet: "Call",
  readyOnSet: "Ready on set",
  from: "From",
  to: "To",
  duration: "Duration",
  scene: "Scene / setting",
  actors: "Cast",
  costume: "Costume",
  shot: "Shot",
  department: "Department",
  info: "Info",
  parkingImageNote: "Image description attached",
  googleMaps: "(Google Maps)",
  parkingTransport: "Parking / transport",
  parkingMaps: "Parking maps",
  sunrise: "Sunrise",
  sunset: "Sunset",
  emergencyNumbers: "Emergency numbers",
  radioChannels: "Radio channels",
  parkingSketch: "Parking / sketch",
  parkingSketchLocationTemplate: "Parking / sketch — location {n}",
  parkingAttachmentAria: "Parking — attachment",
  parkingAttachmentAriaLocationTemplate: "Parking — location {n}",
  downloadPdf: "Download PDF",
};

export function getDagsplanPrintStrings(locale: DagsplanLocale): DagsplanPrintT {
  return locale === "en" ? printEn : printNo;
}

/** Én location-blokk i editoren */
export type LocationBlockT = {
  locationName: string;
  locationNamePh: string;
  address: string;
  openInMaps: string;
  fillAddressForMaps: string;
  addressPlaceholder: string;
  mapsLink: string;
  mapsLinkPh: string;
  parkingTransport: string;
  parkingTransportPh: string;
  parkingMapsLink: string;
  parkingMapsLinkPh: string;
  parkingImage: string;
  parkingImageHint: string;
  save: string;
  collapse: string;
  expand: string;
};

const locationNo: LocationBlockT = {
  locationName: "Navn på location",
  locationNamePh: "F.eks. Studio, hovedlokasjon",
  address: "Adresse",
  openInMaps: "Open in Google Maps",
  fillAddressForMaps: "Fyll inn adresse for å søke i Maps",
  addressPlaceholder: "Adresse eller sted (brukes til Google Maps-søk)",
  mapsLink: "Google Maps link",
  mapsLinkPh: "https://maps.google.com/…",
  parkingTransport: "Parking / transport",
  parkingTransportPh: "Directions, gate codes, shuttle…",
  parkingMapsLink: "Parking maps link",
  parkingMapsLinkPh: "https://…",
  parkingImage: "Parking image (print attachment)",
  parkingImageHint:
    "Map, sketch or photo. Prints as a separate page when filled.",
  save: "Lagre",
  collapse: "Lukk",
  expand: "Åpne",
};

const locationEn: LocationBlockT = {
  locationName: "Location name",
  locationNamePh: "E.g. studio, main unit",
  address: "Address",
  openInMaps: "Open in Google Maps",
  fillAddressForMaps: "Enter address to search in Maps",
  addressPlaceholder: "Address or place (used for Google Maps search)",
  mapsLink: "Google Maps link",
  mapsLinkPh: "https://maps.google.com/…",
  parkingTransport: "Parking / transport",
  parkingTransportPh: "Directions, gate codes, shuttle…",
  parkingMapsLink: "Parking maps link",
  parkingMapsLinkPh: "https://…",
  parkingImage: "Parking image (print attachment)",
  parkingImageHint:
    "Map, sketch or photo. Prints as a separate page when filled.",
  save: "Save",
  collapse: "Close",
  expand: "Open",
};

export function getDagsplanLocationStrings(
  locale: DagsplanLocale,
): LocationBlockT {
  return locale === "en" ? locationEn : locationNo;
}
