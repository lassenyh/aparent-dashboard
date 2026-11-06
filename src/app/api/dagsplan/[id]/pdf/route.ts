import { NextRequest, NextResponse } from "next/server";
import type { Page } from "puppeteer-core";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { launchChromiumForPdf } from "@/lib/chromium-for-pdf";
import { prisma } from "@/lib/db";
import { getProjectAccessForUser } from "@/lib/project-access";
import {
  buildDagsplanPdfBasename,
  sanitizePayrollPdfFilename,
} from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PDF_BYTES = 10_000_000;
const PDF_IMAGE_PRESETS = [
  { maxDimension: 1_000, quality: 0.7 },
  { maxDimension: 800, quality: 0.55 },
  { maxDimension: 600, quality: 0.4 },
  { maxDimension: 450, quality: 0.3 },
] as const;

async function compressMarkedImages(
  page: Page,
  preset: (typeof PDF_IMAGE_PRESETS)[number],
) {
  return page.evaluate(async ({ maxDimension, quality }) => {
    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>("img[data-pdf-compress]"),
    );

    let compressed = 0;
    let failed = 0;

    for (const image of images) {
      if (!image.complete || image.naturalWidth < 1 || image.naturalHeight < 1) {
        failed += 1;
        continue;
      }

      try {
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          failed += 1;
          continue;
        }

        context.fillStyle = "#fff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        const compressedSrc = canvas.toDataURL("image/jpeg", quality);

        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Komprimert bilde kunne ikke lastes"));
          image.src = compressedSrc;
        });
        compressed += 1;
      } catch {
        failed += 1;
      }
    }

    return { compressed, failed };
  }, preset);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const user = await getSessionDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const row = await prisma.dagsplan.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      title: true,
      shootDate: true,
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  const flags = await getProjectAccessForUser(user, row.projectId);
  if (!flags?.canViewDagsplan) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const printUrl = `${request.nextUrl.origin}/dagsplaner/${id}/print`;
  const cookie = request.headers.get("cookie");

  let browser: Awaited<ReturnType<typeof launchChromiumForPdf>> | undefined;
  try {
    browser = await launchChromiumForPdf();
  } catch (e) {
    console.error("chromium launch", e);
    const details = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error:
          "Kunne ikke starte nettlesermotor for PDF. Installer Chrome eller Edge (macOS/Windows), eller sett PUPPETEER_EXECUTABLE_PATH. På Linux uten Chrome: USE_CHROMIUM_PACK=1. Ellers bruk «Skriv ut» i nettleseren.",
        ...(process.env.PDF_DEBUG_ERRORS === "1" ||
        process.env.NODE_ENV !== "production"
          ? { details }
          : {}),
      },
      { status: 503 },
    );
  }

  try {
    const page = await browser.newPage();
    if (cookie) {
      await page.setExtraHTTPHeaders({ Cookie: cookie });
    }
    await page.goto(printUrl, {
      waitUntil: "load",
      timeout: 90_000,
    });
    await new Promise((r) => setTimeout(r, 400));

    await page
      .waitForFunction(
        () =>
          Array.from(document.querySelectorAll("img[data-pdf-compress]")).every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0 &&
              image.naturalHeight > 0,
          ),
        { timeout: 15_000 },
      )
      .catch(() => undefined);

    let pdfBuffer: Uint8Array | undefined;
    for (const preset of PDF_IMAGE_PRESETS) {
      const result = await compressMarkedImages(page, preset);
      if (result.failed > 0) {
        console.warn("dagsplan pdf image compression", result);
      }

      pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "11mm", right: "12mm", bottom: "11mm", left: "12mm" },
      });

      if (pdfBuffer.byteLength <= MAX_PDF_BYTES) break;
    }

    if (!pdfBuffer || pdfBuffer.byteLength > MAX_PDF_BYTES) {
      throw new Error(
        `PDF-en kunne ikke komprimeres under ${MAX_PDF_BYTES} bytes`,
      );
    }

    const basename = buildDagsplanPdfBasename(row.title, row.shootDate);
    const filename = sanitizePayrollPdfFilename(`${basename}.pdf`);
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    console.error("dagsplan pdf render", e);
    return NextResponse.json(
      { error: "Kunne ikke generere PDF. Prøv igjen eller bruk Skriv ut." },
      { status: 500 },
    );
  } finally {
    await browser?.close();
  }
}
