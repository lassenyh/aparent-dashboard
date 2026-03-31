-- Drop profile notes on Person (notatfelt fjernet fra crew-profiler).
ALTER TABLE "Person" DROP COLUMN IF EXISTS "notes";
