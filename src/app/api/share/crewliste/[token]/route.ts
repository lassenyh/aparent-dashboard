import { NextResponse } from "next/server";
import {
  getProjectCrewListPageData,
  getProjectIdByCrewListShareToken,
} from "@/actions/project-crew-list";
import { toCrewListSharePayload } from "@/lib/crew-list-share-payload";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token?.trim()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const projectId = await getProjectIdByCrewListShareToken(token);
  if (!projectId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data = await getProjectCrewListPageData(projectId);
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(toCrewListSharePayload(data));
}
