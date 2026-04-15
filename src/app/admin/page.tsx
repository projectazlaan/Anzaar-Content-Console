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

  // Security Gate: Only Super Admins
  if (currentUser?.role !== "admin") {
    return (
      <div className="forbidden-page flex-center">
        <ShieldAlert size={64} className="text-danger" />
        <h1>Access Forbidden</h1>
        <p>You do not have administrative privileges to access this panel.</p>
      </div>
    );
  }

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

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
      <div className="admin-page animate-fade">
        <header className="page-header">
          <div>
            <h1>Super Admin Dashboard</h1>
            <p>Manage team members, roles, and fine-grained production permissions.</p>
          </div>
          <div className="stats-row grid">
            <div className="stat-pill glass">
              <Users size={18} />
              <span>{users.length} Total Users</span>
            </div>
          </div>
        </header>

        <section className="user-registry glass">
          <table className="user-table">
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
                <tr key={user.uid}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar bg-gradient">
                        {user.email?.[0].toUpperCase()}
                      </div>
                      <div className="info">
                        <strong>{user.email?.split('@')[0]}</strong>
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select 
                      className="role-select glass"
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
                    <span className={`status-tag ${user.role === 'pending' ? 'yellow' : 'emerald'}`}>
                      {user.role === 'pending' ? 'Awaiting Approval' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="icon-btn danger" onClick={() => handleDelete(user.uid)}>
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <style jsx>{`
        .admin-page {
          padding: 2rem;
        }

        .user-registry {
          padding: 0;
          overflow: hidden;
          margin-top: 2rem;
        }

        .user-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .user-table th {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-dim);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 1px solid var(--border);
        }

        .user-table td {
          padding: 1.2rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 1.2rem;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
        }

        .info {
          display: flex;
          flex-direction: column;
        }

        .role-select {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          color: white;
          font-size: 0.9rem;
          outline: none;
        }

        .permission-btn {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .permission-btn.active { background: var(--accent); color: white; }
        .permission-btn.inactive { background: rgba(255, 255, 255, 0.05); color: var(--text-dim); }

        .status-tag {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.4rem 0.8rem;
          border-radius: 100px;
        }

        .status-tag.yellow { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
        .status-tag.emerald { background: rgba(52, 211, 153, 0.1); color: #34d399; }

        .icon-btn {
          padding: 0.6rem;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .icon-btn.danger:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .forbidden-page {
          height: 80vh;
          flex-direction: column;
          gap: 1.5rem;
          text-align: center;
        }

        .forbidden-page h1 { font-size: 3rem; }
        .forbidden-page p { color: var(--text-dim); font-size: 1.2rem; }
      `}</style>
    </DashboardLayout>
  );
}

function PermissionToggle({ active, onToggle }: { active: boolean, onToggle: (val: boolean) => void }) {
  return (
    <div 
      className={`permission-btn ${active ? 'active' : 'inactive'}`}
      onClick={() => onToggle(!active)}
    >
      {active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
    </div>
  );
}
