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

// PATCH /api/admin/students/[id]
// Edit student profile, reset password, block/deactivate
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { name, room_number, phone, is_active, is_blocked, new_password } = body;

  // Update profile fields
  const profileUpdates: Record<string, unknown> = {};
  if (name !== undefined) profileUpdates.name = name;
  if (room_number !== undefined) profileUpdates.room_number = room_number;
  if (phone !== undefined) profileUpdates.phone = phone;
  if (is_active !== undefined) profileUpdates.is_active = is_active;
  if (is_blocked !== undefined) profileUpdates.is_blocked = is_blocked;

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await adminSupabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reset password
  if (new_password) {
    if (new_password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    const { error } = await adminSupabase.auth.admin.updateUserById(id, {
      password: new_password,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/students/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Delete auth user (profile will cascade)
  const { error } = await adminSupabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
