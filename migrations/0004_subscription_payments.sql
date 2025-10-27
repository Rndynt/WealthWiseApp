CREATE TABLE IF NOT EXISTS "subscription_payments" (
  "id" serial PRIMARY KEY,
  "order_id" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "package_id" integer NOT NULL REFERENCES "subscription_packages"("id") ON DELETE CASCADE,
  "status" text NOT NULL,
  "transaction_id" text,
  "payment_type" text,
  "gross_amount" numeric(12, 2) NOT NULL,
  "fraud_status" text,
  "snap_token" text,
  "snap_redirect_url" text,
  "metadata" json,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "subscription_payments_user_idx" ON "subscription_payments" ("user_id");
