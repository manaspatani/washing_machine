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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Total bookings
  const { count: totalBookings } = await adminSupabase
    .from("bookings").select("*", { count: "exact", head: true });

  // Active bookings
  const { count: activeBookings } = await adminSupabase
    .from("bookings").select("*", { count: "exact", head: true }).eq("status", "active");

  // Cancelled bookings
  const { count: cancelledBookings } = await adminSupabase
    .from("bookings").select("*", { count: "exact", head: true }).eq("status", "cancelled");

  // Bookings by machine
  const { data: byMachine } = await adminSupabase
    .from("bookings")
    .select("machine_id, machines(display_name), status")
    .eq("status", "active");

  const machineStats: Record<string, number> = {};
  (byMachine || []).forEach((b: any) => {
    const name = b.machines?.display_name || "Unknown";
    machineStats[name] = (machineStats[name] || 0) + 1;
  });

  // Busiest slots (top 5)
  const { data: bySlot } = await adminSupabase
    .from("bookings")
    .select("slot_id, time_slots(label), status")
    .neq("status", "cancelled");

  const slotStats: Record<string, number> = {};
  (bySlot || []).forEach((b: any) => {
    const label = b.time_slots?.label || "Unknown";
    slotStats[label] = (slotStats[label] || 0) + 1;
  });

  const busiestSlots = Object.entries(slotStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  // Total students
  const { count: totalStudents } = await adminSupabase
    .from("profiles").select("*", { count: "exact", head: true }).eq("role", "student");

  // Open issue reports
  const { count: openIssues } = await adminSupabase
    .from("issue_reports").select("*", { count: "exact", head: true }).eq("status", "open");

  // Maintenance periods
  const { count: maintenanceLogs } = await adminSupabase
    .from("maintenance_logs").select("*", { count: "exact", head: true });

  return NextResponse.json({
    totalBookings: totalBookings || 0,
    activeBookings: activeBookings || 0,
    cancelledBookings: cancelledBookings || 0,
    totalStudents: totalStudents || 0,
    openIssues: openIssues || 0,
    maintenanceLogs: maintenanceLogs || 0,
    machineStats,
    busiestSlots,
  });
}
