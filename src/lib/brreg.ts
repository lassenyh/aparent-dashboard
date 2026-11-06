export type BrregOrganization = {
  name: string;
  organizationNumber: string;
  address: string;
  postalCode: string;
  city: string;
};

type BrregAddress = {
  adresse?: string[];
  postnummer?: string;
  poststed?: string;
};

type BrregEnhet = {
  navn?: string;
  organisasjonsnummer?: string;
  forretningsadresse?: BrregAddress;
  postadresse?: BrregAddress;
};

type BrregSearchResponse = {
  _embedded?: {
    enheter?: BrregEnhet[];
  };
};

const BRREG_BASE = "https://data.brreg.no/enhetsregisteret/api/enheter";
const BRREG_HEADERS = {
  Accept: "application/json",
  "User-Agent": "WrapUp-Desk/1.0 (company lookup)",
};

function mapEnhet(enhet: BrregEnhet): BrregOrganization | null {
  const name = enhet.navn?.trim();
  const organizationNumber = enhet.organisasjonsnummer?.replace(/\s/g, "");
  if (!name || !organizationNumber) {
    return null;
  }

  const address = enhet.forretningsadresse ?? enhet.postadresse;
  return {
    name,
    organizationNumber,
    address: address?.adresse?.filter(Boolean).join(", ") ?? "",
    postalCode: address?.postnummer ?? "",
    city: address?.poststed ?? "",
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: BRREG_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  return response;
}

export async function searchBrregOrganizations(query: string): Promise<{
  organizations: BrregOrganization[];
  error?: string;
}> {
  const trimmed = typeof query === "string" ? query.trim().slice(0, 180) : "";
  if (trimmed.length < 2) {
    return { organizations: [] };
  }

  try {
    const digits = trimmed.replace(/\s/g, "");
    if (/^\d{9}$/.test(digits)) {
      const response = await fetchJson(`${BRREG_BASE}/${digits}`);
      if (response.status === 404) {
        return { organizations: [] };
      }
      if (!response.ok) {
        return {
          organizations: [],
          error: "Kunne ikke søke i Enhetsregisteret. Fyll ut manuelt.",
        };
      }
      const enhet = (await response.json()) as BrregEnhet;
      const mapped = mapEnhet(enhet);
      return { organizations: mapped ? [mapped] : [] };
    }

    const params = new URLSearchParams({
      navn: trimmed.slice(0, 180),
      navnMetodeForSoek: "FORTLOEPENDE",
      size: "8",
      konkurs: "false",
    });
    const response = await fetchJson(`${BRREG_BASE}?${params.toString()}`);
    if (!response.ok) {
      return {
        organizations: [],
        error: "Kunne ikke søke i Enhetsregisteret. Fyll ut manuelt.",
      };
    }
    const payload = (await response.json()) as BrregSearchResponse;
    const organizations = (payload._embedded?.enheter ?? [])
      .map(mapEnhet)
      .filter((item): item is BrregOrganization => item !== null);
    return { organizations };
  } catch {
    return {
      organizations: [],
      error: "Kunne ikke søke i Enhetsregisteret. Fyll ut manuelt.",
    };
  }
}
