-- Migration: Convert categories and related references to UUID identifiers

-- Ensure pgcrypto extension available for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add new UUID column to categories and populate existing rows
ALTER TABLE "categories" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
UPDATE "categories" SET "new_id" = gen_random_uuid() WHERE "new_id" IS NULL;
ALTER TABLE "categories" ALTER COLUMN "new_id" SET NOT NULL;

-- Add new UUID reference columns to dependent tables
ALTER TABLE "transactions" ADD COLUMN "new_category_id" uuid;
UPDATE "transactions" t
SET "new_category_id" = c."new_id"
FROM "categories" c
WHERE t."category_id" IS NOT NULL AND t."category_id" = c."id";

ALTER TABLE "budgets" ADD COLUMN "new_category_id" uuid;
UPDATE "budgets" b
SET "new_category_id" = c."new_id"
FROM "categories" c
WHERE b."category_id" = c."id";
ALTER TABLE "budgets" ALTER COLUMN "new_category_id" SET NOT NULL;

ALTER TABLE "recurring_transactions" ADD COLUMN "new_category_id" uuid;
UPDATE "recurring_transactions" rt
SET "new_category_id" = c."new_id"
FROM "categories" c
WHERE rt."category_id" = c."id";
ALTER TABLE "recurring_transactions" ALTER COLUMN "new_category_id" SET NOT NULL;

ALTER TABLE "category_rules" ADD COLUMN "new_category_id" uuid;
UPDATE "category_rules" cr
SET "new_category_id" = c."new_id"
FROM "categories" c
WHERE cr."category_id" = c."id";
ALTER TABLE "category_rules" ALTER COLUMN "new_category_id" SET NOT NULL;

-- Drop existing foreign key constraints referencing integer category IDs
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_category_id_categories_id_fk";
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_category_id_categories_id_fk";
ALTER TABLE "recurring_transactions" DROP CONSTRAINT IF EXISTS "recurring_transactions_category_id_categories_id_fk";
ALTER TABLE "category_rules" DROP CONSTRAINT IF EXISTS "category_rules_category_id_categories_id_fk";

-- Replace primary key on categories with the UUID column
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_pkey";
ALTER TABLE "categories" DROP COLUMN "id";
ALTER TABLE "categories" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "categories" ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");

-- Swap old category reference columns for the UUID versions
ALTER TABLE "transactions" DROP COLUMN "category_id";
ALTER TABLE "transactions" RENAME COLUMN "new_category_id" TO "category_id";

ALTER TABLE "budgets" DROP COLUMN "category_id";
ALTER TABLE "budgets" RENAME COLUMN "new_category_id" TO "category_id";

ALTER TABLE "recurring_transactions" DROP COLUMN "category_id";
ALTER TABLE "recurring_transactions" RENAME COLUMN "new_category_id" TO "category_id";

ALTER TABLE "category_rules" DROP COLUMN "category_id";
ALTER TABLE "category_rules" RENAME COLUMN "new_category_id" TO "category_id";

-- Recreate foreign key constraints using UUID identifiers
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_category_id_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_category_id_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "recurring_transactions"
  ADD CONSTRAINT "recurring_transactions_category_id_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "category_rules"
  ADD CONSTRAINT "category_rules_category_id_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Remove obsolete sequence generated for integer category IDs if it exists
DROP SEQUENCE IF EXISTS "categories_id_seq";
