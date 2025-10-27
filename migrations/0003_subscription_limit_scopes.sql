CREATE TABLE IF NOT EXISTS "subscription_package_limits" (
  "id" serial PRIMARY KEY,
  "package_id" integer NOT NULL REFERENCES "subscription_packages"("id") ON DELETE CASCADE,
  "resource" text NOT NULL,
  "scope" text NOT NULL,
  "limit" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_package_limits_package_resource_idx"
  ON "subscription_package_limits" ("package_id", "resource");
