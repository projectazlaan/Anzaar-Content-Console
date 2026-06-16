"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/lib/AuthContext";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateUserRole, deleteUser, getCategories, addCategory, removeCategory, updateCategory } from "@/lib/actions";
import {
  Settings,
  Users,
  Shield,
  Palette,
  Bell,
  Database,
  Globe,
  Lock,
  Mail,
  Save,
  Trash2,
  UserCheck,
  Edit2,
  Moon,
  Sun,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ChevronRight,
  Search,
  Filter,
  TrendingUp,
  Activity,
  Clock,
  Layers,
  Plus,
  X
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [siteConfig, setSiteConfig] = useState({
    siteName: "ANZAAR CONTENT CONSOL",
    siteDescription: "Enterprise content production pipeline management",
    maintenanceMode: false,
    allowRegistration: true,
    autoApproveFirstUser: true,
  });

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
    });
    loadCategories();
    return () => unsubscribe();
  }, []);

  const loadCategories = async () => {
    const data = await getCategories();
    setCategories(data);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setIsCategorySubmitting(true);
    setCategoryError("");
    const result = await addCategory(newCategory.trim());
    setIsCategorySubmitting(false);

    if (result.success) {
      setNewCategory("");
      loadCategories();
    } else {
      setCategoryError(result.error || "Failed to add category. Check server logs.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setCategoryError("");
    const result = await removeCategory(id);
    setDeletingCategoryId(null);
    if (result.success) {
      loadCategories();
    } else {
      setCategoryError(result.error || "Failed to delete category");
    }
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setCategoryError("");
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setCategoryError("");
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    setCategoryError("");
    const result = await updateCategory(editingCategoryId, editingCategoryName.trim());
    if (result.success) {
      setEditingCategoryId(null);
      setEditingCategoryName("");
      loadCategories();
    } else {
      setCategoryError(result.error || "Failed to update category");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleUpdateUser = async (uid: string, role: string, permissions: any) => {
    setIsUpdating(true);
    await updateUserRole(uid, role, permissions);
    setIsUpdating(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = async (uid: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      await deleteUser(uid);
    }
  };

  const tabs = [
    { id: "general", name: "General", icon: Settings },
    { id: "users", name: "User Management", icon: Users, adminOnly: true },
    { id: "categories", name: "Categories", icon: Layers, adminOnly: true },
    { id: "appearance", name: "Appearance", icon: Palette },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "security", name: "Security", icon: Lock },
    { id: "data", name: "Data & Storage", icon: Database, adminOnly: true },
  ];

  const filteredTabs = tabs.filter(tab => !tab.adminOnly || currentUser?.role === "admin");

  return (
    <RoleGuard allowedRoles={["admin", "designer", "director", "shooter", "editor", "mother_drive"]}>
      <DashboardLayout>
        <div className="st-root animate-fade-in">
          <div className="st-ambient" aria-hidden="true">
            <div className="st-orb st-orb-1" />
            <div className="st-orb st-orb-2" />
            <div className="st-orb st-orb-3" />
            <div className="st-grid-lines" />
          </div>

          <header className="st-header">
            <div className="st-header-left">
              <span className="st-badge">Configuration</span>
              <h1 className="st-title">System <span className="st-title-accent">Settings</span></h1>
              <p className="st-subtitle">Manage your application preferences and configurations</p>
            </div>
            <div className="st-header-actions">
              <button className="st-icon-btn" onClick={() => window.location.reload()}>
                <RefreshCw size={16} />
              </button>
              <button className="st-signout-btn" onClick={handleSignOut}>
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          <div className="st-layout">
            <aside className="st-sidebar">
              {filteredTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`st-tab ${activeTab === tab.id ? 'st-tab-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={18} />
                    <span>{tab.name}</span>
                    {tab.adminOnly && <span className="st-admin-badge">Admin</span>}
                  </button>
                );
              })}
            </aside>

            <div className="st-content">
              {activeTab === "general" && (
                <div className="st-section">
                  <h2 className="st-section-title">General Settings</h2>
                  <p className="st-section-desc">Configure your application's basic settings</p>
                  <div className="st-card">
                    <div className="st-setting">
                      <div className="st-setting-info">
                        <Globe size={18} />
                        <div>
                          <label>Site Name</label>
                          <p>Display name for your application</p>
                        </div>
                      </div>
                      <input type="text" value={siteConfig.siteName} onChange={(e) => setSiteConfig({...siteConfig, siteName: e.target.value})} className="st-input" />
                    </div>
                    <div className="st-divider" />
                    <div className="st-setting">
                      <div className="st-setting-info">
                        <Mail size={18} />
                        <div>
                          <label>Site Description</label>
                          <p>Short description of your application</p>
                        </div>
                      </div>
                      <input type="text" value={siteConfig.siteDescription} onChange={(e) => setSiteConfig({...siteConfig, siteDescription: e.target.value})} className="st-input" />
                    </div>
                    <div className="st-divider" />
                    <div className="st-setting">
                      <div className="st-setting-info">
                        <Shield size={18} />
                        <div>
                          <label>Auto-Approve First User</label>
                          <p>First registered user becomes Super Admin automatically</p>
                        </div>
                      </div>
                      <label className="st-toggle">
                        <input type="checkbox" checked={siteConfig.autoApproveFirstUser} onChange={(e) => setSiteConfig({...siteConfig, autoApproveFirstUser: e.target.checked})} />
                        <span className="st-toggle-slider" />
                      </label>
                    </div>
                    <div className="st-divider" />
                    <div className="st-setting">
                      <div className="st-setting-info">
                        <Users size={18} />
                        <div>
                          <label>Allow Registration</label>
                          <p>Enable new user registration</p>
                        </div>
                      </div>
                      <label className="st-toggle">
                        <input type="checkbox" checked={siteConfig.allowRegistration} onChange={(e) => setSiteConfig({...siteConfig, allowRegistration: e.target.checked})} />
                        <span className="st-toggle-slider" />
                      </label>
                    </div>
                    <div className="st-divider" />
                    <div className="st-setting">
                      <div className="st-setting-info">
                        <AlertTriangle size={18} />
                        <div>
                          <label>Maintenance Mode</label>
                          <p>Disable access for all users except admins</p>
                        </div>
                      </div>
                      <label className="st-toggle">
                        <input type="checkbox" checked={siteConfig.maintenanceMode} onChange={(e) => setSiteConfig({...siteConfig, maintenanceMode: e.target.checked})} />
                        <span className="st-toggle-slider" />
                      </label>
                    </div>
                    <div className="st-card-actions">
                      <button className="st-btn-primary">
                        <Save size={16} />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "users" && currentUser?.role === "admin" && (
                <div className="st-section">
                  <div className="st-section-header">
                    <div>
                      <h2 className="st-section-title">User Management</h2>
                      <p className="st-section-desc">Manage all registered users and their roles</p>
                    </div>
                    <div className="st-stats-row">
                      <div className="st-stat-pill">
                        <Users size={14} />
                        <span>{users.length} Total</span>
                      </div>
                      <div className="st-stat-pill st-stat-active">
                        <UserCheck size={14} />
                        <span>{users.filter(u => u.role !== 'pending').length} Active</span>
                      </div>
                      <div className="st-stat-pill st-stat-pending">
                        <Clock size={14} />
                        <span>{users.filter(u => u.role === 'pending').length} Pending</span>
                      </div>
                    </div>
                  </div>
                  <div className="st-table-card">
                    <div className="st-table-toolbar">
                      <div className="st-search">
                        <Search size={16} />
                        <input type="text" placeholder="Search users..." />
                      </div>
                      <button className="st-btn-ghost">
                        <Filter size={16} />
                        <span>Filter</span>
                      </button>
                    </div>
                    <table className="st-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Permissions</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.uid}>
                            <td>
                              <div className="st-user-cell">
                                <div className="st-avatar">{user.email?.[0].toUpperCase()}</div>
                                <div className="st-user-info">
                                  <strong>{user.email?.split('@')[0]}</strong>
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <select className="st-role-select" value={user.role} onChange={(e) => handleUpdateUser(user.uid, e.target.value, user.permissions)}>
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
                              <div className="st-perm-row">
                                <PermissionToggle
                                  active={user.permissions?.view}
                                  onToggle={(val) => handleUpdateUser(user.uid, user.role, { ...user.permissions, view: val })}
                                />
                                <PermissionToggle
                                  active={user.permissions?.edit}
                                  onToggle={(val) => handleUpdateUser(user.uid, user.role, { ...user.permissions, edit: val })}
                                />
                                <PermissionToggle
                                  active={user.permissions?.delete}
                                  onToggle={(val) => handleUpdateUser(user.uid, user.role, { ...user.permissions, delete: val })}
                                />
                              </div>
                            </td>
                            <td>
                              <span className={`st-status-tag ${user.role === 'pending' ? 'st-st-pending' : 'st-st-active'}`}>
                                {user.role === 'pending' ? 'Pending' : 'Active'}
                              </span>
                            </td>
                            <td>
                              <div className="st-action-row">
                                <button className="st-icon-btn" onClick={() => setSelectedUser(user)}>
                                  <Edit2 size={14} />
                                </button>
                                <button className="st-icon-btn st-icon-danger" onClick={() => handleDeleteUser(user.uid)} disabled={user.uid === currentUser?.uid}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "categories" && currentUser?.role === "admin" && (
                <div className="st-section">
                  <h2 className="st-section-title">Category Management</h2>
                  <p className="st-section-desc">Manage the product categories available in the Designer Portal</p>
                  <div className="st-card">
                    <div className="st-cat-form">
                      <h3>Add New Category</h3>
                      <form onSubmit={handleAddCategory} className="st-cat-form-row">
                        <input type="text" placeholder="Enter category name (e.g. Sarees)" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="st-input" required />
                        <button type="submit" className="st-btn-primary" disabled={isCategorySubmitting || !newCategory.trim()}>
                          <Plus size={16} />
                          <span>{isCategorySubmitting ? "Adding..." : "Add"}</span>
                        </button>
                      </form>
                      {categoryError && <p className="st-error-text">{categoryError}</p>}
                    </div>
                    <div className="st-divider" />
                    <div className="st-cat-list-section">
                      <h3>Active Categories ({categories.length})</h3>
                      {categories.length === 0 ? (
                        <p className="st-empty-text">No categories found. Add one above.</p>
                      ) : (
                        <div className="st-cat-list">
                          {categories.map((cat) => (
                            <div key={cat.id} className="st-cat-item">
                              {editingCategoryId === cat.id ? (
                                <div className="st-cat-edit">
                                  <input type="text" value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} className="st-cat-edit-input" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCategory(); if (e.key === 'Escape') handleCancelEdit(); }} />
                                  <div className="st-cat-edit-actions">
                                    <button className="st-btn-icon-sm st-btn-save" onClick={handleUpdateCategory}><CheckCircle2 size={14} /></button>
                                    <button className="st-btn-icon-sm st-btn-cancel" onClick={handleCancelEdit}><X size={14} /></button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="st-cat-info">
                                    <div className="st-cat-dot" />
                                    <span className="st-cat-name">{cat.name}</span>
                                  </div>
                                  <div className="st-cat-actions">
                                    {deletingCategoryId === cat.id ? (
                                      <div className="st-delete-confirm">
                                        <span className="st-delete-text">Delete?</span>
                                        <button className="st-btn-sm st-btn-yes" onClick={() => handleDeleteCategory(cat.id)}>Yes</button>
                                        <button className="st-btn-sm st-btn-no" onClick={() => setDeletingCategoryId(null)}>No</button>
                                      </div>
                                    ) : (
                                      <>
                                        <button className="st-cat-action-btn" onClick={() => handleEditCategory(cat)}><Edit2 size={14} /></button>
                                        <button className="st-cat-action-btn st-cat-del-btn" onClick={() => setDeletingCategoryId(cat.id)}><Trash2 size={14} /></button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="st-section">
                  <h2 className="st-section-title">Appearance Settings</h2>
                  <p className="st-section-desc">Customize the look and feel of your application</p>
                  <div className="st-card">
                    <div className="st-setting">
                      <div className="st-setting-info">
                        <Moon size={18} />
                        <div>
                          <label>Dark Mode</label>
                          <p>Use dark theme across the application</p>
                        </div>
                      </div>
                      <label className="st-toggle">
                        <input type="checkbox" defaultChecked />
                        <span className="st-toggle-slider" />
                      </label>
                    </div>
                    <div className="st-divider" />
                    <div className="st-setting">
                      <div className="st-setting-info">
                        <Palette size={18} />
                        <div>
                          <label>Accent Color</label>
                          <p>Primary color for buttons and highlights</p>
                        </div>
                      </div>
                      <div className="st-color-picker">
                        {['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444'].map(color => (
                          <button key={color} className="st-color-opt" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="st-section">
                  <h2 className="st-section-title">Security Settings</h2>
                  <p className="st-section-desc">Manage your account security and authentication</p>
                  <div className="st-card">
                    <div className="st-setting">
                      <div className="st-setting-info">
                        <Lock size={18} />
                        <div>
                          <label>Two-Factor Authentication</label>
                          <p>Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <label className="st-toggle">
                        <input type="checkbox" />
                        <span className="st-toggle-slider" />
                      </label>
                    </div>
                    <div className="st-divider" />
                    <div className="st-setting">
                      <div className="st-setting-info">
                        <Eye size={18} />
                        <div>
                          <label>Session Timeout</label>
                          <p>Automatically log out after inactivity</p>
                        </div>
                      </div>
                      <select className="st-select">
                        <option>30 minutes</option>
                        <option>1 hour</option>
                        <option>4 hours</option>
                        <option>Never</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "data" && currentUser?.role === "admin" && (
                <div className="st-section">
                  <h2 className="st-section-title">Data & Storage</h2>
                  <p className="st-section-desc">Manage your application data and cloud storage</p>
                  <div className="st-card">
                    <div className="st-data-grid">
                      <div className="st-data-stat">
                        <Database size={22} />
                        <div>
                          <strong>Firestore Database</strong>
                          <span>Connected</span>
                        </div>
                      </div>
                      <div className="st-data-stat">
                        <TrendingUp size={22} />
                        <div>
                          <strong>Total Products</strong>
                          <span>{users.length} records</span>
                        </div>
                      </div>
                    </div>
                    <div className="st-divider" />
                    <div className="st-setting">
                      <div className="st-setting-info">
                        <Activity size={18} />
                        <div>
                          <label>Real-time Sync</label>
                          <p>Enable live data updates across all clients</p>
                        </div>
                      </div>
                      <label className="st-toggle">
                        <input type="checkbox" defaultChecked />
                        <span className="st-toggle-slider" />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="st-section">
                  <h2 className="st-section-title">Notifications</h2>
                  <p className="st-section-desc">Configure notification preferences</p>
                  <div className="st-card">
                    <p className="st-empty-text" style={{ padding: '2rem', textAlign: 'center' }}>Notification settings coming soon.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .st-root {
            position: relative;
            max-width: 1600px;
            margin: 0 auto;
            padding: 1.8rem 2rem;
            min-height: calc(100vh - 100px);
            isolation: isolate;
          }
          .st-ambient {
            position: fixed; inset: 0; z-index: 0;
            pointer-events: none; overflow: hidden;
          }
          .st-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(120px);
            opacity: 0.7;
            animation: st-drift 20s ease-in-out infinite alternate;
          }
          .st-orb-1 {
            width: 700px; height: 700px;
            background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
            top: -200px; left: -200px;
            animation-duration: 18s;
          }
          .st-orb-2 {
            width: 500px; height: 500px;
            background: radial-gradient(circle, var(--secondary-glow) 0%, transparent 70%);
            top: -100px; right: -150px;
            animation-duration: 24s;
          }
          .st-orb-3 {
            width: 400px; height: 400px;
            background: radial-gradient(circle, var(--info-glow) 0%, transparent 70%);
            bottom: -100px; left: 40%;
            animation-duration: 30s;
          }
          @keyframes st-drift {
            0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
            33% { transform: translate(40px, -30px) scale(1.05); opacity: 1; }
            66% { transform: translate(-20px, 20px) scale(0.95); opacity: 0.8; }
            100% { transform: translate(30px, 40px) scale(1.02); opacity: 0.6; }
          }
          .st-grid-lines {
            position: absolute; inset: 0;
            background-image:
              linear-gradient(rgba(99,102,241,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.02) 1px, transparent 1px);
            background-size: 48px 48px;
          }
          .animate-fade-in { animation: st-fade 0.5s ease-out forwards; }
          @keyframes st-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes st-slide { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

          .st-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 2rem;
            margin-bottom: 2rem;
            position: relative;
            z-index: 2;
          }
          .st-header-left { flex-shrink: 0; }
          .st-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            background: var(--primary-glow);
            color: var(--primary);
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 0.4rem;
            border: 1px solid rgba(99,102,241,0.25);
          }
          .st-title {
            font-size: 1.8rem;
            font-weight: 900;
            color: var(--text-main);
            letter-spacing: -0.03em;
            line-height: 1.1;
            margin: 0;
          }
          .st-title-accent {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .st-subtitle {
            font-size: 0.8rem;
            color: var(--text-dim);
            margin: 0.2rem 0 0 0;
          }
          .st-header-actions { display: flex; gap: 0.6rem; align-items: center; flex-shrink: 0; }
          .st-icon-btn {
            display: flex; align-items: center; justify-content: center;
            width: 36px; height: 36px;
            border-radius: var(--radius-sm);
            background: var(--bg-input);
            border: 1px solid var(--border);
            color: var(--text-muted);
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .st-icon-btn:hover { background: var(--bg-hover); color: var(--text-main); border-color: var(--primary); }
          .st-icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
          .st-icon-danger:hover { background: rgba(239,68,68,0.1); color: var(--danger); border-color: rgba(239,68,68,0.3); }
          .st-signout-btn {
            display: flex; align-items: center; gap: 0.4rem;
            padding: 0.5rem 1rem;
            border-radius: var(--radius-sm);
            background: rgba(239,68,68,0.1);
            border: 1px solid rgba(239,68,68,0.2);
            color: var(--danger);
            font-size: 0.78rem;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .st-signout-btn:hover { background: rgba(239,68,68,0.2); }

          .st-layout {
            display: grid;
            grid-template-columns: 220px 1fr;
            gap: 1.5rem;
            position: relative;
            z-index: 2;
          }
          .st-sidebar {
            padding: 0.6rem;
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            backdrop-filter: var(--glass);
            box-shadow: var(--shadow-md);
            height: fit-content;
            position: sticky;
            top: 2rem;
          }
          .st-tab {
            display: flex;
            align-items: center;
            gap: 0.7rem;
            padding: 0.65rem 0.8rem;
            border-radius: var(--radius-sm);
            color: var(--text-muted);
            font-size: 0.78rem;
            font-weight: 700;
            transition: all var(--transition-fast);
            position: relative;
            border: none;
            background: transparent;
            cursor: pointer;
            text-align: left;
            width: 100%;
          }
          .st-tab:hover { background: var(--bg-hover); color: var(--text-main); }
          .st-tab-active {
            background: var(--bg-hover);
            color: var(--primary);
            border-left: 3px solid var(--primary);
          }
          .st-admin-badge {
            margin-left: auto;
            font-size: 0.6rem;
            padding: 0.15rem 0.45rem;
            background: var(--warning);
            color: #000;
            border-radius: 100px;
            font-weight: 800;
          }

          .st-content { display: flex; flex-direction: column; gap: 1.5rem; }
          .st-section { animation: st-slide 0.35s ease-out; }
          .st-section-title {
            font-size: 1.3rem;
            font-weight: 900;
            color: var(--text-main);
            margin: 0 0 0.2rem 0;
            letter-spacing: -0.02em;
          }
          .st-section-desc {
            font-size: 0.78rem;
            color: var(--text-muted);
            margin: 0 0 1.2rem 0;
          }
          .st-section-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
          }
          .st-card {
            padding: 1.2rem;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            backdrop-filter: var(--glass);
            box-shadow: var(--shadow-md);
          }
          .st-card-actions {
            margin-top: 1.2rem;
            padding-top: 1.2rem;
            border-top: 1px solid var(--border);
          }
          .st-divider { height: 1px; background: var(--border); }
          .st-setting {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1.5rem;
            padding: 1rem 0;
          }
          .st-setting-info {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            flex: 1;
          }
          .st-setting-info svg { color: var(--primary); flex-shrink: 0; }
          .st-setting-info label {
            font-weight: 700;
            color: var(--text-main);
            display: block;
            font-size: 0.85rem;
            margin-bottom: 0.1rem;
          }
          .st-setting-info p {
            font-size: 0.72rem;
            color: var(--text-dim);
            margin: 0;
          }
          .st-input {
            padding: 0.6rem 0.9rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            color: var(--text-main);
            font-size: 0.82rem;
            min-width: 260px;
            transition: all var(--transition-fast);
          }
          .st-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); outline: none; }
          .st-select {
            padding: 0.6rem 0.9rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            color: var(--text-main);
            font-size: 0.82rem;
            cursor: pointer;
          }
          .st-btn-primary {
            display: flex; align-items: center; gap: 0.4rem;
            padding: 0.65rem 1.4rem;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            border-radius: var(--radius-sm);
            font-weight: 700;
            font-size: 0.8rem;
            border: none;
            cursor: pointer;
            transition: all var(--transition-fast);
            box-shadow: 0 4px 12px rgba(99,102,241,0.2);
          }
          .st-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(99,102,241,0.3); }
          .st-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
          .st-btn-ghost {
            display: flex; align-items: center; gap: 0.4rem;
            padding: 0.5rem 1rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            color: var(--text-muted);
            font-size: 0.78rem;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .st-btn-ghost:hover { background: var(--bg-hover); color: var(--text-main); border-color: var(--primary); }

          /* Toggle */
          .st-toggle {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
            flex-shrink: 0;
          }
          .st-toggle input { opacity: 0; width: 0; height: 0; }
          .st-toggle-slider {
            position: absolute; cursor: pointer; inset: 0;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 100px;
            transition: all var(--transition-fast);
          }
          .st-toggle-slider:before {
            content: ""; position: absolute;
            height: 18px; width: 18px;
            left: 2px; bottom: 2px;
            background: white;
            border-radius: 50%;
            transition: all var(--transition-fast);
          }
          .st-toggle input:checked + .st-toggle-slider { background: var(--primary); border-color: var(--primary); }
          .st-toggle input:checked + .st-toggle-slider:before { transform: translateX(20px); }

          /* Color Picker */
          .st-color-picker { display: flex; gap: 0.5rem; }
          .st-color-opt {
            width: 32px; height: 32px;
            border-radius: 50%;
            border: 2px solid transparent;
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .st-color-opt:hover { transform: scale(1.15); border-color: var(--border); }

          /* Stats */
          .st-stats-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
          .st-stat-pill {
            display: flex; align-items: center; gap: 0.4rem;
            padding: 0.35rem 0.8rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 100px;
            font-size: 0.72rem;
            font-weight: 700;
            color: var(--text-muted);
          }
          .st-stat-active { background: rgba(16,185,129,0.1); border-color: var(--accent); color: var(--accent); }
          .st-stat-pending { background: rgba(245,158,11,0.1); border-color: var(--warning); color: var(--warning); }

          /* Table */
          .st-table-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            backdrop-filter: var(--glass);
            box-shadow: var(--shadow-md);
            overflow: hidden;
          }
          .st-table-toolbar {
            display: flex; gap: 0.6rem;
            padding: 0.8rem 1rem;
            border-bottom: 1px solid var(--border);
            background: var(--bg-hover);
          }
          .st-search {
            flex: 1; display: flex; align-items: center; gap: 0.5rem;
            padding: 0 0.6rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            color: var(--text-dim);
          }
          .st-search input {
            flex: 1; padding: 0.4rem 0;
            background: transparent; border: none;
            color: var(--text-main); font-size: 0.78rem; font-weight: 600;
            outline: none;
          }
          .st-search input::placeholder { color: var(--text-dim); }
          .st-table { width: 100%; border-collapse: collapse; }
          .st-table th {
            padding: 0.8rem 1rem;
            text-align: left;
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-dim);
            border-bottom: 1px solid var(--border);
            background: var(--bg-hover);
          }
          .st-table td {
            padding: 0.7rem 1rem;
            border-bottom: 1px solid var(--border-light);
            font-size: 0.8rem;
          }
          .st-table tr:last-child td { border-bottom: none; }
          .st-table tr:hover td { background: rgba(99,102,241,0.02); }
          .st-user-cell { display: flex; align-items: center; gap: 0.6rem; }
          .st-avatar {
            width: 34px; height: 34px; border-radius: var(--radius-sm);
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            font-weight: 800; font-size: 0.8rem; color: white;
          }
          .st-user-info strong { display: block; font-size: 0.82rem; color: var(--text-main); margin-bottom: 0.05rem; }
          .st-user-info span { font-size: 0.7rem; color: var(--text-dim); }
          .st-role-select {
            padding: 0.35rem 0.6rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            color: var(--text-main);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
          }
          .st-perm-row { display: flex; gap: 0.3rem; }
          .st-status-tag {
            padding: 0.25rem 0.6rem;
            border-radius: 100px;
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
          }
          .st-st-active { background: rgba(16,185,129,0.1); color: var(--accent); }
          .st-st-pending { background: rgba(245,158,11,0.1); color: var(--warning); }
          .st-action-row { display: flex; gap: 0.3rem; }

          /* Categories */
          .st-cat-form { margin-bottom: 0.5rem; }
          .st-cat-form h3 {
            font-size: 0.85rem;
            font-weight: 800;
            color: var(--text-muted);
            margin: 0 0 0.6rem 0;
          }
          .st-cat-form-row { display: flex; gap: 0.6rem; }
          .st-cat-form-row .st-input { flex: 1; min-width: auto; }
          .st-error-text {
            color: var(--danger);
            font-size: 0.78rem;
            font-weight: 600;
            margin-top: 0.5rem;
          }
          .st-cat-list-section { margin-top: 1rem; }
          .st-cat-list-section h3 {
            font-size: 0.85rem;
            font-weight: 800;
            color: var(--text-muted);
            margin: 0 0 0.6rem 0;
          }
          .st-empty-text { color: var(--text-dim); text-align: center; padding: 1.5rem; font-size: 0.8rem; }
          .st-cat-list { display: flex; flex-direction: column; gap: 0.4rem; }
          .st-cat-item {
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.6rem 0.8rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            transition: all var(--transition-fast);
          }
          .st-cat-item:hover { background: var(--bg-hover); border-color: var(--primary-glow); }
          .st-cat-info { display: flex; align-items: center; gap: 0.6rem; }
          .st-cat-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            box-shadow: 0 0 6px rgba(99,102,241,0.3);
          }
          .st-cat-name { font-weight: 700; font-size: 0.82rem; color: var(--text-main); }
          .st-cat-actions { display: flex; gap: 0.3rem; align-items: center; }
          .st-cat-action-btn {
            padding: 0.35rem;
            border-radius: var(--radius-sm);
            color: var(--text-dim);
            cursor: pointer;
            transition: all var(--transition-fast);
            border: none;
            background: transparent;
            display: flex;
          }
          .st-cat-action-btn:hover { background: rgba(99,102,241,0.1); color: var(--primary); }
          .st-cat-del-btn:hover { background: rgba(239,68,68,0.1); color: var(--danger); }
          .st-cat-edit { display: flex; align-items: center; gap: 0.5rem; width: 100%; }
          .st-cat-edit-input {
            flex: 1; padding: 0.4rem 0.6rem;
            background: var(--bg-deep);
            border: 1px solid var(--primary);
            border-radius: var(--radius-sm);
            color: var(--text-main);
            font-size: 0.82rem;
            outline: none;
            box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
          }
          .st-cat-edit-actions { display: flex; gap: 0.3rem; }
          .st-btn-icon-sm {
            padding: 0.35rem;
            border-radius: var(--radius-sm);
            border: none;
            cursor: pointer;
            transition: all var(--transition-fast);
            display: flex;
          }
          .st-btn-save { background: rgba(16,185,129,0.1); color: var(--accent); }
          .st-btn-save:hover { background: rgba(16,185,129,0.2); }
          .st-btn-cancel { background: rgba(239,68,68,0.1); color: var(--danger); }
          .st-btn-cancel:hover { background: rgba(239,68,68,0.2); }
          .st-delete-confirm { display: flex; align-items: center; gap: 0.3rem; }
          .st-delete-text { font-size: 0.7rem; font-weight: 700; color: var(--danger); }
          .st-btn-sm {
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
            font-size: 0.65rem;
            font-weight: 700;
            cursor: pointer;
            border: none;
            transition: all var(--transition-fast);
          }
          .st-btn-yes { background: rgba(239,68,68,0.15); color: var(--danger); }
          .st-btn-yes:hover { background: rgba(239,68,68,0.3); color: #fff; }
          .st-btn-no { background: rgba(255,255,255,0.05); color: var(--text-dim); border: 1px solid var(--border); }
          .st-btn-no:hover { background: rgba(255,255,255,0.1); color: var(--text-main); }

          /* Data Grid */
          .st-data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.8rem;
          }
          .st-data-stat {
            display: flex; align-items: center; gap: 0.8rem;
            padding: 0.8rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
          }
          .st-data-stat svg { color: var(--primary); flex-shrink: 0; }
          .st-data-stat strong { display: block; font-size: 0.82rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.1rem; }
          .st-data-stat span { font-size: 0.7rem; color: var(--text-dim); }

          @media (max-width: 1024px) {
            .st-layout { grid-template-columns: 1fr; }
            .st-sidebar { position: static; flex-direction: row; overflow-x: auto; gap: 0.2rem; }
            .st-tab { white-space: nowrap; flex-shrink: 0; }
            .st-tab span:not(.st-admin-badge) { font-size: 0.7rem; }
          }
          @media (max-width: 768px) {
            .st-root { padding: 1rem; }
            .st-header { flex-direction: column; gap: 1rem; }
            .st-setting { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
            .st-input { min-width: 100%; }
            .st-section-header { flex-direction: column; gap: 0.6rem; }
            .st-table { font-size: 0.7rem; }
            .st-table th, .st-table td { padding: 0.5rem 0.6rem; }
          }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}

function PermissionToggle({ active, onToggle }: { active: boolean, onToggle: (val: boolean) => void }) {
  return (
    <button
      className={`st-perm-toggle ${active ? 'st-pt-active' : 'st-pt-inactive'}`}
      onClick={() => onToggle(!active)}
    >
      {active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
    </button>
  );
}
