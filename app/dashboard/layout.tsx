"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { href: "/dashboard/book",         icon: "🗓️", label: "Book a Slot" },
  { href: "/dashboard/my-bookings",  icon: "📋", label: "My Bookings" },
  { href: "/dashboard/notifications",icon: "🔔", label: "Notifications" },
  { href: "/dashboard/profile",      icon: "👤", label: "Profile" },
  { href: "/dashboard/rules",        icon: "📜", label: "Hostel Rules" },
  { href: "/dashboard/report",       icon: "⚠️", label: "Report Issue" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<{ name: string; student_id: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("name, student_id")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);

    // Unread notification count
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("is_read", false);

    setUnreadCount(count || 0);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    toast.success("Logged out.");
  }

  const initials = profile?.name
    ? profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="app-shell">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <h1>🧺 Mewad Jain Hostel</h1>
          <p>Washing Machine Booking</p>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : ""}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.href === "/dashboard/notifications" && unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "#ef4444",
                    color: "white",
                    borderRadius: "100px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "1px 7px",
                    minWidth: 20,
                    textAlign: "center",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.name || "Loading…"}</div>
              <div className="sidebar-user-id">{profile?.student_id || ""}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-nav"
            style={{ padding: 0, width: "100%" }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 0",
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
                background: "none",
                border: "none",
                width: "100%",
              }}
            >
              <span className="nav-icon">🚪</span>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Mobile header */}
        <header className="mobile-header">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <h1>🧺 Mewad Jain</h1>
          <Link href="/dashboard/notifications" style={{ position: "relative" }}>
            🔔
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  background: "#ef4444",
                  color: "white",
                  borderRadius: "50%",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadCount}
              </span>
            )}
          </Link>
        </header>

        {children}
      </main>
    </div>
  );
}
