/**
 * Største fil serveren tar imot for parkeringsskisser og shot-bilder.
 * Vercel avviser forespørsler over 4,5 MB før de når funksjonen, så grensen
 * må ligge under det (med litt rom for resten av skjemaet).
 * Brukes i klient og server (ingen Node-imports).
 */
export const MAX_PARKING_IMAGE_BYTES = 4 * 1024 * 1024;

/** Storyboard / shot i timeplan — samme tak som parkering. */
export const MAX_SCHEDULE_SHOT_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Største originalfil brukeren kan velge. Større bilder enn serverens tak
 * skaleres ned og gjøres om til JPG i nettleseren før opplasting.
 */
export const MAX_IMAGE_INPUT_BYTES = 40 * 1024 * 1024;
