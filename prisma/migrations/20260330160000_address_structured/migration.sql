-- Person: strukturert adresse (poststed beholdes i `city`)
ALTER TABLE "Person" ADD COLUMN "addressLine" TEXT;
ALTER TABLE "Person" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Person" ADD COLUMN "country" TEXT;

-- PayrollRow: erstatt enkeltfelt `address` med delte felt
ALTER TABLE "PayrollRow" ADD COLUMN "addressLine" TEXT;
ALTER TABLE "PayrollRow" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "PayrollRow" ADD COLUMN "city" TEXT;
ALTER TABLE "PayrollRow" ADD COLUMN "country" TEXT;

UPDATE "PayrollRow" SET "addressLine" = "address" WHERE "address" IS NOT NULL;

ALTER TABLE "PayrollRow" DROP COLUMN "address";
