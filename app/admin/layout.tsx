"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { href: "/admin",          icon: "📊", label: "Overview" },
  { href: "/admin/students", icon: "👥", label: "Students" },
  { href: "/admin/bookings", icon: "📅", label: "Bookings" },
  { href: "/admin/machines", icon: "🔧", label: "Machines" },
  { href: "/admin/reports",  icon: "⚠️", label: "Issue Reports" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  const fetchAdmin = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles").select("name").eq("id", user.id).single();
    if (data) setAdminName(data.name);
  }, []);

  useEffect(() => { fetchAdmin(); }, [fetchAdmin]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    toast.success("Logged out.");
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <h1>⚙️ Admin Panel</h1>
          <p>Mewad Jain Hostel</p>
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
            </Link>
          ))}
          <hr style={{ borderColor: "rgba(255,255,255,0.1)", margin: "8px 20px" }} />
          <Link href="/dashboard/book" onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">🧺</span>
            Student View
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{ background: "#dc2626" }}>A</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{adminName}</div>
              <div className="sidebar-user-id">Administrator</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
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
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <h1>⚙️ Admin</h1>
          <span />
        </header>
        {children}
      </main>
    </div>
  );
}
