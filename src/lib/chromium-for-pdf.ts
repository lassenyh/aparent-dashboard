import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import type { Browser } from "puppeteer-core";

/** Vercel / Lambda — @sparticuz/chromium er kun for Linux (serverless). */
function isServerlessWithPack(): boolean {
  return (
    (Boolean(process.env.VERCEL) && process.env.VERCEL !== "0") ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_VERSION) ||
    Boolean(process.env.AWS_EXECUTION_ENV)
  );
}

/** Docker/Linux uten system-Chrome: tving pakket Chromium (Linux-binær). */
function forcePackagedChromiumLinux(): boolean {
  const v = process.env.USE_CHROMIUM_PACK?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function candidateBrowserPaths(): string[] {
  const p = process.platform;
  if (p === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
  }
  if (p === "win32") {
    return [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
  }
  return [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];
}

async function launchWithSparticuz(): Promise<Browser> {
  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

async function launchWithExecutable(executablePath: string): Promise<Browser> {
  return puppeteer.launch({
    executablePath,
    headless: true,
  });
}

/**
 * Chromium for HTML→PDF (klikkbare lenker i PDF).
 *
 * Viktig: @sparticuz/chromium er **Linux-only**. På macOS/Windows må vi bruke
 * installert Chrome/Edge — derfor prøves alltid lokale stier først.
 *
 * - `PUPPETEER_EXECUTABLE_PATH`: bruk denne binæren
 * - Ellers: kjente stier til Chrome/Edge/Brave/Chromium
 * - Serverless (Vercel): sparticuz
 * - Linux + USE_CHROMIUM_PACK uten fungerende system-Chrome: sparticuz
 */
export async function launchChromiumForPdf(): Promise<Browser> {
  const explicit = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (explicit) {
    return launchWithExecutable(explicit);
  }

  const errors: string[] = [];

  // 1) Lokale nettlesere først (macOS/Windows/Linux) — uavhengig av USE_CHROMIUM_PACK
  for (const exe of candidateBrowserPaths()) {
    if (!existsSync(exe)) continue;
    try {
      return await launchWithExecutable(exe);
    } catch (e) {
      errors.push(`${exe}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 2) Vercel / Lambda — Linux, pakket Chromium
  if (isServerlessWithPack()) {
    return launchWithSparticuz();
  }

  // 3) Linux (Docker e.l.) uten Chrome i PATH: eksplisitt ønske om pakket binær
  if (process.platform === "linux" && forcePackagedChromiumLinux()) {
    return launchWithSparticuz();
  }

  // 4) Ren Linux-fallback: siste forsøk med sparticuz
  if (process.platform === "linux") {
    try {
      return await launchWithSparticuz();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`sparticuz: ${msg}`);
    }
  }

  const detail = errors.length ? errors.join(" | ") : "ingen kjente nettleserstier funnet";
  throw new Error(
    `Kunne ikke starte Chromium for PDF. ${detail}. Installer Chrome eller Edge, eller sett PUPPETEER_EXECUTABLE_PATH. På Linux uten Chrome: USE_CHROMIUM_PACK=1.`,
  );
}
