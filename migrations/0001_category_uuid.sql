-- Ensure pgcrypto extension available for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create deterministic mapping between legacy integer IDs and their new UUID values
CREATE TABLE "category_id_map" AS
SELECT "id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "categories";

-- Drop foreign keys referencing the integer category identifiers
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_category_id_categories_id_fk";
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_category_id_categories_id_fk";
ALTER TABLE "recurring_transactions" DROP CONSTRAINT IF EXISTS "recurring_transactions_category_id_categories_id_fk";
ALTER TABLE "category_rules" DROP CONSTRAINT IF EXISTS "category_rules_category_id_categories_id_fk";

-- Replace the integer primary key on categories with UUIDs using the mapping table
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_pkey";
ALTER TABLE "categories" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "categories"
  ALTER COLUMN "id"
  TYPE uuid USING (
    SELECT "new_id"
    FROM "category_id_map"
    WHERE "category_id_map"."old_id" = "categories"."id"
    LIMIT 1
  );
ALTER TABLE "categories" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "categories" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "categories" ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");

-- Convert dependent foreign keys to UUIDs using the same mapping
ALTER TABLE "transactions"
  ALTER COLUMN "category_id"
  TYPE uuid USING (
    CASE
      WHEN "transactions"."category_id" IS NULL THEN NULL
      ELSE (
        SELECT "new_id"
        FROM "category_id_map"
        WHERE "category_id_map"."old_id" = "transactions"."category_id"
        LIMIT 1
      )
    END
  );

ALTER TABLE "budgets"
  ALTER COLUMN "category_id"
  TYPE uuid USING (
    SELECT "new_id"
    FROM "category_id_map"
    WHERE "category_id_map"."old_id" = "budgets"."category_id"
    LIMIT 1
  );
ALTER TABLE "budgets" ALTER COLUMN "category_id" SET NOT NULL;

ALTER TABLE "recurring_transactions"
  ALTER COLUMN "category_id"
  TYPE uuid USING (
    SELECT "new_id"
    FROM "category_id_map"
    WHERE "category_id_map"."old_id" = "recurring_transactions"."category_id"
    LIMIT 1
  );
ALTER TABLE "recurring_transactions" ALTER COLUMN "category_id" SET NOT NULL;

ALTER TABLE "category_rules"
  ALTER COLUMN "category_id"
  TYPE uuid USING (
    SELECT "new_id"
    FROM "category_id_map"
    WHERE "category_id_map"."old_id" = "category_rules"."category_id"
    LIMIT 1
  );
ALTER TABLE "category_rules" ALTER COLUMN "category_id" SET NOT NULL;

-- Recreate foreign keys against the UUID category identifiers
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

-- Remove helper artifacts and the legacy integer sequence
DROP TABLE "category_id_map";
DROP SEQUENCE IF EXISTS "categories_id_seq";
