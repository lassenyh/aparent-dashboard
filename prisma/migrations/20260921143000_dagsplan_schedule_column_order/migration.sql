ALTER TABLE "Dagsplan"
ADD COLUMN "scheduleColumnOrder" TEXT[] NOT NULL DEFAULT ARRAY[
  'from',
  'to',
  'interiorExterior',
  'dayNight',
  'info',
  'duration',
  'shot',
  'scene',
  'actors',
  'costume'
]::TEXT[];
