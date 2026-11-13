/**
 * Oppgjør — mailmal som sendes til crew etter ferdig prosjekt.
 * Rene funksjoner (ingen server-avhengigheter) slik at klienten kan generere forhåndsvisning live.
 * Vedlegg (fakturainfo-PDF og timelistemal) legges til manuelt i Mail.
 */

export type OppgjorMailInput = {
  /** «Prosjektnr - Kunde - Prosjektnavn» */
  projectLabel: string;
  /** Unik lenke til prosjektets utleggsprosjekt i Aparent Expenses. */
  expensesUrl: string;
};

export type OppgjorMailLine =
  | { kind: "text"; text: string }
  /** Uthevet overskrift, f.eks. «Faktura:» */
  | { kind: "heading"; text: string }
  /** Linje med uthevet tittel og verdi */
  | { kind: "field"; label: string; text: string }
  /** `title` vises som klikkbar tekst der Mail får HTML (forhåndsvisning og «Kopier tekst»). */
  | { kind: "link"; url: string; title?: string };

export const OPPGJOR_LINK_PLACEHOLDER = "[lenke til utleggsprosjekt]";
/** Lenketekst for utleggslenken i formatert mail. */
export const OPPGJOR_LINK_TITLE = "Aparent Utlegg";

export function buildOppgjorSubject(input: Pick<OppgjorMailInput, "projectLabel">): string {
  return ["Oppgjør", input.projectLabel].filter(Boolean).join(" – ");
}

/** Felles linjestruktur for ren tekst, HTML og forhåndsvisning. Tom tekst = blank linje. */
export function buildOppgjorLines(input: OppgjorMailInput): OppgjorMailLine[] {
  const t = (text: string): OppgjorMailLine => ({ kind: "text", text });
  const h = (text: string): OppgjorMailLine => ({ kind: "heading", text });
  const url = input.expensesUrl.trim();
  return [
    t("Hei,"),
    t(""),
    t("Tusen takk for denne gang!"),
    t(""),
    { kind: "field", label: "Prosjektnr og navn:", text: input.projectLabel },
    t(""),
    h("Faktura:"),
    t("Se vedlagt PDF med fakturainfo."),
    t("Sendes med EHF med meg på kopi."),
    t(""),
    h("Timelister:"),
    t("Bruk egen eller vedlagt mal."),
    t(""),
    h("Oppgjør:"),
    t(
      "Du laster enkelt opp kvitteringene dine via lenken under. Systemet analyserer kvitteringene automatisk og fyller ut mesteparten av skjemaet for deg før du sender inn.",
    ),
    url ? { kind: "link", url, title: OPPGJOR_LINK_TITLE } : t(OPPGJOR_LINK_PLACEHOLDER),
  ];
}

/** Ren tekst — brukes i mailto: (Mail gjør URL-en klikkbar). */
export function buildOppgjorBodyText(input: OppgjorMailInput): string {
  return buildOppgjorLines(input)
    .map((line) =>
      line.kind === "field"
        ? `${line.label} ${line.text}`.trimEnd()
        : line.kind === "link"
          ? line.url
          : line.text,
    )
    .join("\n");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Mails standardfont, satt på hver linje så Mail ikke faller tilbake til nettleserens 16px. */
const MAIL_FONT_STYLE = "font-family: Helvetica, Arial, sans-serif; font-size: 12px;";

const URL_LINE = /^https?:\/\/\S+$/i;
const FIELD_LINE = /^(Prosjektnr og navn:)\s*(.*)$/i;

/**
 * Tolker fritt redigert tekst tilbake til linjer, så forhåndsvisning og «Kopier tekst» får
 * uthevede overskrifter og klikkbare lenker også etter redigering:
 * kort linje som slutter med «:» → overskrift, linje med bare en nettadresse → lenke.
 */
export function parseOppgjorText(text: string, expensesUrl = ""): OppgjorMailLine[] {
  return text.split(/\r?\n/).map((raw): OppgjorMailLine => {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (URL_LINE.test(trimmed)) {
      /* Utleggslenken får tittel; andre adresser vises som de er. */
      const title = expensesUrl && trimmed === expensesUrl.trim() ? OPPGJOR_LINK_TITLE : undefined;
      return { kind: "link", url: trimmed, title };
    }
    const field = FIELD_LINE.exec(trimmed);
    if (field) return { kind: "field", label: field[1], text: field[2] };
    if (trimmed.endsWith(":") && trimmed.length <= 40) return { kind: "heading", text: trimmed };
    return { kind: "text", text: line };
  });
}

/** HTML — brukes ved «Kopier tekst», så overskrifter blir uthevet i Mail. */
export function buildOppgjorBodyHtml(lines: OppgjorMailLine[]): string {
  const div = (inner: string) => `<div style="${MAIL_FONT_STYLE}">${inner}</div>`;
  const html = lines
    .map((line) => {
      if (line.kind === "text") return div(line.text ? esc(line.text) : "<br>");
      if (line.kind === "heading") return div(`<b>${esc(line.text)}</b>`);
      if (line.kind === "field") return div(`<b>${esc(line.label)}</b>${line.text ? ` ${esc(line.text)}` : ""}`);
      return div(`<a href="${esc(line.url)}">${esc(line.title ?? line.url)}</a>`);
    })
    .join("");
  return `<div style="${MAIL_FONT_STYLE}">${html}</div>`;
}

/** Bare http(s)-lenker godtas som utleggslenke. */
export function normalizeExpensesUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** HTML for den redigerbare forhåndsvisningen. Lenken er en låst blokk, så tittelen ikke kan redigeres bort. */
export function oppgjorLinesToEditorHtml(lines: OppgjorMailLine[]): string {
  return lines
    .map((line) => {
      if (line.kind === "text") return `<div>${line.text ? esc(line.text) : "<br>"}</div>`;
      if (line.kind === "heading") return `<div><b>${esc(line.text)}</b></div>`;
      if (line.kind === "field") return `<div><b>${esc(line.label)}</b>${line.text ? ` ${esc(line.text)}` : ""}</div>`;
      return `<div><a href="${esc(line.url)}" data-url="${esc(line.url)}" contenteditable="false" title="${esc(line.url)}">${esc(line.title ?? line.url)}</a></div>`;
    })
    .join("");
}

const BLOCK_TAGS = new Set(["DIV", "P", "LI"]);

/** Leser den redigerbare forhåndsvisningen tilbake til ren tekst (lenker blir adressen sin). */
export function serializeOppgjorEditor(root: HTMLElement): string {
  const lines: string[] = [];
  let current = "";
  let open = false;
  const flush = () => {
    lines.push(current);
    current = "";
    open = false;
  };
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      current += (node.textContent ?? "").replace(/\u00a0/g, " ");
      open = true;
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      /* En <br> som siste barn i en blokk er bare plassholder for tom linje. */
      if (node.parentElement && node.parentElement !== root && node === node.parentElement.lastChild) {
        open = true;
        return;
      }
      flush();
      open = true;
      return;
    }
    if (node.tagName === "A") {
      current += node.dataset.url || node.getAttribute("href") || node.textContent || "";
      open = true;
      return;
    }
    const block = BLOCK_TAGS.has(node.tagName);
    if (block && open) flush();
    node.childNodes.forEach(walk);
    if (block && open) flush();
  };
  root.childNodes.forEach(walk);
  if (open) flush();
  return lines.join("\n");
}
