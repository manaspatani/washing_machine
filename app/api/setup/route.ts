import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  return handleSetup();
}

export async function POST() {
  return handleSetup();
}

async function handleSetup() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes("placeholder") || serviceRoleKey.includes("placeholder")) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase environment variables are missing or contain placeholder values. Please check .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 400 }
      );
    }

    const adminPassword = "admin@123";
    const emails = ["admin@hostel.local", "admin_hostel@hostel.local"];
    let primaryUserId: string | null = null;

    // 1. Fetch existing users list
    const { data: usersData } = await adminSupabase.auth.admin.listUsers();
    const existingUsers = usersData?.users || [];

    for (const email of emails) {
      const existing = existingUsers.find((u) => u.email === email);
      if (existing) {
        await adminSupabase.auth.admin.updateUserById(existing.id, {
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            student_id: "admin",
            name: "Hostel Admin",
            room_number: "Office",
            phone: "",
            role: "admin",
          },
        });
        if (!primaryUserId) primaryUserId = existing.id;
      } else {
        const { data: newUser } = await adminSupabase.auth.admin.createUser({
          email,
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            student_id: "admin",
            name: "Hostel Admin",
            room_number: "Office",
            phone: "",
            role: "admin",
          },
        });
        if (newUser?.user && !primaryUserId) {
          primaryUserId = newUser.user.id;
        }
      }
    }

    // 2. Ensure profile exists and role = 'admin'
    if (primaryUserId) {
      await adminSupabase.from("profiles").upsert(
        {
          id: primaryUserId,
          student_id: "admin",
          name: "Hostel Admin",
          room_number: "Office",
          phone: "",
          role: "admin",
          is_active: true,
          is_blocked: false,
        },
        { onConflict: "id" }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin account setup successfully! You can now log in with ID: admin, Password: admin@123",
      adminId: primaryUserId,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Setup exception encountered.",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
