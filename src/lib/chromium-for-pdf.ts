import puppeteer from "puppeteer-core";
import type { Browser } from "puppeteer-core";

function useServerlessChromiumPack(): boolean {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_VERSION)
  );
}

/** Chromium for HTML→PDF (klikkbare lenker i PDF). Lokal dev: Chrome via `PUPPETEER_EXECUTABLE_PATH` eller standardsti. */
export async function launchChromiumForPdf(): Promise<Browser> {
  if (useServerlessChromiumPack()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const explicit = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (explicit) {
    return puppeteer.launch({
      executablePath: explicit,
      headless: true,
    });
  }

  const platform = process.platform;
  const fallback =
    platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : "/usr/bin/google-chrome-stable";

  return puppeteer.launch({
    executablePath: fallback,
    headless: true,
  });
}
