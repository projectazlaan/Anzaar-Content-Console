"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateUserRole, deleteUser } from "@/lib/actions";
import { useAuth } from "@/lib/AuthContext";
import { 
  Users, 
  Shield, 
  Trash2, 
  UserCheck, 
  UserPlus, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Edit2,
  Trash
} from "lucide-react";

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== "admin") return;
    
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Security Gate: Only Super Admins (Moved after hooks)
  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="ad-forbidden">
          <ShieldAlert size={64} />
          <h1>Access Forbidden</h1>
          <p>You do not have administrative privileges to access this panel.</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleUpdate = async (uid: string, role: string, permissions: any) => {
    setIsUpdating(true);
    await updateUserRole(uid, role, permissions);
    setIsUpdating(false);
    setSelectedUser(null);
  };

  const handleDelete = async (uid: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      await deleteUser(uid);
    }
  };

  return (
    <DashboardLayout>
      <div className="ad-root">
        {/* Ambient Background */}
        <div className="ad-ambient" aria-hidden="true">
          <div className="amb-orb amb-orb-1" />
          <div className="amb-orb amb-orb-2" />
          <div className="amb-orb amb-orb-3" />
          <div className="ad-grid-lines" />
        </div>

        <header className="ad-header">
          <div>
            <div className="ad-badge">
              <Shield size={11} />
              <span>Administration</span>
            </div>
            <h1 className="ad-title">
              <span className="ad-title-accent">Super Admin</span> Dashboard
            </h1>
            <p className="ad-subtitle">Manage team members, roles, and fine-grained production permissions.</p>
          </div>
          <div className="ad-stats">
            <div className="ad-stat-pill">
              <Users size={16} />
              <span>{users.length} Total Users</span>
            </div>
          </div>
        </header>

        <section className="ad-table-card">
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>User / Email</th>
                  <th>Role</th>
                  <th>View</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid} className="ad-row">
                    <td>
                      <div className="ad-cell-user">
                        <div className="ad-avatar">
                          {user.email?.[0].toUpperCase()}
                        </div>
                        <div className="ad-user-info">
                          <strong>{user.email?.split('@')[0]}</strong>
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select 
                        className="ad-select"
                        value={user.role}
                        onChange={(e) => handleUpdate(user.uid, e.target.value, user.permissions)}
                      >
                        <option value="pending">Pending</option>
                        <option value="admin">Super Admin</option>
                        <option value="designer">Designer</option>
                        <option value="director">Director</option>
                        <option value="shooter">Shooter</option>
                        <option value="editor">Editor</option>
                        <option value="mother_drive">Mother Drive</option>
                      </select>
                    </td>
                    <td>
                      <PermissionToggle 
                        active={user.permissions?.view} 
                        onToggle={(val) => handleUpdate(user.uid, user.role, { ...user.permissions, view: val })}
                      />
                    </td>
                    <td>
                      <PermissionToggle 
                        active={user.permissions?.edit} 
                        onToggle={(val) => handleUpdate(user.uid, user.role, { ...user.permissions, edit: val })}
                      />
                    </td>
                    <td>
                      <PermissionToggle 
                        active={user.permissions?.delete} 
                        onToggle={(val) => handleUpdate(user.uid, user.role, { ...user.permissions, delete: val })}
                      />
                    </td>
                    <td>
                      <span className={`ad-status-tag ${user.role === 'pending' ? 'ad-status-warning' : 'ad-status-success'}`}>
                        {user.role === 'pending' ? 'Awaiting Approval' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button className="ad-delete-btn" onClick={() => handleDelete(user.uid)} title="Delete user">
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style jsx>{`
        .ad-root {
          padding: 2rem 2rem 3rem;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          min-height: 100vh;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          color: var(--text-main);
        }

        .ad-ambient {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .amb-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          animation: amb-drift 20s ease-in-out infinite alternate;
        }
        .amb-orb-1 {
          width: 700px; height: 700px;
          background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
          top: -200px; left: -100px;
          animation-duration: 18s;
          opacity: 0.2;
        }
        .amb-orb-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, var(--secondary-glow) 0%, transparent 70%);
          top: 30%; right: 5%;
          animation-duration: 24s;
          animation-delay: -8s;
          opacity: 0.18;
        }
        .amb-orb-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, var(--info-glow) 0%, transparent 70%);
          bottom: 5%; left: 35%;
          animation-duration: 30s;
          animation-delay: -15s;
          opacity: 0.15;
        }
        @keyframes amb-drift {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.7; }
          50%  { transform: translate(40px, 30px) scale(1.08); opacity: 1; }
          100% { transform: translate(-20px, 15px) scale(0.93); opacity: 0.6; }
        }
        .ad-grid-lines {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.02) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .ad-forbidden {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 80vh;
          text-align: center;
          gap: 1.25rem;
        }
        .ad-forbidden h1 {
          font-size: 2.5rem;
          color: var(--text-main);
          margin: 0;
        }
        .ad-forbidden p {
          color: var(--text-muted);
          font-size: 1.1rem;
          margin: 0;
        }

        .ad-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2.5rem;
          position: relative;
          z-index: 2;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .ad-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.35rem 0.8rem;
          background: var(--bg-hover);
          border: 1px solid var(--border);
          border-radius: 100px;
          color: var(--primary);
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.6rem;
          box-shadow: var(--shadow-sm);
        }
        .ad-badge svg { animation: pulse-dot 2s ease-in-out infinite; }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .ad-title {
          font-size: clamp(1.8rem, 3vw, 2.5rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.1;
          margin: 0 0 0.4rem 0;
          color: var(--text-main);
        }
        .ad-title-accent {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ad-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0;
          font-weight: 400;
          letter-spacing: 0.01em;
        }
        .ad-stats { display: flex; gap: 0.8rem; }
        .ad-stat-pill {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.65rem 1.2rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          backdrop-filter: var(--glass);
          box-shadow: var(--shadow-md);
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .ad-stat-pill svg { color: var(--primary); }

        .ad-table-card {
          border-radius: var(--radius-xl);
          background: var(--bg-card);
          border: 1px solid var(--border);
          backdrop-filter: var(--glass);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          position: relative;
          z-index: 2;
        }
        .ad-table-scroll { overflow-x: auto; }
        .ad-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .ad-table th {
          padding: 1.3rem 1.5rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-dim);
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid var(--border);
          font-weight: 800;
        }
        .ad-table td {
          padding: 1.1rem 1.5rem;
          border-bottom: 1px solid var(--border-light);
          vertical-align: middle;
        }
        .ad-row { transition: all var(--transition-base); }
        .ad-row:hover { background: var(--bg-hover); }
        .ad-row:last-child td { border-bottom: none; }

        .ad-cell-user {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .ad-avatar {
          width: 42px; height: 42px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #fff !important;
          font-size: 0.95rem;
          flex-shrink: 0;
          border: 1px solid var(--border);
        }
        .ad-user-info {
          display: flex;
          flex-direction: column;
        }
        .ad-user-info strong {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .ad-user-info span {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .ad-select {
          padding: 0.55rem 1rem;
          border-radius: var(--radius-sm);
          background: var(--bg-input);
          border: 1px solid var(--border);
          color: var(--text-main);
          font-size: 0.82rem;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          font-family: inherit;
        }
        .ad-select:hover { border-color: var(--primary); }
        .ad-select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }

        .ad-permission-btn {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ad-permission-active { background: var(--accent); color: white; }
        .ad-permission-inactive { background: rgba(255, 255, 255, 0.05); color: var(--text-dim); }

        .ad-status-tag {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.35rem 0.75rem;
          border-radius: 100px;
          display: inline-block;
        }
        .ad-status-warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
          border: 1px solid rgba(245, 158, 11, 0.15);
        }
        .ad-status-success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--accent);
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .ad-delete-btn {
          width: 36px; height: 36px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-dim);
          background: var(--bg-hover);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .ad-delete-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: var(--danger);
          color: var(--danger);
          transform: translateY(-1px);
        }

        @media (max-width: 1200px) {
          .ad-table { font-size: 0.9rem; }
          .ad-table th, .ad-table td { padding: 1rem; }
        }
        @media (max-width: 768px) {
          .ad-root { padding: 1rem; padding-top: 90px; }
          .ad-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .ad-title { font-size: 1.3rem; }
          .ad-stats { width: 100%; }
          .ad-stat-pill { width: 100%; justify-content: center; }
          .ad-table-card { overflow-x: auto; }
          .ad-table { min-width: 800px; font-size: 0.75rem; }
          .ad-table th, .ad-table td { padding: 0.4rem; }
          .ad-avatar { width: 36px; height: 36px; font-size: 0.85rem; }
          .ad-user-info strong { font-size: 0.82rem; }
          .ad-user-info span { font-size: 0.72rem; }
          .ad-select { font-size: 0.78rem; padding: 0.4rem 0.7rem; }
        }
        @media (max-width: 480px) {
          .ad-root { padding: 0.7rem; padding-top: 85px; }
          .ad-table { font-size: 0.65rem; }
        }
      `}</style>
    </DashboardLayout>
  );
}

function PermissionToggle({ active, onToggle }: { active: boolean, onToggle: (val: boolean) => void }) {
  return (
    <div 
      className={`ad-permission-btn ${active ? 'ad-permission-active' : 'ad-permission-inactive'}`}
      onClick={() => onToggle(!active)}
    >
      {active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
    </div>
  );
}
