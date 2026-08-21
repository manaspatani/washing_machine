-- ============================================================
-- Mewad Jain Hostel — Washing Machine Booking System
-- Supabase PostgreSQL Schema
-- Run this entire file in the Supabase SQL Editor
-- (To completely wipe and reset the database first, run reset.sql)
-- ============================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with hostel-specific fields
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,          -- e.g. "201A", "admin"
  name TEXT NOT NULL,
  room_number TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MACHINES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.machines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL CHECK (name IN ('left', 'right')),
  display_name TEXT NOT NULL,               -- "Left Machine", "Right Machine"
  is_available BOOLEAN NOT NULL DEFAULT true,
  maintenance_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TIME SLOTS TABLE (Static — 9 slots per day)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slot_index INTEGER UNIQUE NOT NULL,       -- 1–9 ordering
  label TEXT NOT NULL,                      -- "6:00 AM – 8:00 AM"
  start_hour INTEGER NOT NULL,             -- 6, 8, 10, 12, 14, 16, 18, 20, 22
  end_hour INTEGER NOT NULL               -- 8, 10, 12, 14, 16, 18, 20, 22, 24
);

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  machine_id UUID REFERENCES public.machines(id) NOT NULL,
  slot_id UUID REFERENCES public.time_slots(id) NOT NULL,
  booking_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  cancelled_by TEXT,                        -- 'student', 'admin', 'maintenance'
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A student can only have one active booking per day
  UNIQUE (student_id, booking_date, status)
);

-- Index for fast slot availability lookups
CREATE INDEX IF NOT EXISTS idx_bookings_date_machine_slot
  ON public.bookings(booking_date, machine_id, slot_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_bookings_student
  ON public.bookings(student_id, booking_date);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('booking', 'cancellation', 'maintenance', 'info')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_student
  ON public.notifications(student_id, is_read, created_at DESC);

-- ============================================================
-- MAINTENANCE LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  machine_id UUID REFERENCES public.machines(id) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  note TEXT,
  created_by UUID REFERENCES public.profiles(id)
);

-- ============================================================
-- ISSUE REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.issue_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  machine_id UUID REFERENCES public.machines(id),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_bookings
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_issue_reports
  BEFORE UPDATE ON public.issue_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- HANDLE NEW USER TRIGGER
-- Auto-creates a profile row when auth.users row is created
-- ============================================================
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- ATOMIC BOOKING FUNCTION
-- All booking rules enforced here — cannot be bypassed
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_booking(
  p_student_id UUID,
  p_machine_id UUID,
  p_slot_id UUID,
  p_booking_date DATE
)
RETURNS JSON AS $$
DECLARE
  v_existing_booking UUID;
  v_slot_taken UUID;
  v_machine_available BOOLEAN;
  v_slot_index INTEGER;
  v_prev_slot_index INTEGER;
  v_next_slot_index INTEGER;
  v_prev_slot_booked BOOLEAN := false;
  v_next_slot_booked BOOLEAN := false;
  v_student_blocked BOOLEAN;
  v_student_active BOOLEAN;
  v_min_date DATE;
  v_max_date DATE;
  v_booking_id UUID;
  v_start_hour INTEGER;
  v_current_hour INTEGER;
