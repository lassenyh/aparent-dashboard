-- Sensitiv crew-info (kryptert i applikasjonen)
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "bankAccountEncrypted" TEXT;
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "nationalIdEncrypted" TEXT;
