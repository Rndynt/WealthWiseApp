-- Ensure required extensions for UUID generation are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop foreign keys that reference the legacy integer transaction IDs
ALTER TABLE "goal_contributions" DROP CONSTRAINT IF EXISTS "goal_contributions_transaction_id_transactions_id_fk";
ALTER TABLE "goal_match_audits" DROP CONSTRAINT IF EXISTS "goal_match_audits_transaction_id_transactions_id_fk";

-- Convert the transactions primary key to UUID without introducing helper columns
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_pkey";
ALTER TABLE "transactions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "transactions"
  ALTER COLUMN "id"
  TYPE uuid USING (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'transaction:' || "transactions"."id"::text)
  );
ALTER TABLE "transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "transactions" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");

-- Update dependent foreign keys to use the same deterministic UUID mapping
ALTER TABLE "goal_contributions"
  ALTER COLUMN "transaction_id"
  TYPE uuid USING (
    CASE
      WHEN "goal_contributions"."transaction_id" IS NULL THEN NULL
      ELSE uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'transaction:' || "goal_contributions"."transaction_id"::text)
    END
  );

ALTER TABLE "goal_match_audits"
  ALTER COLUMN "transaction_id"
  TYPE uuid USING (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'transaction:' || "goal_match_audits"."transaction_id"::text)
  );
ALTER TABLE "goal_match_audits" ALTER COLUMN "transaction_id" SET NOT NULL;

-- Recreate foreign keys referencing the UUID transaction identifiers
ALTER TABLE "goal_contributions"
  ADD CONSTRAINT "goal_contributions_transaction_id_transactions_id_fk"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "goal_match_audits"
  ADD CONSTRAINT "goal_match_audits_transaction_id_transactions_id_fk"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Remove the legacy integer sequence
DROP SEQUENCE IF EXISTS "transactions_id_seq";
