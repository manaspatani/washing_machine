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

    // Try listing users first
    let adminUser = null;
    let authError = null;

    const { data: users, error: listError } = await adminSupabase.auth.admin.listUsers();

    if (listError) {
      authError = listError.message;
      // Try direct creation as fallback if listing failed
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
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

      if (!createError && newUser.user) {
        adminUser = newUser.user;
        authError = null;
      } else if (createError) {
        authError = createError.message;
      }
    } else {
      adminUser = users.users.find((u) => u.email === adminEmail) || null;

      if (!adminUser) {
        const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
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
          authError = createError.message;
        } else {
          adminUser = newUser.user;
        }
      } else {
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
    }

    // Ensure profile row exists in public.profiles
    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("student_id", "admin")
      .maybeSingle();

    if (adminUser || existingProfile) {
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
    }

    if (authError && !adminUser) {
      return NextResponse.json(
        {
          error: `Supabase Auth error: ${authError}. Please check your Supabase project status or API keys in .env.local.`,
          details: authError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin account setup successfully! You can now log in with ID: admin, Password: admin@123",
      adminId: adminUser?.id || existingProfile?.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Setup exception", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
