import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/bookings/[id]
// Cancel a booking (student can cancel their own; enforces 1-hour cutoff)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Call atomic cancel function
  const { data, error } = await supabase.rpc("cancel_booking", {
    p_booking_id: id,
    p_student_id: user.id,
    p_cancelled_by: "student",
    p_reason: null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data as { success: boolean; error?: string };

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ success: true });
}
