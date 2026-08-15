import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateAllStudentIds, defaultStudentPassword } from "@/lib/utils";

// Helper: verify requester is admin
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

// GET /api/admin/students — list all students
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  let query = adminSupabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("student_id");

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,student_id.ilike.%${search}%,room_number.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ students: data || [] });
}

// POST /api/admin/students
// body: { action: "generate" | "add", student?: {...} }
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { action } = body;

  // --- Generate all 144 accounts ---
  if (action === "generate") {
    const ids = generateAllStudentIds();
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const studentId of ids) {
      const email = `${studentId.toLowerCase()}@hostel.local`;
      const password = defaultStudentPassword(studentId);
      const roomNumber = studentId.slice(0, -1); // e.g. "201" from "201A"

      // Create auth user
      const { data: authData, error: authError } =
        await adminSupabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            student_id: studentId,
            name: `Student ${studentId}`,
            room_number: roomNumber,
            phone: "",
            role: "student",
          },
        });

      if (authError) {
        if (authError.message.includes("already registered")) {
          results.skipped++;
        } else {
          results.errors.push(`${studentId}: ${authError.message}`);
        }
        continue;
      }

      // Profile is auto-created by trigger; update if needed
      results.created++;
    }

    return NextResponse.json(results);
  }

  // --- Add single student ---
  if (action === "add") {
    const { student_id, name, room_number, phone, password } = body.student || {};

    if (!student_id || !name || !password) {
      return NextResponse.json(
        { error: "student_id, name, and password are required" },
        { status: 400 }
      );
    }

    const email = `${student_id.toLowerCase()}@hostel.local`;

    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          student_id,
          name,
          room_number: room_number || "",
          phone: phone || "",
          role: "student",
        },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: authData.user });
  }

  // --- Import via CSV data ---
  if (action === "import") {
    const { students } = body;
    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "No student data provided" }, { status: 400 });
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const s of students) {
      if (!s.student_id || !s.name) {
        results.errors.push(`Missing required fields for: ${JSON.stringify(s)}`);
        continue;
      }

      const email = `${s.student_id.toLowerCase()}@hostel.local`;
      const password = s.password || defaultStudentPassword(s.student_id);

      const { error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          student_id: s.student_id,
          name: s.name,
          room_number: s.room_number || "",
          phone: s.phone || "",
          role: "student",
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          // Update existing profile instead
          await adminSupabase
            .from("profiles")
            .update({ name: s.name, room_number: s.room_number || "", phone: s.phone || "" })
            .eq("student_id", s.student_id);
          results.skipped++;
        } else {
          results.errors.push(`${s.student_id}: ${authError.message}`);
        }
      } else {
        results.created++;
      }
    }

    return NextResponse.json(results);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
