-- Ensure pgcrypto extension is available for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Map existing integer transaction IDs to new UUID values
CREATE TABLE "transactions_id_map" AS
SELECT "id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "transactions";

-- Drop foreign keys that reference the legacy integer transaction IDs
ALTER TABLE "goal_contributions" DROP CONSTRAINT IF EXISTS "goal_contributions_transaction_id_transactions_id_fk";
ALTER TABLE "goal_match_audits" DROP CONSTRAINT IF EXISTS "goal_match_audits_transaction_id_transactions_id_fk";

-- Prepare transactions table with the new UUID identifier
ALTER TABLE "transactions" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
UPDATE "transactions"
SET "new_id" = (
  SELECT "new_id"
  FROM "transactions_id_map"
  WHERE "transactions_id_map"."old_id" = "transactions"."id"
);
ALTER TABLE "transactions" ALTER COLUMN "new_id" SET NOT NULL;

-- Propagate the new UUIDs to dependent tables
ALTER TABLE "goal_contributions" ADD COLUMN "new_transaction_id" uuid;
UPDATE "goal_contributions" gc
SET "new_transaction_id" = (
  SELECT "new_id"
  FROM "transactions_id_map"
  WHERE "transactions_id_map"."old_id" = gc."transaction_id"
);

ALTER TABLE "goal_match_audits" ADD COLUMN "new_transaction_id" uuid;
UPDATE "goal_match_audits" gma
SET "new_transaction_id" = (
  SELECT "new_id"
  FROM "transactions_id_map"
  WHERE "transactions_id_map"."old_id" = gma."transaction_id"
);
ALTER TABLE "goal_match_audits" ALTER COLUMN "new_transaction_id" SET NOT NULL;

-- Swap legacy identifiers with the new UUID columns
ALTER TABLE "goal_contributions" DROP COLUMN "transaction_id";
ALTER TABLE "goal_contributions" RENAME COLUMN "new_transaction_id" TO "transaction_id";

ALTER TABLE "goal_match_audits" DROP COLUMN "transaction_id";
ALTER TABLE "goal_match_audits" RENAME COLUMN "new_transaction_id" TO "transaction_id";

ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_pkey";
ALTER TABLE "transactions" DROP COLUMN "id";
ALTER TABLE "transactions" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");

-- Recreate foreign keys using the UUID identifiers
ALTER TABLE "goal_contributions"
  ADD CONSTRAINT "goal_contributions_transaction_id_transactions_id_fk"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "goal_match_audits"
  ADD CONSTRAINT "goal_match_audits_transaction_id_transactions_id_fk"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Clean up temporary artifacts
DROP TABLE "transactions_id_map";
DROP SEQUENCE IF EXISTS "transactions_id_seq";
