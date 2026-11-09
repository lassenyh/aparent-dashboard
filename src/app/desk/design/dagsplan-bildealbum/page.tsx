import type { Metadata } from "next";
import { DagsplanImageAlbumPrototype } from "@/components/design/dagsplan-image-album-prototype";

export const metadata: Metadata = { title: "Prototype · Bildealbum i dagsplan" };

export default function DagsplanImageAlbumPrototypePage() {
  return <DagsplanImageAlbumPrototype />;
}
