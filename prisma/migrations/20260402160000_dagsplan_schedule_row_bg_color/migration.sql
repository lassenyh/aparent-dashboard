-- Per-rad bakgrunnsfarge i timeplan (hex), jf. produksjons-dagsplan med fargekoding.
ALTER TABLE "DagsplanScheduleEntry" ADD COLUMN "rowBgColor" TEXT;
