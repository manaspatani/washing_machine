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
-- ADMIN USER CREATION (ID: admin, Password: admin@123)
-- Creates admin in auth.users and public.profiles
-- ============================================================

DO $$
DECLARE
  v_admin_id UUID := uuid_generate_v4();
BEGIN
  -- Insert into auth.users if admin doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@hostel.local') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      'admin@hostel.local',
      crypt('admin@123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"student_id":"admin","name":"Hostel Admin","room_number":"Office","phone":"","role":"admin"}',
      NOW(),
      NOW()
    );

    -- Insert into public.profiles
    INSERT INTO public.profiles (id, student_id, name, room_number, phone, role, is_active, is_blocked)
    VALUES (v_admin_id, 'admin', 'Hostel Admin', 'Office', '', 'admin', true, false)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', student_id = 'admin';
  END IF;
END $$;
