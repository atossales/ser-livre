-- Add coxa and antebraco columns to Circumference table
ALTER TABLE "Circumference" ADD COLUMN IF NOT EXISTS "coxa" DOUBLE PRECISION;
ALTER TABLE "Circumference" ADD COLUMN IF NOT EXISTS "antebraco" DOUBLE PRECISION;
