-- ============================================================
-- Mewad Jain Hostel — Supabase Auth & Trigger Repair Script
-- Run this script in your Supabase project SQL Editor:
-- https://supabase.com/dashboard/project/swvuislejzyuilwlwvpx/sql
-- ============================================================

-- 1. Remove corrupted auth.users and profile entries for admin@hostel.local
-- (Direct SQL inserts from previous seed.sql created incomplete auth.users rows without auth.identities)
DELETE FROM auth.users WHERE email = 'admin@hostel.local';
DELETE FROM public.profiles WHERE student_id = 'admin';

-- 2. Update public.handle_new_user() trigger function to safely handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, student_id, name, room_number, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'student_id', 'user_' || substring(NEW.id::text from 1 for 8)),
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
    NEW.raw_user_meta_data->>'room_number',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO UPDATE SET
    student_id = EXCLUDED.student_id,
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Prevent any trigger error from rolling back auth user creation transaction
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure trigger is attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
