-- ============================================================
-- Mewad Jain Hostel — Complete Database & Table Structure Reset Script
-- Run this in Supabase SQL Editor to wipe all tables, triggers, policies & auth users
-- WARNING: This will completely wipe all database tables, student accounts, and bookings!
-- After running this script, run schema.sql and then seed.sql to rebuild the database.
-- ============================================================

-- 1. Wipe all auth users and identities (removes previous test/student accounts)
TRUNCATE auth.identities CASCADE;
DELETE FROM auth.users;

-- 2. Drop public schema clean (removes all tables, triggers, functions, views & RLS policies)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 3. Restore default Supabase permissions for public schema
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- 4. Re-enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
