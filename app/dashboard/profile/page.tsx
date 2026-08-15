"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface Profile {
  id: string;
  name: string;
  student_id: string;
  room_number: string;
  phone: string;
  role: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setForm({ name: data.name, phone: data.phone || "" });
    }
    setLoading(false);
  }

  useEffect(() => { fetchProfile(); }, []);

  async function saveProfile() {
    if (!form.name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ name: form.name.trim(), phone: form.phone.trim() })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save profile.");
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      fetchProfile();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="page flex-center" style={{ minHeight: "60vh" }}>
        <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="icon">⚠️</span>
          <h3>Profile not found</h3>
        </div>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Profile</h2>
        <p>View and update your personal details.</p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        {/* Avatar */}
        <div className="flex-center" style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: "var(--primary)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "1.6rem",
              fontWeight: 800,
            }}
          >
            {initials}
          </div>
        </div>

        {editing ? (
          <>
            <div className="form-group">
              <label>Full Name</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                className="form-control"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="10-digit mobile number"
                maxLength={10}
                type="tel"
              />
            </div>
            <div className="flex-gap" style={{ marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? <><span className="spinner" /> Saving...</> : "Save Changes"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ProfileRow label="Student ID" value={profile.student_id} />
              <ProfileRow label="Full Name" value={profile.name} />
              <ProfileRow label="Room Number" value={profile.room_number || "—"} />
              <ProfileRow label="Phone Number" value={profile.phone || "Not set"} />
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setEditing(true)}
              style={{ marginTop: 24 }}
            >
              ✏️ Edit Profile
            </button>
          </>
        )}
      </div>

      <div
        className="card"
        style={{
          maxWidth: 480,
          marginTop: 16,
          background: "var(--info-light)",
          border: "1px solid #bfdbfe",
        }}
      >
        <p className="text-sm" style={{ color: "#1e40af" }}>
          <strong>Note:</strong> To change your password, contact the hostel
          admin. Your login ID is your student ID (e.g., 201A).
        </p>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted" style={{ marginBottom: 2 }}>
        {label}
      </p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
