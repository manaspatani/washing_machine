"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const typeIcon: Record<string, string> = {
  booking: "✅",
  cancellation: "❌",
  maintenance: "🔧",
  info: "ℹ️",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications() {
    const res = await fetch("/api/notifications?limit=50");
    const json = await res.json();
    if (res.ok) setNotifications(json.notifications || []);
    setLoading(false);
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((n) => n.map((notif) => ({ ...notif, is_read: true })));
    toast.success("All marked as read.");
  }

  useEffect(() => { fetchNotifications(); }, []);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return Math.floor(hours / 24) + "d ago";
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="page flex-center" style={{ minHeight: "60vh" }}>
        <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Notifications</h2>
          <p>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <span className="icon">🔔</span>
          <h3>No notifications yet</h3>
          <p>Booking confirmations and alerts will appear here.</p>
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <div key={n.id} className={`notif-item ${n.is_read ? "" : "unread"}`}>
              <div className="flex-between" style={{ alignItems: "flex-start", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.1rem" }}>
                    {typeIcon[n.type] || "ℹ️"}
                  </span>
                  <div>
                    <h4>{n.title}</h4>
                    <p>{n.message}</p>
                    <time>{timeAgo(n.created_at)}</time>
                  </div>
                </div>
                {!n.is_read && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: "var(--primary)",
                      borderRadius: "50%",
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
