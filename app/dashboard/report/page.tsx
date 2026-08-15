"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Machine {
  id: string;
  display_name: string;
}

export default function ReportPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [form, setForm] = useState({ machine_id: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/bookings?date=" + new Date().toISOString().split("T")[0])
      .then((r) => r.json())
      .then((data) => setMachines(data.machines || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.description.trim().length < 10) {
      toast.error("Please provide a more detailed description (at least 10 characters).");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machine_id: form.machine_id || null,
        description: form.description.trim(),
      }),
    });
    const json = await res.json();

    if (res.ok) {
      toast.success("Issue reported! Admin will look into it soon.");
      setSubmitted(true);
      setForm({ machine_id: "", description: "" });
    } else {
      toast.error(json.error || "Failed to submit report.");
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="page">
        <div className="empty-state" style={{ padding: "80px 20px" }}>
          <span className="icon">✅</span>
          <h3>Report Submitted!</h3>
          <p>The hostel admin has been notified. Thank you for your report.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 20 }}
            onClick={() => setSubmitted(false)}
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Report an Issue</h2>
        <p>Report any problem or misuse with the washing machines.</p>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="machine">Machine (optional)</label>
            <select
              id="machine"
              className="form-control"
              value={form.machine_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, machine_id: e.target.value }))
              }
            >
              <option value="">Select machine (if applicable)</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              className="form-control"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Describe the issue in detail..."
              required
              minLength={10}
            />
            <p className="text-xs text-muted" style={{ marginTop: 4 }}>
              {form.description.length}/10 minimum characters
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner" /> Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
