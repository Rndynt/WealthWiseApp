-- Fix PostgreSQL sequences after seeding data
-- This script updates all sequence values to match existing data

-- Fix users sequence
SELECT setval('users_id_seq', (SELECT COALESCE(max(id), 0) FROM users));

-- Fix roles sequence  
SELECT setval('roles_id_seq', (SELECT COALESCE(max(id), 0) FROM roles));

-- Fix permissions sequence
SELECT setval('permissions_id_seq', (SELECT COALESCE(max(id), 0) FROM permissions));

-- Fix subscription packages sequence
SELECT setval('subscription_packages_id_seq', (SELECT COALESCE(max(id), 0) FROM subscription_packages));

-- Fix workspaces sequence
SELECT setval('workspaces_id_seq', (SELECT COALESCE(max(id), 0) FROM workspaces));

-- Fix workspace members sequence
SELECT setval('workspace_members_id_seq', (SELECT COALESCE(max(id), 0) FROM workspace_members));

-- Fix categories sequence
SELECT setval('categories_id_seq', (SELECT COALESCE(max(id), 0) FROM categories));

-- Fix user subscriptions sequence
SELECT setval('user_subscriptions_id_seq', (SELECT COALESCE(max(id), 0) FROM user_subscriptions));

-- Fix other sequences if they exist
SELECT setval('role_permissions_id_seq', (SELECT COALESCE(max(id), 0) FROM role_permissions));
SELECT setval('workspace_subscriptions_id_seq', (SELECT COALESCE(max(id), 0) FROM workspace_subscriptions));
SELECT setval('accounts_id_seq', (SELECT COALESCE(max(id), 0) FROM accounts));
SELECT setval('transactions_id_seq', (SELECT COALESCE(max(id), 0) FROM transactions));
SELECT setval('budgets_id_seq', (SELECT COALESCE(max(id), 0) FROM budgets));
SELECT setval('debts_id_seq', (SELECT COALESCE(max(id), 0) FROM debts));