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

    const adminPassword = "password";
    const primaryEmail = "admin_hostel@hostel.local";
    const legacyEmail = "admin@hostel.local";

    let adminUser: any = null;

    // 1. Try finding existing user by email
    const { data: usersData } = await adminSupabase.auth.admin.listUsers();
    if (usersData?.users) {
      adminUser = usersData.users.find((u) => u.email === primaryEmail || u.email === legacyEmail) || null;
    }

    // 2. If existing user found, update their password
    if (adminUser) {
      await adminSupabase.auth.admin.updateUserById(adminUser.id, {
        password: adminPassword,
        user_metadata: {
          student_id: "admin",
          name: "Hostel Admin",
          room_number: "Office",
          phone: "",
          role: "admin",
        },
      });
    } else {
      // Create admin_hostel@hostel.local
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email: primaryEmail,
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

      if (!createError && newUser?.user) {
        adminUser = newUser.user;
      }
    }

    // 3. Check existing profile row or create profile
    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("student_id", "admin")
      .maybeSingle();

    const targetId = adminUser?.id || existingProfile?.id;
    if (targetId) {
      await adminSupabase.from("profiles").upsert(
        {
          id: targetId,
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
      message: "Admin account setup successfully! You can now log in with ID: admin, Password: password",
      adminId: targetId || null,
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
