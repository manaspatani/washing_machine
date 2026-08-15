"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatDisplayDate } from "@/lib/utils";

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  profiles: { name: string; student_id: string; room_number: string };
  machines: { display_name: string };
  time_slots: { label: string; slot_index: number };
}

interface Student { id: string; student_id: string; name: string; }
interface Machine { id: string; display_name: string; }
interface Slot { id: string; label: string; slot_index: number; }

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Manual booking state
  const [createModal, setCreateModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [manualForm, setManualForm] = useState({
    student_id: "", machine_id: "", slot_id: "", booking_date: "",
  });
  const [creating, setCreating] = useState(false);

  async function fetchBookings() {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/bookings?${params}`);
    const json = await res.json();
    if (res.ok) setBookings(json.bookings || []);
    setLoading(false);
  }

  async function fetchFormData() {
    const [sRes, bRes] = await Promise.all([
      fetch("/api/admin/students"),
      fetch(`/api/bookings?date=${new Date().toISOString().split("T")[0]}`),
    ]);
    const sData = await sRes.json();
    const bData = await bRes.json();
    setStudents(sData.students || []);
    setMachines(bData.machines || []);
    setSlots(bData.slots || []);
  }

  useEffect(() => { fetchBookings(); }, [dateFilter, statusFilter]);

  async function cancelBooking(booking: Booking) {
    const reason = prompt("Reason for cancellation (optional):");
    setCancelling(booking.id);
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        booking_id: booking.id,
        student_id: booking.profiles?.student_id,
        reason: reason || "Cancelled by admin",
      }),
    });
    const json = await res.json();
    if (res.ok) {
      toast.success("Booking cancelled.");
      fetchBookings();
    } else {
      toast.error(json.error || "Failed to cancel.");
    }
    setCancelling(null);
  }

  async function createBooking() {
    const { student_id, machine_id, slot_id, booking_date } = manualForm;
    if (!student_id || !machine_id || !slot_id || !booking_date) {
      toast.error("All fields are required.");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", student_id, machine_id, slot_id, booking_date }),
    });
    const json = await res.json();
    if (res.ok) {
      toast.success("Booking created.");
      setCreateModal(false);
      setManualForm({ student_id: "", machine_id: "", slot_id: "", booking_date: "" });
      fetchBookings();
    } else {
      toast.error(json.error || "Failed to create booking.");
    }
    setCreating(false);
  }

  return (
    <div className="page">
      <div className="page-header flex-between flex-wrap gap-12">
        <div>
          <h2>All Bookings</h2>
          <p>{bookings.length} bookings shown</p>
        </div>
        <div className="flex-gap flex-wrap">
          <a href="/api/admin/export" className="btn btn-secondary btn-sm">⬇️ Export CSV</a>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setCreateModal(true); fetchFormData(); }}
          >
            + Manual Booking
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-gap flex-wrap" style={{ marginBottom: 20 }}>
        <input
          type="date"
          className="form-control"
          style={{ width: "auto" }}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <select
          className="form-control"
          style={{ width: "auto" }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setDateFilter(""); setStatusFilter("active"); }}
        >
          Clear Filters
        </button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: 48 }}>
          <div className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <span className="icon">📭</span>
          <h3>No bookings found</h3>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Room</th>
                <th>Machine</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{formatDisplayDate(b.booking_date)}</td>
                  <td>
                    <strong>{b.profiles?.name}</strong>
                    <br />
                    <span className="text-xs text-muted">{b.profiles?.student_id}</span>
                  </td>
                  <td>{b.profiles?.room_number || "—"}</td>
                  <td>{b.machines?.display_name}</td>
                  <td className="text-sm">{b.time_slots?.label}</td>
                  <td>
                    <span className={`badge ${
                      b.status === "active" ? "badge-success" :
                      b.status === "cancelled" ? "badge-danger" : "badge-gray"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    {b.status === "active" && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => cancelBooking(b)}
                        disabled={cancelling === b.id}
                      >
                        {cancelling === b.id ? <span className="spinner" /> : "Cancel"}
                      </button>
                    )}
                    {b.status === "cancelled" && b.cancellation_reason && (
                      <span
                        className="text-xs text-muted"
                        title={b.cancellation_reason}
                      >
                        by {b.cancelled_by}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create booking modal */}
      {createModal && (
        <div className="modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Manual Booking</h3>
              <button className="modal-close" onClick={() => setCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Student</label>
                <select className="form-control" value={manualForm.student_id}
                  onChange={(e) => setManualForm((f) => ({ ...f, student_id: e.target.value }))}>
                  <option value="">Select student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.student_id} — {s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" className="form-control" value={manualForm.booking_date}
                  onChange={(e) => setManualForm((f) => ({ ...f, booking_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Machine</label>
                <select className="form-control" value={manualForm.machine_id}
                  onChange={(e) => setManualForm((f) => ({ ...f, machine_id: e.target.value }))}>
                  <option value="">Select machine...</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>{m.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Time Slot</label>
                <select className="form-control" value={manualForm.slot_id}
                  onChange={(e) => setManualForm((f) => ({ ...f, slot_id: e.target.value }))}>
                  <option value="">Select slot...</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createBooking} disabled={creating}>
                {creating ? <><span className="spinner" /> Creating...</> : "Create Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
