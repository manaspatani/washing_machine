import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/bookings?date=YYYY-MM-DD
// Returns all slot statuses for a given date (both machines)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all time slots
  const { data: slots } = await supabase
    .from("time_slots")
    .select("*")
    .order("slot_index");

  // Get all machines
  const { data: machines } = await supabase
    .from("machines")
    .select("*")
    .order("name");

  // Get all active bookings for this date with student details
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id,
      machine_id,
      slot_id,
      booking_date,
      status,
      student_id,
      profiles!bookings_student_id_fkey (
        name,
        room_number,
        phone,
        student_id
      )
    `)
    .eq("booking_date", date)
    .eq("status", "active");

  return NextResponse.json({
    slots: slots || [],
    machines: machines || [],
    bookings: bookings || [],
    currentUserId: user.id,
  });
}

// POST /api/bookings
// Create a booking using the atomic DB function
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { machine_id, slot_id, booking_date } = body;

  if (!machine_id || !slot_id || !booking_date) {
    return NextResponse.json(
      { error: "machine_id, slot_id, and booking_date are required" },
      { status: 400 }
    );
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  // Call the atomic PostgreSQL function — all rules enforced inside
  const { data, error } = await supabase.rpc("create_booking", {
    p_student_id: user.id,
    p_machine_id: machine_id,
    p_slot_id: slot_id,
    p_booking_date: booking_date,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data as { success: boolean; error?: string; booking_id?: string };

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ success: true, booking_id: result.booking_id });
}
