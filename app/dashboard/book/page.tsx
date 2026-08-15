"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getBookableDates, formatDisplayDate, isToday } from "@/lib/utils";

interface TimeSlot {
  id: string;
  slot_index: number;
  label: string;
  start_hour: number;
  end_hour: number;
}

interface Machine {
  id: string;
  name: string;
  display_name: string;
  is_available: boolean;
  maintenance_note: string | null;
}

interface BookingEntry {
  id: string;
  machine_id: string;
  slot_id: string;
  student_id: string;
  profiles: {
    name: string;
    room_number: string;
    phone: string;
    student_id: string;
  };
}

interface SlotData {
  slots: TimeSlot[];
  machines: Machine[];
  bookings: BookingEntry[];
  currentUserId: string;
}

interface ModalState {
  open: boolean;
  type: "book" | "view" | null;
  slotId: string | null;
  machineId: string | null;
  machineName: string;
  slotLabel: string;
  booking: BookingEntry | null;
  bookingId: string | null;
  isMyBooking: boolean;
}

export default function BookPage() {
  const dates = getBookableDates();
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [data, setData] = useState<SlotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({
    open: false, type: null, slotId: null, machineId: null,
    machineName: "", slotLabel: "", booking: null, bookingId: null, isMyBooking: false,
  });
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  // Current IST hour for past-slot detection
  const istHour = new Date().getUTCHours() + 5 + (new Date().getUTCMinutes() >= 30 ? 0 : 0);
  const actualISTHour = Math.floor((Date.now() / 1000 / 3600 + 5.5) % 24);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?date=${selectedDate}`);
      const json = await res.json();
      if (res.ok) setData(json);
      else toast.error(json.error || "Failed to load slots");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchSlots();
    // Poll every 30 seconds for real-time-like updates
    const interval = setInterval(fetchSlots, 30000);
    return () => clearInterval(interval);
  }, [fetchSlots]);

  function getSlotStatus(
    slot: TimeSlot,
    machine: Machine
  ): {
    status: "available" | "booked" | "mine" | "maintenance" | "past";
    booking: BookingEntry | null;
    bookingId: string | null;
  } {
    // Machine maintenance
    if (!machine.is_available) {
      return { status: "maintenance", booking: null, bookingId: null };
    }

    // Past slot (today only)
    if (isToday(selectedDate) && slot.start_hour <= actualISTHour) {
      return { status: "past", booking: null, bookingId: null };
    }

    const booking = data?.bookings.find(
      (b) => b.slot_id === slot.id && b.machine_id === machine.id
    ) || null;

    if (!booking) return { status: "available", booking: null, bookingId: null };

    if (booking.student_id === data?.currentUserId) {
      return { status: "mine", booking, bookingId: booking.id };
    }

    return { status: "booked", booking, bookingId: booking.id };
  }

  function openModal(slot: TimeSlot, machine: Machine) {
    const { status, booking, bookingId } = getSlotStatus(slot, machine);

    if (status === "past" || status === "maintenance") return;

    setShowPhone(false);
    setModal({
      open: true,
      type: status === "available" ? "book" : "view",
      slotId: slot.id,
      machineId: machine.id,
      machineName: machine.display_name,
      slotLabel: slot.label,
      booking: booking,
      bookingId: bookingId,
      isMyBooking: status === "mine",
    });
  }

  function closeModal() {
    setModal((m) => ({ ...m, open: false }));
  }

  async function confirmBooking() {
    if (!modal.slotId || !modal.machineId) return;
    setConfirming(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machine_id: modal.machineId,
          slot_id: modal.slotId,
          booking_date: selectedDate,
        }),
      });
      const json = await res.json();

      if (res.ok) {
        toast.success("Slot booked successfully! 🎉");
        closeModal();
        fetchSlots();
      } else {
        toast.error(json.error || "Booking failed.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  async function cancelBooking() {
    if (!modal.bookingId) return;
    setCancelling(true);

    try {
      const res = await fetch(`/api/bookings/${modal.bookingId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok) {
        toast.success("Booking cancelled.");
        closeModal();
        fetchSlots();
      } else {
        toast.error(json.error || "Cancellation failed.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Book a Washing Machine Slot</h2>
        <p>Select a date and choose an available slot.</p>
      </div>

      {/* Date selector */}
      <div className="date-tabs">
        {dates.map((date, i) => (
          <button
            key={date}
            className={`date-tab ${selectedDate === date ? "active" : ""}`}
            onClick={() => setSelectedDate(date)}
          >
            {i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatDisplayDate(date)}
            <br />
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
              {formatDisplayDate(date)}
            </span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="slot-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--slot-available)" }} />
          Available
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--slot-booked)" }} />
          Booked
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--slot-mine)" }} />
          My Booking
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--slot-maintenance)" }} />
          Maintenance
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div className="flex-center" style={{ padding: 60 }}>
            <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
          </div>
        ) : !data ? (
          <div className="empty-state">
            <span className="icon">⚠️</span>
            <h3>Could not load slots</h3>
            <p>Please refresh the page.</p>
          </div>
        ) : (
          <div className="slot-grid-wrapper">
            <table className="slot-grid">
              <thead>
                <tr>
                  <th>Time</th>
                  {data.machines.map((m) => (
                    <th key={m.id}>
                      {m.display_name}
                      {!m.is_available && (
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.7rem",
                            color: "#fca5a5",
                            fontWeight: 400,
                          }}
                        >
                          🔧 Maintenance
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slots.map((slot) => (
                  <tr key={slot.id}>
                    <td>{slot.label}</td>
                    {data.machines.map((machine) => {
                      const { status } = getSlotStatus(slot, machine);
                      return (
                        <td key={machine.id}>
                          <button
                            className={`slot-btn ${status}`}
                            onClick={() => openModal(slot, machine)}
                            disabled={status === "past" || status === "maintenance"}
                            title={
                              status === "maintenance"
                                ? machine.maintenance_note || "Under maintenance"
                                : status === "past"
                                ? "This slot has passed"
                                : undefined
                            }
                          >
                            {status === "available" && "Available"}
                            {status === "booked" && "Booked"}
                            {status === "mine" && "My Booking"}
                            {status === "maintenance" && "Maintenance"}
                            {status === "past" && "Past"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <p className="text-xs text-muted" style={{ marginTop: 12, textAlign: "right" }}>
        ↻ Refreshes every 30 seconds
      </p>

      {/* Modal */}
      {modal.open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modal.type === "book"
                  ? "Confirm Booking"
                  : modal.isMyBooking
                  ? "My Booking"
                  : "Slot Details"}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  background: "var(--bg)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <p className="text-sm text-muted">Machine</p>
                <p className="font-semibold">{modal.machineName}</p>
                <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                  Time Slot
                </p>
                <p className="font-semibold">{modal.slotLabel}</p>
                <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                  Date
                </p>
                <p className="font-semibold">{formatDisplayDate(selectedDate)}</p>
              </div>

              {/* View booking details */}
              {modal.type === "view" && modal.booking && (
                <div>
                  <p className="text-sm text-muted mb-4">Booked by</p>
                  <p className="font-semibold">{modal.booking.profiles.name}</p>
                  <p className="text-sm text-muted">
                    Room {modal.booking.profiles.room_number}
                  </p>

                  {!showPhone ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowPhone(true)}
                      style={{ marginTop: 10 }}
                    >
                      Show Phone Number
                    </button>
                  ) : (
                    <p
                      className="text-sm font-semibold"
                      style={{ marginTop: 8, color: "var(--primary)" }}
                    >
                      📞 {modal.booking.profiles.phone || "Not provided"}
                    </p>
                  )}

                  {modal.isMyBooking && (
                    <div
                      style={{
                        background: "var(--warning-light)",
                        border: "1px solid #fde68a",
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 14px",
                        marginTop: 16,
                        fontSize: "0.82rem",
                        color: "#92400e",
                      }}
                    >
                      ⏰ You can cancel up to 1 hour before the slot starts.
                    </div>
                  )}
                </div>
              )}

              {/* Book confirmation */}
              {modal.type === "book" && (
                <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Are you sure you want to book this slot? You can cancel up to
                  1 hour before the slot start time.
                </p>
              )}
            </div>

            <div className="modal-footer">
              {modal.type === "book" && (
                <>
                  <button className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={confirmBooking}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <>
                        <span className="spinner" />
                        Booking...
                      </>
                    ) : (
                      "Confirm Booking"
                    )}
                  </button>
                </>
              )}

              {modal.type === "view" && modal.isMyBooking && (
                <>
                  <button className="btn btn-secondary" onClick={closeModal}>
                    Close
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={cancelBooking}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <>
                        <span className="spinner" />
                        Cancelling...
                      </>
                    ) : (
                      "Cancel Booking"
                    )}
                  </button>
                </>
              )}

              {modal.type === "view" && !modal.isMyBooking && (
                <button className="btn btn-secondary" onClick={closeModal}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
