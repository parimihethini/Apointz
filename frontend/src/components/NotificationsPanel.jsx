import React, { useEffect, useState, useRef } from "react";
import { api } from "../api";

const BellIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const NotificationsPanel = () => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadNotifications();
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id) => {
    try {
      await api.post("/notifications/read", { notification_id: id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read", { mark_all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* ignore */
    }
  };

  const handleClickOutside = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      setOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="notifications-wrapper" ref={panelRef}>
      <button
        type="button"
        className="notifications-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <span className="notifications-trigger-icon">
          <BellIcon />
        </span>
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="notifications-panel glass">
          <div className="notifications-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn-ghost small"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="notifications-list">
            {loading ? (
              <div className="loader-row">
                <span className="loader" />
                <span className="muted">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <p className="muted small">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${n.is_read ? "" : "unread"}`}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                >
                  <p>{n.message}</p>
                  <span className="muted small">
                    {n.created_at
                      ? new Date(n.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;
