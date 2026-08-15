import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

// GET /api/admin/bookings?date=YYYY-MM-DD&status=active
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const status = searchParams.get("status");
  const studentId = searchParams.get("student_id");

  let query = adminSupabase
    .from("bookings")
    .select(`
      *,
      profiles!bookings_student_id_fkey (name, room_number, phone, student_id),
      machines (display_name, name),
      time_slots (label, start_hour, end_hour, slot_index)
    `)
    .order("booking_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (date) query = query.eq("booking_date", date);
  if (status) query = query.eq("status", status);
  if (studentId) query = query.eq("student_id", studentId);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ bookings: data || [] });
}

// POST /api/admin/bookings
// Admin manually creates or cancels a booking
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { action, booking_id, student_id, machine_id, slot_id, booking_date, reason } = body;

  // Cancel a booking
  if (action === "cancel") {
    const { data, error } = await adminSupabase.rpc("cancel_booking", {
      p_booking_id: booking_id,
      p_student_id: student_id,
      p_cancelled_by: "admin",
      p_reason: reason || "Cancelled by admin",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const result = data as { success: boolean; error?: string };
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({ success: true });
  }

  // Manually create a booking (admin bypass — no date window restriction)
  if (action === "create") {
    if (!student_id || !machine_id || !slot_id || !booking_date) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    // Check if slot is taken
    const { data: existing } = await adminSupabase
      .from("bookings")
      .select("id")
      .eq("machine_id", machine_id)
      .eq("slot_id", slot_id)
      .eq("booking_date", booking_date)
      .eq("status", "active")
      .single();

    if (existing) {
      return NextResponse.json({ error: "This slot is already booked." }, { status: 422 });
    }

    // Check student already has booking that day
    const { data: studentBooking } = await adminSupabase
      .from("bookings")
      .select("id")
      .eq("student_id", student_id)
      .eq("booking_date", booking_date)
      .eq("status", "active")
      .single();

    if (studentBooking) {
      return NextResponse.json(
        { error: "Student already has a booking on this date." },
        { status: 422 }
      );
    }

    const { data, error } = await adminSupabase.from("bookings").insert({
      student_id,
      machine_id,
      slot_id,
      booking_date,
      status: "active",
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify student
    const { data: slotData } = await adminSupabase
      .from("time_slots").select("label").eq("id", slot_id).single();
    const { data: machineData } = await adminSupabase
      .from("machines").select("display_name").eq("id", machine_id).single();

    await adminSupabase.from("notifications").insert({
      student_id,
      title: "Booking Created by Admin",
      message: `Admin has created a booking for you: ${machineData?.display_name}, ${slotData?.label} on ${booking_date}.`,
      type: "booking",
    });

    return NextResponse.json({ success: true, booking: data });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
