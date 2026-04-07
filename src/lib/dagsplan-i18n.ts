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
  duplicate: string;
  saveAll: string;
  saving: string;
  branding: string;
  agencyLogo: string;
  clientLogo: string;
  uploadAgencyLogo: string;
  uploadClientLogo: string;
  upload: string;
  uploadEllipsis: string;
  emptyLogoHint: string;
  title: string;
  shootDate: string;
  workFrom: string;
  workTo: string;
  /** Arbeid fra/til settes fra timeplan */
  workHoursAuto: string;
  locations: string;
  newLocation: string;
  noLocationsHint: string;
  locationAdded: string;
  locationRemoved: string;
  infoWeather: string;
  generalInfo: string;
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
  showShotColumn: string;
  addCallTime: string;
  addRow: string;
  addLunch: string;
  /** Timeplan: legg til rad med forhåndsutfylt info/scene fra valgt location */
  addCompanyMove: string;
  /** Når det finnes locations: manuelt felt under listen */
  companyMoveManualOr: string;
  /** Når det ikke finnes locations: forklaring før manuelt felt */
  companyMoveManualHint: string;
  companyMoveManualPlaceholder: string;
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
  duplicate: "Dupliser",
  saveAll: "Lagre alle endringer",
  saving: "Lagrer…",
  branding: "Branding",
  agencyLogo: "Byrålogo",
  clientLogo: "Kundelogo",
  uploadAgencyLogo: "Last opp byrålogo",
  uploadClientLogo: "Last opp kundelogo",
  upload: "Last opp",
  uploadEllipsis: "…",
  emptyLogoHint:
    "Tom visning bruker prosjektets byrå-/kundelogo som forslag.",
  title: "Tittel",
  shootDate: "Innspillingsdato",
  workFrom: "Arbeid fra",
  workTo: "Arbeid til",
  workHoursAuto:
    "Settes automatisk fra tidligste start- og seneste sluttid i timeplan.",
  locations: "Locations",
  newLocation: "+ Ny location",
  noLocationsHint:
    "Ingen locations ennå. Bruk «Ny location» for å legge til adresse, kart, parkering og parkeringsbilde.",
  locationAdded: "Location lagt til",
  locationRemoved: "Location fjernet",
  infoWeather: "Info og vær",
  generalInfo: "Generell info",
  weatherIcon: "Vær (ikon)",
  pickIcon: "Velg ikon",
  minTemp: "Min temp (°C)",
  maxTemp: "Max temp (°C)",
  weatherNotes: "Vær / merknader (fritekst)",
  weatherPreviewHint: "Forhåndsvisning (som på print)",
  crewMeet: "Oppmøtetid",
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
  showShotColumn: "Vis kolonne Shot (bilde)",
  addCallTime: "+ Call time",
  addRow: "+ Rad",
  addLunch: "+ Lunsj",
  addCompanyMove: "Company move",
  companyMoveManualOr: "Eller skriv adresse manuelt:",
  companyMoveManualHint:
    "Ingen lagrede locations — skriv adressen i feltet under (scene/adresse på raden).",
  companyMoveManualPlaceholder: "Adresse",
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
  duplicate: "Duplicate",
  saveAll: "Save all changes",
  saving: "Saving…",
  branding: "Branding",
  agencyLogo: "Agency logo",
  clientLogo: "Client logo",
  uploadAgencyLogo: "Upload agency logo",
  uploadClientLogo: "Upload client logo",
  upload: "Upload",
  uploadEllipsis: "…",
  emptyLogoHint:
    "When empty, the project’s agency/client logos are used as a fallback.",
  title: "Title",
  shootDate: "Shoot date",
  workFrom: "Work from",
  workTo: "Work to",
  workHoursAuto:
    "Set automatically from the earliest start and latest end in the schedule.",
  locations: "Locations",
  newLocation: "+ New location",
  noLocationsHint:
    "No locations yet. Use “New location” to add address, maps, parking and parking image.",
  locationAdded: "Location added",
  locationRemoved: "Location removed",
  infoWeather: "Info & weather",
  generalInfo: "General info",
  weatherIcon: "Weather (icon)",
  pickIcon: "Choose icon",
  minTemp: "Min temp (°C)",
  maxTemp: "Max temp (°C)",
  weatherNotes: "Weather / notes",
  weatherPreviewHint: "Preview (as on print)",
  crewMeet: "Call time",
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
  showShotColumn: "Show Shot column (image)",
  addCallTime: "+ Call time",
  addRow: "+ Row",
  addLunch: "+ Lunch",
  addCompanyMove: "Company move",
  companyMoveManualOr: "Or type an address manually:",
  companyMoveManualHint:
    "No saved locations — enter the address below (scene/address on the row).",
  companyMoveManualPlaceholder: "Address",
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
  sceneSetting: string;
  actors: string;
  shot: string;
  moveRow: string;
  anchorAuto: string;
  /** Kort merkelapp på fri-rad */
  freeRowShort: string;
  freeRow: string;
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
  useOsloAuto: "Bruk Oslo (automatisk)",
  sunTimesManual: "Manuelle tider — lagres på dagsplanen.",
  sunTimesAutoBeforeDate: "Automatisk fra Oslo på opptaksdato (",
  sunTimesAutoAfterDate: ").",
  from: "Fra",
  to: "Til",
  info: "Info",
  durationMin: "Varighet",
  sceneSetting: "Scene / setting",
  actors: "Aktør(er)",
  shot: "Shot",
  moveRow: "Flytt og radfarge",
  anchorAuto: "Anker eller auto",
  freeRowShort: "Fri",
  freeRow: "Frifelt",
  totalPlanned: "Totalt planlagt",
  min: "min",
  h: "t",
  osloHint: "Standard: Oslo på opptaksdato. Endre ved annen lokasjon.",
  actions: "Handlinger",
};

