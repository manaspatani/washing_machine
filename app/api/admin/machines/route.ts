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

// GET /api/admin/machines
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await adminSupabase
    .from("machines")
    .select("*, maintenance_logs(id, started_at, ended_at, note)")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ machines: data || [] });
}

// POST /api/admin/machines
// body: { machine_id, is_available, note }
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { machine_id, is_available, note } = body;

  if (!machine_id || is_available === undefined) {
    return NextResponse.json(
      { error: "machine_id and is_available are required" },
      { status: 400 }
    );
  }

  const { data, error } = await adminSupabase.rpc("mark_machine_maintenance", {
    p_machine_id: machine_id,
    p_is_available: is_available,
    p_note: note || null,
    p_admin_id: admin.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = data as { success: boolean; cancelled_bookings?: number };
  return NextResponse.json(result);
}
