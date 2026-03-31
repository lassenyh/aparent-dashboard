import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getPayrollPageData } from "@/actions/payroll";
import { PayrollPdfDocument } from "@/lib/payroll-pdf";
import {
  buildPayrollPdfDownloadBasename,
  sanitizePayrollPdfFilename,
} from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; listId: string }> },
) {
  const { id: projectId, listId } = await context.params;
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const data = await getPayrollPageData(projectId, listId, {
    maskSensitiveForUi: preview,
  });
  if (!data) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<PayrollPdfDocument data={data} />);
  const basename = buildPayrollPdfDownloadBasename(
    data.project,
    data.documentSavedAt,
    data.listUpdatedAt,
  );
  const filename = sanitizePayrollPdfFilename(`${basename}.pdf`);
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