const scheduleEn: ScheduleTableT = {
  sunrise: "Sunrise",
  sunset: "Sunset",
  useOsloAuto: "Use Oslo (auto)",
  sunTimesManual: "Manual times — saved on the day plan.",
  sunTimesAutoBeforeDate: "Automatic from Oslo on shoot date (",
  sunTimesAutoAfterDate: ").",
  from: "From",
  to: "To",
  info: "Info",
  durationMin: "Duration",
  sceneSetting: "Scene / setting",
  actors: "Cast",
  shot: "Shot",
  moveRow: "Move & row colour",
  anchorAuto: "Anchor or auto",
  freeRowShort: "Free",
  freeRow: "Free row",
  totalPlanned: "Total planned",
  min: "min",
  h: "h",
  osloHint: "Default: Oslo on shoot date. Change for other locations.",
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
  replace: "Bytt",
  remove: "×",
  removeEllipsis: "…",
  uploading: "…",
};

const shotEn: ShotDropzoneT = {
  shot: "Shot",
  dropOrClick: "Drop image or click",
  replace: "Replace",
  remove: "×",
  removeEllipsis: "…",
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
  toastTooBig: "Bildet er for stort (maks 8 MB)",
  toastSaved: "Shot-bilde lagret",
  toastRemoved: "Shot-bilde fjernet",
};

const shotStringsEn: ShotDropzoneStrings = {
  ...shotEn,
  toastNotImage: "Choose an image file",
  toastTooBig: "Image too large (max 8 MB)",
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
  sceneSetting: string;
  actors: string;
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
  infoWeather: "Info / vær",
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
  sceneSetting: "Scene / setting",
  actors: "Aktør(er)",
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
  infoWeather: "Info / weather",
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
  sceneSetting: "Scene / setting",
  actors: "Cast",
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
};

export function getDagsplanLocationStrings(
  locale: DagsplanLocale,
): LocationBlockT {
  return locale === "en" ? locationEn : locationNo;
}
