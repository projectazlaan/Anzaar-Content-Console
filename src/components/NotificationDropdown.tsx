"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, X, CheckCheck, Trash2, Info, AlertCircle, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { useNotifications } from "./NotificationProvider";
import { useAuth } from "@/lib/AuthContext";
import { Timestamp } from "firebase/firestore";

function timeAgo(date: Timestamp | null): string {
  if (!date?.toDate) return "";
  const diff = Date.now() - date.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupByDate(notifications: any[]): { label: string; items: any[] }[] {
  const groups: { label: string; items: any[] }[] = [];
  let today: any[] = [];
  let yesterday: any[] = [];
  let older: any[] = [];

  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();

  notifications.forEach((n) => {
    const d = n.createdAt?.toDate();
    if (!d) { older.push(n); return; }
    if (d.toDateString() === todayStr) today.push(n);
    else if (d.toDateString() === yesterdayStr) yesterday.push(n);
    else older.push(n);
  });

  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (older.length) groups.push({ label: "Older", items: older });
  return groups;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  info: <Info size={14} />,
  success: <CheckCircle size={14} />,
  warning: <AlertTriangle size={14} />,
  error: <AlertCircle size={14} />,
};

const TYPE_COLORS: Record<string, string> = {
  info: "#0a84ff",
  success: "#34c759",
  warning: "#ff9f0a",
  error: "#ff453a",
};

export default function NotificationDropdown() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="ntd" ref={ref}>
      <button
        className={`ntd-bell ${unreadCount > 0 ? "ntd-has" : ""}`}
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="ntd-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="ntd-backdrop" onClick={() => setOpen(false)} />
          <div className="ntd-drop">
            <div className="ntd-head">
              <span className="ntd-title">Notifications</span>
              <div className="ntd-acts">
                {unreadCount > 0 && (
                  <button className="ntd-btn" onClick={() => { markAllRead(); }}>
                    <CheckCheck size={14} /> Mark read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button className="ntd-btn ntd-btn-d" onClick={() => { clearAll(); }}>
                    <Trash2 size={14} /> Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="ntd-body">
              {notifications.length === 0 ? (
                <div className="ntd-empty">
                  <Bell size={24} />
                  <p>No notifications yet</p>
                </div>
              ) : (
                groupByDate(notifications).map((group) => (
                  <div key={group.label} className="ntd-grp">
                    <div className="ntd-gl">{group.label}</div>
                    {group.items.map((n) => (
                      <div
                        key={n.id}
                        className={`ntd-item ${!n.read ? "ntd-unread" : ""}`}
                        onClick={() => {
                          markRead(n.id);
                          if (n.link) window.location.href = n.link;
                        }}
                      >
                        <div className="ntd-ic" style={{ color: TYPE_COLORS[n.type] || "#0a84ff" }}>
                          {TYPE_ICONS[n.type] || <Info size={14} />}
                        </div>
                        <div className="ntd-cnt">
                          <div className="ntd-t">{n.title}</div>
                          <div className="ntd-msg">{n.message}</div>
                          <div className="ntd-time">{timeAgo(n.createdAt)}</div>
                        </div>
                        {n.link && <ExternalLink size={10} className="ntd-link-icon" />}
                        {!n.read && <div className="ntd-dot" />}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .ntd { position: relative; display: flex; }
        .ntd-bell {
          background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer;
          padding: 6px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
          position: relative; transition: all 0.2s;
        }
        .ntd-bell:hover { color: white; background: rgba(255,255,255,0.08); }
        .ntd-has { color: #0a84ff; }
        .ntd-has:hover { color: #5ac8fa; }
        .ntd-badge {
          position: absolute; top: 0; right: 0; min-width: 16px; height: 16px;
          border-radius: 8px; background: #ff453a; color: white; font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; padding: 0 4px;
          box-shadow: 0 0 0 2px #0a0e1a; pointer-events: none;
        }
        [data-theme="light"] .ntd-badge { box-shadow: 0 0 0 2px #f8fafc; }
        .ntd-backdrop { position: fixed; inset: 0; z-index: 999; }
        .ntd-drop {
          position: absolute; bottom: calc(100% + 12px); right: 0; width: 380px; max-height: 480px;
          background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5); z-index: 1000; display: flex; flex-direction: column;
          overflow: hidden; animation: ntdIn 0.2s ease;
        }
        @keyframes ntdIn { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        [data-theme="light"] .ntd-drop { background: #ffffff; border-color: rgba(0,0,0,0.08); box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
        .ntd-head {
          display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
        }
        [data-theme="light"] .ntd-head { border-color: rgba(0,0,0,0.06); }
        .ntd-title { font-size: 14px; font-weight: 600; color: #ebebf5; }
        [data-theme="light"] .ntd-title { color: #0f172a; }
        .ntd-acts { display: flex; gap: 0.25rem; }
        .ntd-btn {
          display: flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 6px;
          background: none; border: none; color: rgba(255,255,255,0.5); font-size: 11px; cursor: pointer;
          transition: all 0.15s; font-family: inherit;
        }
        .ntd-btn:hover { background: rgba(255,255,255,0.06); color: white; }
        [data-theme="light"] .ntd-btn { color: rgba(15,23,42,0.5); }
        [data-theme="light"] .ntd-btn:hover { background: rgba(0,0,0,0.05); color: #0f172a; }
        .ntd-btn-d:hover { color: #ff453a !important; background: rgba(255,69,58,0.1) !important; }
        .ntd-body { flex: 1; overflow-y: auto; padding: 0.5rem 0; }
        .ntd-body::-webkit-scrollbar { width: 4px; }
        .ntd-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        [data-theme="light"] .ntd-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); }
        .ntd-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; color: rgba(255,255,255,0.3); }
        [data-theme="light"] .ntd-empty { color: rgba(15,23,42,0.3); }
        .ntd-empty p { margin: 0; font-size: 13px; }
        .ntd-grp { }
        .ntd-gl {
          padding: 0.3rem 1rem; font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: rgba(255,255,255,0.3);
        }
        [data-theme="light"] .ntd-gl { color: rgba(15,23,42,0.3); }
        .ntd-item {
          display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.5rem 1rem;
          cursor: pointer; transition: background 0.15s; position: relative;
        }
        .ntd-item:hover { background: rgba(255,255,255,0.03); }
        [data-theme="light"] .ntd-item:hover { background: rgba(0,0,0,0.03); }
        .ntd-unread { background: rgba(10,132,255,0.06); }
        [data-theme="light"] .ntd-unread { background: rgba(10,132,255,0.04); }
        .ntd-ic { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .ntd-cnt { flex: 1; min-width: 0; }
        .ntd-t { font-size: 12px; font-weight: 600; color: #ebebf5; line-height: 1.3; }
        [data-theme="light"] .ntd-t { color: #0f172a; }
        .ntd-msg { font-size: 11px; color: rgba(255,255,255,0.5); line-height: 1.3; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        [data-theme="light"] .ntd-msg { color: rgba(15,23,42,0.5); }
        .ntd-time { font-size: 10px; color: rgba(255,255,255,0.25); margin-top: 2px; }
        [data-theme="light"] .ntd-time { color: rgba(15,23,42,0.25); }
        .ntd-link-icon { flex-shrink: 0; color: rgba(255,255,255,0.2); margin-top: 3px; }
        [data-theme="light"] .ntd-link-icon { color: rgba(15,23,42,0.2); }
        .ntd-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #0a84ff;
          position: absolute; top: 50%; right: 8px; transform: translateY(-50%);
          box-shadow: 0 0 6px rgba(10,132,255,0.4);
        }
      `}</style>
    </div>
  );
}
