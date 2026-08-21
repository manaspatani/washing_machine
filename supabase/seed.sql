-- ============================================================
-- Supabase Seed Data
-- Run AFTER schema.sql
-- Creates: time slots, machines, admin user
-- ============================================================

-- Enable pgcrypto extension for password hashing if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert 9 time slots
INSERT INTO public.time_slots (slot_index, label, start_hour, end_hour) VALUES
  (1, '6:00 AM – 8:00 AM',   6,  8),
  (2, '8:00 AM – 10:00 AM',  8,  10),
  (3, '10:00 AM – 12:00 PM', 10, 12),
  (4, '12:00 PM – 2:00 PM',  12, 14),
  (5, '2:00 PM – 4:00 PM',   14, 16),
  (6, '4:00 PM – 6:00 PM',   16, 18),
  (7, '6:00 PM – 8:00 PM',   18, 20),
  (8, '8:00 PM – 10:00 PM',  20, 22),
  (9, '10:00 PM – 12:00 AM', 22, 24)
ON CONFLICT DO NOTHING;

-- Insert 2 machines
INSERT INTO public.machines (name, display_name, is_available) VALUES
  ('left',  'Left Machine',  true),
  ('right', 'Right Machine', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ADMIN USER INITIALIZATION
-- Note: Admin user creation should NOT be done via direct SQL INSERT into auth.users,
-- because GoTrue requires matching auth.identities records.
-- Use the /api/setup endpoint (or click "Initialize / Reset Admin Account" in the app)
-- to create the admin account safely via the Supabase Admin API.
-- ============================================================

