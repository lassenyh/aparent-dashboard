-- Språk for UI + print (norsk / engelsk), inkl. rolleoversettelser på print.
ALTER TABLE "Dagsplan" ADD COLUMN "displayLocale" TEXT NOT NULL DEFAULT 'no';
