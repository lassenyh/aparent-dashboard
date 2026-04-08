import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json(
      {
        error:
          "Kunne ikke starte nettlesermotor for PDF. Sett miljøvariabel PUPPETEER_EXECUTABLE_PATH til Chrome/Chromium, eller bruk «Skriv ut» i nettleseren.",
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

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "11mm", right: "12mm", bottom: "11mm", left: "12mm" },
    });

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
