import { NextResponse } from "next/server";
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

// GET /api/admin/export — export bookings as CSV
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await adminSupabase
    .from("bookings")
    .select(`
      id,
      booking_date,
      status,
      cancelled_by,
      cancellation_reason,
      created_at,
      profiles!bookings_student_id_fkey (name, student_id, room_number, phone),
      machines (display_name),
      time_slots (label)
    `)
    .order("booking_date", { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build CSV
  const headers = [
    "Booking ID",
    "Date",
    "Status",
    "Student ID",
    "Student Name",
    "Room",
    "Phone",
    "Machine",
    "Time Slot",
    "Cancelled By",
    "Cancellation Reason",
    "Created At",
  ];

  const rows = (data || []).map((b: any) => [
    b.id,
    b.booking_date,
    b.status,
    b.profiles?.student_id || "",
    b.profiles?.name || "",
    b.profiles?.room_number || "",
    b.profiles?.phone || "",
    b.machines?.display_name || "",
    b.time_slots?.label || "",
    b.cancelled_by || "",
    b.cancellation_reason || "",
    b.created_at,
  ]);

  const csvLines = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csvLines, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="bookings_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
