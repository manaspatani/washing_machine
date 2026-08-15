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
    const adminEmail = "admin@hostel.local";
    const adminPassword = "admin@123";

    // Check if admin user already exists in auth.users
    const { data: users, error: listError } = await adminSupabase.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json(
        {
          error: "Failed to query Supabase Auth. Check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local",
          details: listError.message,
        },
        { status: 500 }
      );
    }

    let adminUser = users.users.find((u) => u.email === adminEmail);

    if (!adminUser) {
      // Create the admin user
      const { data: newUser, error: createError } =
        await adminSupabase.auth.admin.createUser({
          email: adminEmail,
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

      if (createError) {
        return NextResponse.json(
          { error: "Failed to create admin user", details: createError.message },
          { status: 500 }
        );
      }
      adminUser = newUser.user;
    } else {
      // Password reset to 'admin' to ensure admin can log in
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
    }

    // Ensure profile row exists in public.profiles with role = 'admin'
    if (adminUser) {
      const { error: profileError } = await adminSupabase
        .from("profiles")
        .upsert(
          {
            id: adminUser.id,
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

      if (profileError) {
        console.error("Profile upsert error:", profileError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Admin account setup successfully! You can now log in with ID: admin, Password: admin@123",
      adminId: adminUser?.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Setup exception", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
