-- ============================================================
-- Mewad Jain Hostel — Database Reset Script
-- Run this in Supabase SQL Editor to wipe and reset public schema
-- WARNING: This deletes all existing bookings, profiles, and reports!
-- ============================================================

-- 1. Drop public schema clean
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 2. Restore default Supabase roles & permissions
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- 3. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
