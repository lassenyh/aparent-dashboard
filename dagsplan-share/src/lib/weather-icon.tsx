"use client";

import type { WeatherIconKind } from "@prisma/client";
import type { LucideProps } from "lucide-react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const WEATHER_ICON_OPTIONS: { value: WeatherIconKind; label: string }[] =
  [
    { value: "none", label: "Ingen ikon" },
    { value: "sun", label: "Sol" },
    { value: "partly_cloudy", label: "Delvis skyet" },
    { value: "cloudy", label: "Overskyet" },
    { value: "rain", label: "Regn" },
    { value: "snow", label: "Snø" },
    { value: "thunder", label: "Torden" },
    { value: "fog", label: "Tåke" },
    { value: "wind", label: "Vind" },
  ];

const iconClass = "h-8 w-8 shrink-0";

export function WeatherIconGlyph({
  kind,
  className,
  ...props
}: { kind: WeatherIconKind } & LucideProps) {
  const cls = cn(iconClass, className);
  switch (kind) {
    case "none":
      return null;
    case "sun":
      return <Sun className={cls} strokeWidth={1.75} {...props} />;
    case "partly_cloudy":
      return <CloudSun className={cls} strokeWidth={1.75} {...props} />;
    case "cloudy":
      return <Cloud className={cls} strokeWidth={1.75} {...props} />;
    case "rain":
      return <CloudRain className={cls} strokeWidth={1.75} {...props} />;
    case "snow":
      return <CloudSnow className={cls} strokeWidth={1.75} {...props} />;
    case "thunder":
      return <CloudLightning className={cls} strokeWidth={1.75} {...props} />;
    case "fog":
      return <CloudFog className={cls} strokeWidth={1.75} {...props} />;
    case "wind":
      return <Wind className={cls} strokeWidth={1.75} {...props} />;
    default:
      return null;
  }
}
