import type { CSSProperties } from "react";
import type { ScheduleImageFit } from "@/lib/schedule-rows";

export const DEFAULT_SCHEDULE_SHOT_FRAMING = {
  zoom: 1,
  x: 50,
  y: 50,
  fit: "contain" as ScheduleImageFit,
};

export function scheduleShotImageStyle(framing: {
  zoom: number;
  x: number;
  y: number;
}): CSSProperties {
  const zoom = Math.max(1, Math.min(3, framing.zoom || 1));
  const x = Number.isFinite(framing.x) ? framing.x : 50;
  const y = Number.isFinite(framing.y) ? framing.y : 50;
  if (zoom === 1 && x === 50 && y === 50) return {};
  const maxPan = ((zoom - 1) * 50) / zoom;
  const translateX = ((50 - x) / 50) * maxPan;
  const translateY = ((50 - y) / 50) * maxPan;
  return {
    transform: `translate3d(${translateX}%, ${translateY}%, 0) scale(${zoom})`,
    transformOrigin: "center center",
  };
}
