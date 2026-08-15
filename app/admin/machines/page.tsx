"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Machine {
  id: string;
  name: string;
  display_name: string;
  is_available: boolean;
  maintenance_note: string | null;
  maintenance_logs: Array<{
    id: string;
    started_at: string;
    ended_at: string | null;
    note: string | null;
  }>;
}

export default function AdminMachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [maintenanceModal, setMaintenanceModal] = useState<Machine | null>(null);
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  async function fetchMachines() {
    setLoading(true);
    const res = await fetch("/api/admin/machines");
    const json = await res.json();
    if (res.ok) setMachines(json.machines || []);
    setLoading(false);
  }

  useEffect(() => { fetchMachines(); }, []);

  async function toggleMaintenance(machine: Machine, makeAvailable: boolean) {
    if (!makeAvailable && !confirm(
      `Mark ${machine.display_name} as UNAVAILABLE? This will cancel all future bookings for this machine.`
    )) return;

    setProcessing(true);
    const res = await fetch("/api/admin/machines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machine_id: machine.id,
        is_available: makeAvailable,
        note: makeAvailable ? null : note,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      toast.success(
        makeAvailable
          ? `${machine.display_name} is now available.`
          : `${machine.display_name} marked for maintenance. ${json.cancelled_bookings} bookings cancelled.`
      );
      setMaintenanceModal(null);
      setNote("");
      fetchMachines();
    } else {
      toast.error(json.error || "Operation failed.");
    }
    setProcessing(false);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
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
        <h2>Machine Management</h2>
        <p>Control machine availability and view maintenance history.</p>
      </div>

      <div className="grid-2">
        {machines.map((machine) => (
          <div key={machine.id} className="card">
            {/* Status indicator */}
            <div
              className="flex-between"
              style={{ marginBottom: 16 }}
            >
              <div className="flex-gap">
                <div
                  style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: machine.is_available ? "var(--success)" : "var(--danger)",
                    boxShadow: machine.is_available
                      ? "0 0 0 3px rgba(16,185,129,0.2)"
                      : "0 0 0 3px rgba(239,68,68,0.2)",
                    flexShrink: 0,
                  }}
                />
                <h3 className="font-semibold">{machine.display_name}</h3>
              </div>
              <span
                className={`badge ${machine.is_available ? "badge-success" : "badge-danger"}`}
              >
                {machine.is_available ? "Available" : "Under Maintenance"}
              </span>
            </div>

            {!machine.is_available && machine.maintenance_note && (
              <div
                style={{
                  background: "var(--danger-light)",
                  border: "1px solid #fca5a5",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontSize: "0.85rem",
                  color: "#991b1b",
                }}
              >
                🔧 {machine.maintenance_note}
              </div>
            )}

            {machine.is_available ? (
              <button
                className="btn btn-danger btn-full"
                onClick={() => { setMaintenanceModal(machine); setNote(""); }}
              >
                Mark as Under Maintenance
              </button>
            ) : (
              <button
                className="btn btn-success btn-full"
                onClick={() => toggleMaintenance(machine, true)}
                disabled={processing}
              >
                {processing ? <><span className="spinner" /> Processing...</> : "Mark as Available"}
              </button>
            )}

            {/* Maintenance history */}
            {machine.maintenance_logs && machine.maintenance_logs.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 className="text-sm font-semibold text-muted" style={{ marginBottom: 8 }}>
                  Recent Maintenance History
                </h4>
                {machine.maintenance_logs.slice(0, 3).map((log) => (
                  <div
                    key={log.id}
                    style={{
                      fontSize: "0.8rem",
                      padding: "6px 0",
                      borderTop: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span>{formatDate(log.started_at)}</span>
                    {log.ended_at && <span> → {formatDate(log.ended_at)}</span>}
                    {log.note && <span> — {log.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Maintenance modal */}
      {maintenanceModal && (
        <div className="modal-overlay" onClick={() => setMaintenanceModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mark {maintenanceModal.display_name} — Maintenance</h3>
              <button className="modal-close" onClick={() => setMaintenanceModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  background: "var(--warning-light)",
                  border: "1px solid #fde68a",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 16px",
                  marginBottom: 16,
                  fontSize: "0.85rem",
                  color: "#92400e",
                }}
              >
                ⚠️ <strong>Warning:</strong> All future bookings for this machine will be
                automatically cancelled and affected students will be notified.
              </div>

              <div className="form-group">
                <label>Maintenance Note (optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g. Motor repair in progress..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setMaintenanceModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => toggleMaintenance(maintenanceModal, false)}
                disabled={processing}
              >
                {processing ? <><span className="spinner" /> Processing...</> : "Confirm Maintenance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
