"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDisplayDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  machines: { display_name: string };
  time_slots: { label: string; start_hour: number };
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function fetchBookings() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        machines (display_name),
        time_slots (label, start_hour)
      `)
      .eq("student_id", user.id)
      .order("booking_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) toast.error("Failed to load bookings");
    else setBookings((data as Booking[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchBookings(); }, []);

  async function cancelBooking(id: string) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(id);

    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    const json = await res.json();

    if (res.ok) {
      toast.success("Booking cancelled.");
      fetchBookings();
    } else {
      toast.error(json.error || "Cancellation failed.");
    }
    setCancelling(null);
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = bookings.filter(
    (b) => b.status === "active" && b.booking_date >= today
  );
  const history = bookings.filter(
    (b) => b.status !== "active" || b.booking_date < today
  );

  function canCancel(booking: Booking): boolean {
    if (booking.status !== "active") return false;
    const istNow = Date.now() + 5.5 * 60 * 60 * 1000;
    const slotStart =
      new Date(booking.booking_date + "T00:00:00").getTime() +
      booking.time_slots.start_hour * 60 * 60 * 1000;
    return istNow < slotStart - 60 * 60 * 1000;
  }

  if (loading) {
    return (
      <div className="page flex-center" style={{ minHeight: "60vh" }}>
        <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Bookings</h2>
        <p>View and manage your upcoming and past bookings.</p>
      </div>

      {/* Upcoming */}
      <h3 className="font-semibold" style={{ marginBottom: 12 }}>
        Upcoming Bookings
      </h3>
      {upcoming.length === 0 ? (
        <div className="card card-sm mb-24">
          <div className="empty-state" style={{ padding: "28px 0" }}>
            <span className="icon">📭</span>
            <h3>No upcoming bookings</h3>
            <p>Head to Book a Slot to make a reservation.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {upcoming.map((b) => (
            <div key={b.id} className="booking-card">
              <div className="booking-card-info">
                <h4>{b.machines.display_name} — {b.time_slots.label}</h4>
                <p>{formatDisplayDate(b.booking_date)}</p>
              </div>
              <div className="flex-gap">
                <span className="badge badge-success">Active</span>
                {canCancel(b) && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => cancelBooking(b.id)}
                    disabled={cancelling === b.id}
                  >
                    {cancelling === b.id ? (
                      <span className="spinner" />
                    ) : (
                      "Cancel"
                    )}
                  </button>
                )}
                {!canCancel(b) && (
                  <span
                    className="text-xs text-muted"
                    title="Cannot cancel within 1 hour of slot start"
                  >
                    Locked
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      <h3 className="font-semibold" style={{ marginBottom: 12 }}>
        Booking History
      </h3>
      {history.length === 0 ? (
        <div className="card card-sm">
          <div className="empty-state" style={{ padding: "28px 0" }}>
            <span className="icon">🗂️</span>
            <h3>No booking history yet</h3>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {history.map((b) => (
            <div key={b.id} className="booking-card" style={{ opacity: 0.8 }}>
              <div className="booking-card-info">
                <h4>{b.machines.display_name} — {b.time_slots.label}</h4>
                <p>
                  {formatDisplayDate(b.booking_date)}
                  {b.cancellation_reason && (
                    <span style={{ marginLeft: 8, color: "var(--danger)" }}>
                      • {b.cancellation_reason}
                    </span>
                  )}
                </p>
              </div>
              <span
                className={`badge ${
                  b.status === "cancelled" ? "badge-danger" : "badge-gray"
                }`}
              >
                {b.status === "cancelled"
                  ? `Cancelled by ${b.cancelled_by || "student"}`
                  : b.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
