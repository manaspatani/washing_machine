"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  totalStudents: number;
  openIssues: number;
  maintenanceLogs: number;
  machineStats: Record<string, number>;
  busiestSlots: Array<{ label: string; count: number }>;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); });
  }, []);

  // Current IST time
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const timeStr = istTime.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  const dateStr = istTime.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  if (loading) {
    return (
      <div className="page flex-center" style={{ minHeight: "60vh" }}>
        <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const statCards = [
    { icon: "📅", label: "Total Bookings", value: stats?.totalBookings ?? 0, bg: "#eff6ff", color: "#1e40af" },
    { icon: "✅", label: "Active Bookings", value: stats?.activeBookings ?? 0, bg: "#f0fdf4", color: "#166534" },
    { icon: "❌", label: "Cancellations", value: stats?.cancelledBookings ?? 0, bg: "#fef2f2", color: "#991b1b" },
    { icon: "👥", label: "Total Students", value: stats?.totalStudents ?? 0, bg: "#faf5ff", color: "#6b21a8" },
    { icon: "⚠️", label: "Open Issues", value: stats?.openIssues ?? 0, bg: "#fffbeb", color: "#92400e" },
    { icon: "🔧", label: "Maintenance Logs", value: stats?.maintenanceLogs ?? 0, bg: "#fff1f2", color: "#9f1239" },
  ];

  return (
    <div className="page">
      {/* Header with time */}
      <div className="flex-between flex-wrap gap-12" style={{ marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Admin Overview</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {dateStr} · {timeStr} IST
          </p>
        </div>
        <div className="flex-gap">
          <a href="/api/admin/export" className="btn btn-secondary btn-sm">
            ⬇️ Export CSV
          </a>
          <Link href="/admin/students" className="btn btn-primary btn-sm">
            Manage Students
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div className="stat-info">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid-2">
        {/* Machine usage */}
        <div className="card">
          <h3 className="font-semibold" style={{ marginBottom: 16 }}>
            Machine Usage (Active)
          </h3>
          {Object.keys(stats?.machineStats || {}).length === 0 ? (
            <p className="text-muted text-sm">No active bookings.</p>
          ) : (
            Object.entries(stats?.machineStats || {}).map(([name, count]) => {
              const total = stats?.activeBookings || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={name} style={{ marginBottom: 14 }}>
                  <div className="flex-between" style={{ marginBottom: 6 }}>
                    <span className="text-sm font-semibold">{name}</span>
                    <span className="text-sm text-muted">{count} bookings</span>
                  </div>
                  <div
                    style={{
                      height: 8, background: "#e2e8f0", borderRadius: 100,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--primary)",
                        borderRadius: 100,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Busiest slots */}
        <div className="card">
          <h3 className="font-semibold" style={{ marginBottom: 16 }}>
            Busiest Time Slots
          </h3>
          {(stats?.busiestSlots || []).length === 0 ? (
            <p className="text-muted text-sm">No booking data yet.</p>
          ) : (
            (stats?.busiestSlots || []).map((slot, i) => (
              <div
                key={slot.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 10,
                  padding: "8px 12px",
                  background: i === 0 ? "var(--slot-mine-bg)" : "var(--bg)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  style={{
                    width: 24, height: 24,
                    background: i === 0 ? "var(--primary)" : "#e2e8f0",
                    color: i === 0 ? "white" : "var(--text-muted)",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span className="text-sm" style={{ flex: 1 }}>{slot.label}</span>
                <span className="badge badge-info">{slot.count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid-4" style={{ marginTop: 24 }}>
        {[
          { href: "/admin/students", icon: "👥", label: "Manage Students" },
          { href: "/admin/bookings", icon: "📅", label: "View All Bookings" },
          { href: "/admin/machines", icon: "🔧", label: "Machine Status" },
          { href: "/admin/reports",  icon: "⚠️", label: "Issue Reports" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className="card card-sm"
              style={{
                textAlign: "center",
                cursor: "pointer",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>{item.icon}</div>
              <p className="text-sm font-semibold">{item.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