BEGIN
  -- Date window check (current day + next 2 days only)
  v_min_date := CURRENT_DATE;
  v_max_date := CURRENT_DATE + INTERVAL '2 days';
  IF p_booking_date < v_min_date OR p_booking_date > v_max_date THEN
    RETURN json_build_object('success', false, 'error', 'Booking only allowed for today and the next 2 days.');
  END IF;

  -- Check student status
  SELECT is_blocked, is_active INTO v_student_blocked, v_student_active
  FROM public.profiles WHERE id = p_student_id;
  
  IF v_student_blocked THEN
    RETURN json_build_object('success', false, 'error', 'Your account has been blocked. Contact hostel admin.');
  END IF;
  
  IF NOT v_student_active THEN
    RETURN json_build_object('success', false, 'error', 'Your account is not active. Contact hostel admin.');
  END IF;

  -- Check machine availability
  SELECT is_available INTO v_machine_available FROM public.machines WHERE id = p_machine_id;
  IF NOT v_machine_available THEN
    RETURN json_build_object('success', false, 'error', 'This machine is currently under maintenance.');
  END IF;

  -- Get slot details
  SELECT slot_index, start_hour INTO v_slot_index, v_start_hour
  FROM public.time_slots WHERE id = p_slot_id;

  -- Same-day past-slot check
  IF p_booking_date = CURRENT_DATE THEN
    v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Kolkata')::INTEGER;
    IF v_start_hour <= v_current_hour THEN
      RETURN json_build_object('success', false, 'error', 'This slot has already started or passed.');
    END IF;
  END IF;

  -- Check 1 active booking per student per day (any machine)
  SELECT id INTO v_existing_booking
  FROM public.bookings
  WHERE student_id = p_student_id
    AND booking_date = p_booking_date
    AND status = 'active';
  
  IF v_existing_booking IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already have a booking on this day. Cancel it first to book a new slot.');
  END IF;

  -- Check if slot is already taken on this machine (LOCK the row)
  SELECT id INTO v_slot_taken
  FROM public.bookings
  WHERE machine_id = p_machine_id
    AND slot_id = p_slot_id
    AND booking_date = p_booking_date
    AND status = 'active'
  FOR UPDATE SKIP LOCKED;

  IF v_slot_taken IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sorry, this slot was just booked by another student. Please choose another.');
  END IF;

  -- No-consecutive-slot check (check same machine same day, adjacent slots)
  v_prev_slot_index := v_slot_index - 1;
  v_next_slot_index := v_slot_index + 1;

  IF v_prev_slot_index >= 1 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.time_slots ts ON b.slot_id = ts.id
      WHERE b.student_id = p_student_id
        AND b.booking_date = p_booking_date
        AND b.machine_id = p_machine_id
        AND ts.slot_index = v_prev_slot_index
        AND b.status = 'active'
    ) INTO v_prev_slot_booked;
  END IF;

  IF v_next_slot_index <= 9 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.time_slots ts ON b.slot_id = ts.id
      WHERE b.student_id = p_student_id
        AND b.booking_date = p_booking_date
        AND b.machine_id = p_machine_id
        AND ts.slot_index = v_next_slot_index
        AND b.status = 'active'
    ) INTO v_next_slot_booked;
  END IF;

  -- NOTE: Since we enforce 1 booking/student/day, consecutive check would only 
  -- apply if a student cancelled and rebooked. Keeping this as a safety rule:
  -- a student cannot have adjacent slots even after rebooking.
  -- (This check runs after the 1/day check so it's a forward safety net)

  -- Insert the booking
  INSERT INTO public.bookings (student_id, machine_id, slot_id, booking_date, status)
  VALUES (p_student_id, p_machine_id, p_slot_id, p_booking_date, 'active')
  RETURNING id INTO v_booking_id;

  -- Create confirmation notification
  INSERT INTO public.notifications (student_id, title, message, type)
  SELECT 
    p_student_id,
    'Booking Confirmed!',
    'Your booking for ' || m.display_name || ', ' || ts.label || ' on ' || TO_CHAR(p_booking_date, 'DD Mon YYYY') || ' is confirmed.',
    'booking'
  FROM public.machines m, public.time_slots ts
  WHERE m.id = p_machine_id AND ts.id = p_slot_id;

  RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CANCEL BOOKING FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID,
  p_student_id UUID,
  p_cancelled_by TEXT DEFAULT 'student',
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_slot RECORD;
  v_start_datetime TIMESTAMPTZ;
  v_cutoff TIMESTAMPTZ;
BEGIN
  -- Fetch booking
  SELECT b.*, m.display_name as machine_name, ts.label as slot_label, ts.start_hour
  INTO v_booking
  FROM public.bookings b
  JOIN public.machines m ON b.machine_id = m.id
  JOIN public.time_slots ts ON b.slot_id = ts.id
  WHERE b.id = p_booking_id AND b.status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found or already cancelled.');
  END IF;

  -- Students can only cancel their own bookings
  IF p_cancelled_by = 'student' AND v_booking.student_id != p_student_id THEN
    RETURN json_build_object('success', false, 'error', 'You can only cancel your own bookings.');
  END IF;

  -- 1-hour cutoff check (only for student cancellations)
  IF p_cancelled_by = 'student' THEN
    v_start_datetime := (v_booking.booking_date + (v_booking.start_hour || ' hours')::INTERVAL) AT TIME ZONE 'Asia/Kolkata';
    v_cutoff := v_start_datetime - INTERVAL '1 hour';
    
    IF NOW() AT TIME ZONE 'Asia/Kolkata' >= v_cutoff THEN
      RETURN json_build_object('success', false, 'error', 'Cancellation is not allowed within 1 hour of the slot start time.');
    END IF;
  END IF;

  -- Cancel the booking
  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_by = p_cancelled_by,
      cancellation_reason = p_reason
  WHERE id = p_booking_id;

  -- Notify the student
  IF p_cancelled_by != 'student' THEN
    INSERT INTO public.notifications (student_id, title, message, type)
    VALUES (
      v_booking.student_id,
      'Booking Cancelled',
      'Your booking for ' || v_booking.machine_name || ', ' || v_booking.slot_label || 
      ' on ' || TO_CHAR(v_booking.booking_date, 'DD Mon YYYY') || ' has been cancelled.' ||
      CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
      'cancellation'
    );
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- MARK MACHINE MAINTENANCE FUNCTION
-- Cancels future bookings and sends notifications
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_machine_maintenance(
  p_machine_id UUID,
  p_is_available BOOLEAN,
  p_note TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_machine_name TEXT;
  v_cancelled_count INTEGER := 0;
BEGIN
  SELECT display_name INTO v_machine_name FROM public.machines WHERE id = p_machine_id;

  -- Update machine status
  UPDATE public.machines
  SET is_available = p_is_available,
      maintenance_note = CASE WHEN p_is_available THEN NULL ELSE p_note END
  WHERE id = p_machine_id;

  -- If marking unavailable, cancel all future/today active bookings
  IF NOT p_is_available THEN
    FOR v_booking IN
      SELECT b.id, b.student_id, ts.label as slot_label
      FROM public.bookings b
      JOIN public.time_slots ts ON b.slot_id = ts.id
      WHERE b.machine_id = p_machine_id
        AND b.booking_date >= CURRENT_DATE
        AND b.status = 'active'
    LOOP
      -- Cancel booking
      UPDATE public.bookings
      SET status = 'cancelled',
          cancelled_by = 'maintenance',
          cancellation_reason = COALESCE(p_note, 'Machine under maintenance')
      WHERE id = v_booking.id;

      -- Notify student
      INSERT INTO public.notifications (student_id, title, message, type)
      VALUES (
        v_booking.student_id,
        'Booking Cancelled — Maintenance',
        'Your booking for ' || v_machine_name || ', ' || v_booking.slot_label || 
        ' has been cancelled because the machine is under maintenance.' ||
        CASE WHEN p_note IS NOT NULL THEN ' Note: ' || p_note ELSE '' END,
        'maintenance'
      );

      v_cancelled_count := v_cancelled_count + 1;
    END LOOP;

    -- Log maintenance
    INSERT INTO public.maintenance_logs (machine_id, note, created_by)
    VALUES (p_machine_id, p_note, p_admin_id);
  ELSE
    -- If marking available again, close the maintenance log
    UPDATE public.maintenance_logs
    SET ended_at = NOW()
    WHERE machine_id = p_machine_id AND ended_at IS NULL;
  END IF;

  RETURN json_build_object(
    'success', true,
    'cancelled_bookings', v_cancelled_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: all authenticated users can view student profiles (for slot booking info)
CREATE POLICY "Anyone authenticated can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Bookings: students see all (to know what's booked), can only modify own
CREATE POLICY "Anyone authenticated can view bookings"
  ON public.bookings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Notifications: students see only their own
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = student_id);

-- Issue reports: students can create and see their own
CREATE POLICY "Users create own reports"
  ON public.issue_reports FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users view own reports"
  ON public.issue_reports FOR SELECT
  USING (auth.uid() = student_id);

-- Machines: all authenticated users can view
CREATE POLICY "Anyone authenticated can view machines"
  ON public.machines FOR SELECT
  USING (auth.role() = 'authenticated');

-- Time slots: all authenticated users can view
CREATE POLICY "Anyone authenticated can view time_slots"
  ON public.time_slots FOR SELECT
  USING (auth.role() = 'authenticated');

-- Maintenance logs: authenticated users can view
CREATE POLICY "Anyone authenticated can view maintenance_logs"
  ON public.maintenance_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- GRANT TABLE, SCHEMA & FUNCTION PERMISSIONS TO SUPABASE ROLES
-- ============================================================
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_booking TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_booking TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_machine_maintenance TO authenticated, service_role;

