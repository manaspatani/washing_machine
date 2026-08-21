"use client";

import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

interface Student {
  id: string;
  student_id: string;
  name: string;
  room_number: string;
  phone: string;
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
}

interface EditForm {
  name: string;
  room_number: string;
  phone: string;
  is_active: boolean;
  is_blocked: boolean;
  new_password: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "", room_number: "", phone: "",
    is_active: true, is_blocked: false, new_password: "",
  });
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    student_id: "", name: "", room_number: "", phone: "", password: "",
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchStudents() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (res.ok) {
        setStudents(json.students || []);
      } else {
        toast.error(json.error || "Failed to load students list.");
        setStudents([]);
      }
    } catch {
      toast.error("Failed to connect to server.");
    }
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(fetchStudents, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function generateAll() {
    if (!confirm("This will create all 144 hostel student accounts. Existing accounts will be skipped. Continue?")) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Created: ${json.created}, Skipped: ${json.skipped}${json.errors?.length ? `, Errors: ${json.errors.length}` : ""}`);
        if (json.errors?.length) {
          toast.error(`First error: ${json.errors[0]}`);
        }
        fetchStudents();
      } else {
        toast.error(json.error || "Generation failed.");
      }
    } catch {
      toast.error("Generation failed due to network error.");
    }
    setGenerating(false);
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, string>[];

      const students = rows.map((row) => ({
        student_id: row["student_id"] || row["Student ID"] || row["ID"] || "",
        name: row["name"] || row["Name"] || row["Full Name"] || "",
        room_number: row["room_number"] || row["Room"] || row["Room Number"] || "",
        phone: row["phone"] || row["Phone"] || row["Mobile"] || "",
        password: row["password"] || row["Password"] || "",
      })).filter((s) => s.student_id && s.name);

      if (students.length === 0) {
        toast.error("No valid rows found. Ensure CSV has columns: student_id, name, room_number, phone");
        setImporting(false);
        return;
      }

      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", students }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Imported ${json.created} students. Skipped: ${json.skipped}`);
        if (json.errors?.length) {
          toast.error(`Error: ${json.errors[0]}`);
        }
        fetchStudents();
      } else {
        toast.error(json.error || "Import failed.");
      }
    } catch (err) {
      toast.error("Failed to parse file.");
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function saveEdit() {
    if (!editStudent) return;
    setSaving(true);
    const res = await fetch(`/api/admin/students/${editStudent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const json = await res.json();
    if (res.ok) {
      toast.success("Student updated.");
      setEditStudent(null);
      fetchStudents();
    } else {
      toast.error(json.error || "Update failed.");
    }
    setSaving(false);
  }

  async function deleteStudent(s: Student) {
    if (!confirm(`Delete student ${s.student_id} (${s.name})? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/students/${s.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Student deleted.");
      fetchStudents();
    } else {
      toast.error("Delete failed.");
    }
  }

  async function addStudent() {
    if (!addForm.student_id || !addForm.name || !addForm.password) {
      toast.error("Student ID, name and password are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", student: addForm }),
    });
    const json = await res.json();
    if (res.ok) {
      toast.success("Student added.");
      setAddModal(false);
      setAddForm({ student_id: "", name: "", room_number: "", phone: "", password: "" });
      fetchStudents();
    } else {
      toast.error(json.error || "Failed to add student.");
    }
    setSaving(false);
  }

  return (
    <div className="page">
      <div className="page-header flex-between flex-wrap gap-12">
        <div>
          <h2>Student Management</h2>
          <p>{students.length} students found</p>
        </div>
        <div className="flex-gap flex-wrap">
          <button
            className="btn btn-secondary btn-sm"
            onClick={generateAll}
            disabled={generating}
          >
            {generating ? <><span className="spinner spinner-dark" /> Generating...</> : "⚡ Generate 144 Accounts"}
          </button>
          <label className={`btn btn-secondary btn-sm ${importing ? "disabled" : ""}`} style={{ cursor: "pointer" }}>
            {importing ? <><span className="spinner spinner-dark" /> Importing...</> : "📤 Import CSV/Excel"}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFileImport}
              disabled={importing}
            />
          </label>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setAddModal(true)}
          >
            + Add Student
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="form-group" style={{ maxWidth: 360 }}>
        <input
          className="form-control"
          placeholder="Search by name, ID or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* CSV format hint */}
      <div
        className="text-xs text-muted"
        style={{ marginBottom: 16, padding: "8px 12px", background: "var(--info-light)", borderRadius: "var(--radius-sm)" }}
      >
        CSV columns: <strong>student_id, name, room_number, phone, password</strong> (password optional, defaults to Room&#123;ID&#125;@hostel)
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-center" style={{ padding: 48 }}>
          <div className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
        </div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          <span className="icon">👥</span>
          <h3>No students found</h3>
          <p>Use "Generate 144 Accounts" or import a CSV file.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Room</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.student_id}</strong></td>
                  <td>{s.name}</td>
                  <td>{s.room_number || "—"}</td>
                  <td>{s.phone || "—"}</td>
                  <td>
                    {s.is_blocked ? (
                      <span className="badge badge-danger">Blocked</span>
                    ) : !s.is_active ? (
                      <span className="badge badge-warning">Inactive</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td>
                    <div className="flex-gap">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditStudent(s);
                          setEditForm({
                            name: s.name,
                            room_number: s.room_number || "",
                            phone: s.phone || "",
                            is_active: s.is_active,
                            is_blocked: s.is_blocked,
                            new_password: "",
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteStudent(s)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editStudent && (
        <div className="modal-overlay" onClick={() => setEditStudent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Student — {editStudent.student_id}</h3>
              <button className="modal-close" onClick={() => setEditStudent(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Full Name</label>
                <input className="form-control" value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Room Number</label>
                <input className="form-control" value={editForm.room_number}
                  onChange={(e) => setEditForm((f) => ({ ...f, room_number: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input className="form-control" value={editForm.phone} type="tel"
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input className="form-control" type="password" value={editForm.new_password}
                  placeholder="min 6 characters"
                  onChange={(e) => setEditForm((f) => ({ ...f, new_password: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={editForm.is_active}
                    onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))} />
                  <span className="text-sm">Active</span>
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={editForm.is_blocked}
                    onChange={(e) => setEditForm((f) => ({ ...f, is_blocked: e.target.checked }))} />
                  <span className="text-sm">Blocked</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditStudent(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving...</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add student modal */}
      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Student</h3>
              <button className="modal-close" onClick={() => setAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                { key: "student_id", label: "Student ID *", placeholder: "e.g. 201A" },
                { key: "name", label: "Full Name *", placeholder: "Student name" },
                { key: "room_number", label: "Room Number", placeholder: "e.g. 201" },
                { key: "phone", label: "Phone", placeholder: "10-digit number", type: "tel" },
                { key: "password", label: "Password *", placeholder: "min 6 characters", type: "password" },
              ].map((f) => (
                <div className="form-group" key={f.key}>
                  <label>{f.label}</label>
                  <input
                    className="form-control"
                    type={f.type || "text"}
                    placeholder={f.placeholder}
                    value={addForm[f.key as keyof typeof addForm]}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addStudent} disabled={saving}>
                {saving ? <><span className="spinner" /> Adding...</> : "Add Student"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
