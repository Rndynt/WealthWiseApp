DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_type') THEN
    CREATE TYPE subscription_type AS ENUM ('personal', 'shared');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_type') THEN
    CREATE TYPE workspace_type AS ENUM ('personal', 'shared');
  END IF;
END $$;

-- Normalize existing subscription package type values before applying enum
UPDATE subscription_packages
SET type = CASE
  WHEN type IN ('shared', 'hybrid', 'business') THEN 'shared'
  ELSE 'personal'
END;

ALTER TABLE subscription_packages ALTER COLUMN type DROP DEFAULT;
ALTER TABLE subscription_packages
  ALTER COLUMN type TYPE subscription_type
  USING CASE
    WHEN type = 'shared' THEN 'shared'::subscription_type
    ELSE 'personal'::subscription_type
  END;
ALTER TABLE subscription_packages ALTER COLUMN type SET DEFAULT 'personal';

-- Normalize workspace types before applying enum
UPDATE workspaces
SET type = CASE
  WHEN type IN ('shared', 'family', 'business') THEN 'shared'
  ELSE 'personal'
END;

ALTER TABLE workspaces
  ALTER COLUMN type TYPE workspace_type
  USING CASE
    WHEN type = 'shared' THEN 'shared'::workspace_type
    ELSE 'personal'::workspace_type
  END;
ALTER TABLE workspaces ALTER COLUMN type SET DEFAULT 'personal';
