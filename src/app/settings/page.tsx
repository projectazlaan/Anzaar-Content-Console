"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/lib/AuthContext";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateUserRole, deleteUser, getCategories, addCategory, removeCategory } from "@/lib/actions";
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
  Plus
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
    const result = await addCategory(newCategory.trim());
    setIsCategorySubmitting(false);

    if (result.success) {
      setNewCategory("");
      loadCategories();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    
    const result = await removeCategory(id);
    if (result.success) {
      loadCategories();
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
        <div className="settings-page">
          <header className="settings-header">
            <div>
              <h1 className="text-gradient">Settings</h1>
              <p>Manage your application preferences and configurations</p>
            </div>
            <div className="header-actions">
              <button className="btn-icon" onClick={() => window.location.reload()}>
                <RefreshCw size={20} />
              </button>
              <button className="btn-danger" onClick={handleSignOut}>
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          <div className="settings-layout">
            {/* Sidebar Tabs */}
            <aside className="settings-sidebar glass">
              {filteredTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={20} />
                    <span>{tab.name}</span>
                    {tab.adminOnly && <span className="admin-badge">Admin</span>}
                  </button>
                );
              })}
            </aside>

            {/* Main Content */}
            <div className="settings-content">
              {activeTab === "general" && (
                <div className="settings-section animate-fade">
                  <h2>General Settings</h2>
                  <p className="section-description">Configure your application's basic settings</p>
                  
                  <div className="settings-card glass">
                    <div className="setting-item">
                      <div className="setting-info">
                        <Globe size={20} />
                        <div>
                          <label>Site Name</label>
                          <p>Display name for your application</p>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={siteConfig.siteName}
                        onChange={(e) => setSiteConfig({...siteConfig, siteName: e.target.value})}
                        className="setting-input"
                      />
                    </div>

                    <div className="setting-divider"></div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <Mail size={20} />
                        <div>
                          <label>Site Description</label>
                          <p>Short description of your application</p>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={siteConfig.siteDescription}
                        onChange={(e) => setSiteConfig({...siteConfig, siteDescription: e.target.value})}
                        className="setting-input"
                      />
                    </div>

                    <div className="setting-divider"></div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <Shield size={20} />
                        <div>
                          <label>Auto-Approve First User</label>
                          <p>First registered user becomes Super Admin automatically</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={siteConfig.autoApproveFirstUser}
                          onChange={(e) => setSiteConfig({...siteConfig, autoApproveFirstUser: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="setting-divider"></div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <Users size={20} />
                        <div>
                          <label>Allow Registration</label>
                          <p>Enable new user registration</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={siteConfig.allowRegistration}
                          onChange={(e) => setSiteConfig({...siteConfig, allowRegistration: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="setting-divider"></div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <AlertTriangle size={20} />
                        <div>
                          <label>Maintenance Mode</label>
                          <p>Disable access for all users except admins</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={siteConfig.maintenanceMode}
                          onChange={(e) => setSiteConfig({...siteConfig, maintenanceMode: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="setting-actions">
                      <button className="btn-primary">
                        <Save size={18} />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "users" && currentUser?.role === "admin" && (
                <div className="settings-section animate-fade">
                  <div className="section-header">
                    <div>
                      <h2>User Management</h2>
                      <p className="section-description">Manage all registered users and their roles</p>
                    </div>
                    <div className="section-stats">
                      <div className="stat-badge">
                        <Users size={16} />
                        <span>{users.length} Total Users</span>
                      </div>
                      <div className="stat-badge active">
                        <UserCheck size={16} />
                        <span>{users.filter(u => u.role !== 'pending').length} Active</span>
                      </div>
                      <div className="stat-badge pending">
                        <Clock size={16} />
                        <span>{users.filter(u => u.role === 'pending').length} Pending</span>
                      </div>
                    </div>
                  </div>

                  <div className="users-table-container glass">
                    <div className="table-header">
                      <div className="search-box">
                        <Search size={18} />
                        <input type="text" placeholder="Search users..." />
                      </div>
                      <button className="btn-secondary">
                        <Filter size={18} />
                        <span>Filter</span>
                      </button>
                    </div>

                    <table className="users-table">
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
                              <div className="user-cell">
                                <div className="user-avatar bg-gradient">
                                  {user.email?.[0].toUpperCase()}
                                </div>
                                <div className="user-info">
                                  <strong>{user.email?.split('@')[0]}</strong>
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <select
                                className="role-select"
                                value={user.role}
                                onChange={(e) => handleUpdateUser(user.uid, e.target.value, user.permissions)}
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
                              <div className="permissions-row">
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
                              <span className={`status-badge ${user.role === 'pending' ? 'pending' : 'active'}`}>
                                {user.role === 'pending' ? 'Pending' : 'Active'}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button className="btn-icon" onClick={() => setSelectedUser(user)}>
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  className="btn-icon danger" 
                                  onClick={() => handleDeleteUser(user.uid)}
                                  disabled={user.uid === currentUser?.uid}
                                >
                                  <Trash2 size={16} />
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
                <div className="settings-section animate-fade">
                  <h2>Category Management</h2>
                  <p className="section-description">Manage the product categories available in the Designer Portal</p>
                  
                  <div className="settings-card glass">
                    <div className="category-form">
                      <h3>Add New Category</h3>
                      <form onSubmit={handleAddCategory} className="add-category-form">
                        <input
                          type="text"
                          placeholder="Enter category name (e.g. Sarees)"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="category-input"
                          required
                        />
                        <button type="submit" className="btn-primary" disabled={isCategorySubmitting || !newCategory.trim()}>
                          <Plus size={18} />
                          <span>Add</span>
                        </button>
                      </form>
                    </div>

                    <div className="setting-divider"></div>

                    <div className="categories-list-section">
                      <h3>Active Categories ({categories.length})</h3>
                      {categories.length === 0 ? (
                        <p className="empty-categories">No categories found. Add one above.</p>
                      ) : (
                        <div className="categories-list">
                          {categories.map((cat) => (
                            <div key={cat.id} className="category-item">
                              <div className="category-info">
                                <div className="category-bullet"></div>
                                <span className="category-name">{cat.name}</span>
                              </div>
                              <button 
                                className="delete-category-btn" 
                                onClick={() => handleDeleteCategory(cat.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="settings-section animate-fade">
                  <h2>Appearance Settings</h2>
                  <p className="section-description">Customize the look and feel of your application</p>
                  
                  <div className="settings-card glass">
                    <div className="setting-item">
                      <div className="setting-info">
                        <Moon size={20} />
                        <div>
                          <label>Dark Mode</label>
                          <p>Use dark theme across the application</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" defaultChecked />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="setting-divider"></div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <Palette size={20} />
                        <div>
                          <label>Accent Color</label>
                          <p>Primary color for buttons and highlights</p>
                        </div>
                      </div>
                      <div className="color-picker">
                        {['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444'].map(color => (
                          <button
                            key={color}
                            className="color-option"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="settings-section animate-fade">
                  <h2>Security Settings</h2>
                  <p className="section-description">Manage your account security and authentication</p>
                  
                  <div className="settings-card glass">
                    <div className="setting-item">
                      <div className="setting-info">
                        <Lock size={20} />
                        <div>
                          <label>Two-Factor Authentication</label>
                          <p>Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="setting-divider"></div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <Eye size={20} />
                        <div>
                          <label>Session Timeout</label>
                          <p>Automatically log out after inactivity</p>
                        </div>
                      </div>
                      <select className="setting-select">
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
                <div className="settings-section animate-fade">
                  <h2>Data & Storage</h2>
                  <p className="section-description">Manage your application data and cloud storage</p>
                  
                  <div className="settings-card glass">
                    <div className="stat-grid">
                      <div className="data-stat">
                        <Database size={24} />
                        <div className="data-stat-info">
                          <strong>Firestore Database</strong>
                          <span>Connected</span>
                        </div>
                      </div>
                      <div className="data-stat">
                        <TrendingUp size={24} />
                        <div className="data-stat-info">
                          <strong>Total Products</strong>
                          <span>{users.length} records</span>
                        </div>
                      </div>
                    </div>

                    <div className="setting-divider"></div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <Activity size={20} />
                        <div>
                          <label>Real-time Sync</label>
                          <p>Enable live data updates across all clients</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" defaultChecked />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .settings-page {
            padding: 2rem;
            max-width: 1400px;
          }

          .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2.5rem;
            gap: 2rem;
          }

          .settings-header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
          }

          .settings-header p {
            color: var(--text-muted);
          }

          .header-actions {
            display: flex;
            gap: 1rem;
          }

          .btn-icon {
            padding: 0.8rem;
            border-radius: var(--radius-md);
            background: var(--bg-input);
            border: 1px solid var(--border);
            color: var(--text-main);
            transition: all var(--transition-base);
          }

          .btn-icon:hover {
            background: var(--bg-hover);
            border-color: var(--primary);
          }

          .btn-danger {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.8rem 1.5rem;
            border-radius: var(--radius-md);
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #f87171;
            font-weight: 600;
            transition: all var(--transition-base);
          }

          .btn-danger:hover {
            background: rgba(239, 68, 68, 0.2);
          }

          .settings-layout {
            display: grid;
            grid-template-columns: 250px 1fr;
            gap: 2rem;
          }

          .settings-sidebar {
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            height: fit-content;
            position: sticky;
            top: 2rem;
          }

          .settings-tab {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-radius: var(--radius-md);
            color: var(--text-muted);
            transition: all var(--transition-base);
            position: relative;
          }

          .settings-tab:hover {
            background: var(--bg-hover);
            color: var(--text-main);
          }

          .settings-tab.active {
            background: var(--bg-hover);
            color: var(--text-main);
            border-left: 3px solid var(--primary);
          }

          .admin-badge {
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            background: var(--warning);
            color: black;
            border-radius: 100px;
            font-weight: 700;
          }

          .settings-section h2 {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
          }

          .section-description {
            color: var(--text-muted);
            margin-bottom: 2rem;
          }

          .settings-card {
            padding: 2rem;
          }

          .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 2rem;
            padding: 1.5rem 0;
          }

          .setting-info {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex: 1;
          }

          .setting-info svg {
            color: var(--primary);
          }

          .setting-info label {
            font-weight: 600;
            color: var(--text-main);
            display: block;
            margin-bottom: 0.3rem;
          }

          .setting-info p {
            font-size: 0.9rem;
            color: var(--text-dim);
          }

          .setting-input {
            padding: 0.8rem 1rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            color: var(--text-main);
            min-width: 300px;
          }

          .setting-select {
            padding: 0.8rem 1rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            color: var(--text-main);
          }

          .setting-divider {
            height: 1px;
            background: var(--border);
          }

          .setting-actions {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
          }

          .btn-primary {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            border-radius: var(--radius-md);
            font-weight: 700;
            transition: all var(--transition-base);
          }

          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px var(--primary-glow);
          }

          /* Toggle Switch */
          .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 26px;
          }

          .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .toggle-slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 100px;
            transition: all var(--transition-base);
          }

          .toggle-slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 3px;
            bottom: 2px;
            background: white;
            border-radius: 50%;
            transition: all var(--transition-base);
          }

          .toggle-switch input:checked + .toggle-slider {
            background: var(--primary);
            border-color: var(--primary);
          }

          .toggle-switch input:checked + .toggle-slider:before {
            transform: translateX(24px);
          }

          /* Color Picker */
          .color-picker {
            display: flex;
            gap: 0.8rem;
          }

          .color-option {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid transparent;
            transition: all var(--transition-base);
          }

          .color-option:hover {
            transform: scale(1.1);
          }

          /* Users Table */
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
          }

          .section-stats {
            display: flex;
            gap: 1rem;
          }

          .stat-badge {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 100px;
            font-size: 0.85rem;
            font-weight: 600;
          }

          .stat-badge.active {
            background: rgba(16, 185, 129, 0.1);
            border-color: var(--accent);
            color: var(--accent);
          }

          .stat-badge.pending {
            background: rgba(245, 158, 11, 0.1);
            border-color: var(--warning);
            color: var(--warning);
          }

          .users-table-container {
            overflow: hidden;
          }

          .table-header {
            padding: 1.5rem;
            display: flex;
            gap: 1rem;
            border-bottom: 1px solid var(--border);
          }

          .search-box {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 0.8rem;
            background: var(--bg-input);
            padding: 0.8rem 1.2rem;
            border-radius: var(--radius-md);
            border: 1px solid var(--border);
          }

          .search-box input {
            background: none;
            border: none;
            color: var(--text-main);
            width: 100%;
            outline: none;
          }

          .btn-secondary {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.8rem 1.2rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            color: var(--text-muted);
            font-weight: 600;
          }

          .users-table {
            width: 100%;
            border-collapse: collapse;
          }

          .users-table th {
            padding: 1.2rem 1.5rem;
            text-align: left;
            font-size: 0.85rem;
            text-transform: uppercase;
            color: var(--text-dim);
            border-bottom: 1px solid var(--border);
          }

          .users-table td {
            padding: 1.2rem 1.5rem;
            border-bottom: 1px solid var(--border);
          }

          .user-cell {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: white;
          }

          [data-theme="light"] .user-avatar {
            color: white;
          }

          .user-info {
            display: flex;
            flex-direction: column;
          }

          .user-info strong {
            margin-bottom: 0.2rem;
            color: var(--text-main);
          }

          .user-info span {
            font-size: 0.85rem;
            color: var(--text-dim);
          }

          .role-select {
            padding: 0.5rem 1rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            color: var(--text-main);
            font-size: 0.9rem;
          }

          .permissions-row {
            display: flex;
            gap: 0.5rem;
          }

          .status-badge {
            padding: 0.4rem 0.8rem;
            border-radius: 100px;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
          }

          .status-badge.active {
            background: rgba(16, 185, 129, 0.1);
            color: var(--accent);
          }

          .status-badge.pending {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning);
          }

          .action-buttons {
            display: flex;
            gap: 0.5rem;
          }

          .btn-icon.danger {
            color: #f87171;
          }

          .btn-icon.danger:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: #f87171;
          }

          .btn-icon:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }

          /* Stat Grid */
          .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
          }

          .data-stat {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            padding: 1.5rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
          }

          .data-stat svg {
            color: var(--primary);
          }

          .data-stat-info strong {
            display: block;
            margin-bottom: 0.3rem;
          }

          .data-stat-info span {
            font-size: 0.9rem;
            color: var(--text-dim);
          }

          /* Categories Section */
          .category-form {
            margin-bottom: 1rem;
          }

          .category-form h3 {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text-main);
            margin-bottom: 1rem;
          }

          .add-category-form {
            display: flex;
            gap: 1rem;
          }

          .category-input {
            flex: 1;
            padding: 0.8rem 1rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            color: var(--text-main);
            font-size: 0.9rem;
          }

          .category-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }

          .categories-list-section {
            margin-top: 1.5rem;
          }

          .categories-list-section h3 {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text-main);
            margin-bottom: 1rem;
          }

          .empty-categories {
            color: var(--text-dim);
            text-align: center;
            padding: 2rem;
          }

          .categories-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .category-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            transition: all var(--transition-base);
          }

          .category-item:hover {
            background: var(--bg-hover);
            border-color: var(--primary);
          }

          .category-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .category-bullet {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
          }

          .category-name {
            font-weight: 600;
            color: var(--text-main);
          }

          .delete-category-btn {
            padding: 0.5rem;
            border-radius: var(--radius-sm);
            color: var(--text-dim);
            transition: all var(--transition-base);
          }

          .delete-category-btn:hover {
            background: rgba(239, 68, 68, 0.1);
            color: #f87171;
          }

          @media (max-width: 1024px) {
            .settings-layout {
              grid-template-columns: 1fr;
            }
            .settings-sidebar {
              position: static;
              flex-direction: row;
              overflow-x: auto;
            }
            .settings-tab span {
              display: none;
            }
            .admin-badge {
              display: none;
            }
          }

          @media (max-width: 768px) {
            .settings-page {
              padding: 1rem;
              padding-top: 90px;
            }
            .settings-header {
              flex-direction: column;
            }
            .setting-item {
              flex-direction: column;
              align-items: flex-start;
            }
            .setting-input {
              min-width: 100%;
            }
            .users-table {
              font-size: 0.85rem;
            }
            .section-header {
              flex-direction: column;
              gap: 1rem;
            }
          }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}

function PermissionToggle({ active, onToggle }: { active: boolean, onToggle: (val: boolean) => void }) {
  return (
    <button
      className={`permission-toggle ${active ? 'active' : 'inactive'}`}
      onClick={() => onToggle(!active)}
    >
      {active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
    </button>
  );
}
