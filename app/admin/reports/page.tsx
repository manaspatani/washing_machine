"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface IssueReport {
  id: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  admin_note: string | null;
  created_at: string;
  profiles: {
    name: string;
    student_id: string;
    room_number: string;
    phone: string;
  };
  machines: {
    display_name: string;
  } | null;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<IssueReport | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [newStatus, setNewStatus] = useState<"open" | "in_progress" | "resolved">("open");

  async function fetchReports() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/reports?${params.toString()}`);
    const json = await res.json();
    if (res.ok) setReports(json.reports || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  async function handleUpdateStatus() {
    if (!selectedReport) return;
    setUpdatingId(selectedReport.id);
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedReport.id,
        status: newStatus,
        admin_note: adminNote.trim() || null,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      toast.success("Issue report updated.");
      setSelectedReport(null);
      fetchReports();
    } else {
      toast.error(json.error || "Failed to update report.");
    }
    setUpdatingId(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
      <div className="page-header flex-between flex-wrap gap-12">
        <div>
          <h2>Reported Issues</h2>
          <p>View and manage problems reported by students.</p>
        </div>
        <div className="flex-gap">
          <select
            className="form-control"
            style={{ width: "auto" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">
          <span className="icon">✅</span>
          <h3>No reported issues found</h3>
          <p>All clean! No student issues match your filter.</p>
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
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="text-xs text-muted" style={{ whiteSpace: "nowrap" }}>
                    {formatDate(report.created_at)}
                  </td>
                  <td>
                    <strong>{report.profiles?.name || "Unknown"}</strong>
                    <br />
                    <span className="text-xs text-muted">
                      {report.profiles?.student_id}
                    </span>
                  </td>
                  <td>{report.profiles?.room_number || "—"}</td>
                  <td>{report.machines?.display_name || "General"}</td>
                  <td style={{ maxWidth: 300, fontSize: "0.85rem" }}>
                    {report.description}
                    {report.admin_note && (
                      <div
                        className="text-xs"
                        style={{
                          marginTop: 4,
                          padding: "4px 8px",
                          background: "var(--info-light)",
                          borderRadius: 4,
                          color: "#1e40af",
                        }}
                      >
                        <strong>Note:</strong> {report.admin_note}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        report.status === "open"
                          ? "badge-warning"
                          : report.status === "in_progress"
                          ? "badge-info"
                          : "badge-success"
                      }`}
                    >
                      {report.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedReport(report);
                        setNewStatus(report.status);
                        setAdminNote(report.admin_note || "");
                      }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manage Report — {selectedReport.profiles?.student_id}</h3>
              <button
                className="modal-close"
                onClick={() => setSelectedReport(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  background: "var(--bg)",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: 16,
                  fontSize: "0.875rem",
                }}
              >
                <p>
                  <strong>Reported by:</strong> {selectedReport.profiles?.name} (Room{" "}
                  {selectedReport.profiles?.room_number})
                </p>
                {selectedReport.profiles?.phone && (
                  <p>
                    <strong>Phone:</strong> {selectedReport.profiles?.phone}
                  </p>
                )}
                <p style={{ marginTop: 8 }}>
                  <strong>Description:</strong> {selectedReport.description}
                </p>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  className="form-control"
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(
                      e.target.value as "open" | "in_progress" | "resolved"
                    )
                  }
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="form-group">
                <label>Admin Note (optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g. Technician called, component replaced..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedReport(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateStatus}
                disabled={updatingId === selectedReport.id}
              >
                {updatingId === selectedReport.id ? (
                  <>
                    <span className="spinner" /> Saving...
                  </>
                ) : (
                  "Update Report"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
