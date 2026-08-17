-- ============================================================
-- Mewad Jain Hostel — Database Reset Script
-- Run this in Supabase SQL Editor to wipe and reset public schema
-- WARNING: This deletes all existing bookings, profiles, and reports!
-- ============================================================

-- 1. Drop public schema clean
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 2. Restore default Supabase roles & permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 3. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
