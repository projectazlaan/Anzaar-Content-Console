"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { 
  Palette, 
  Clapperboard, 
  Camera, 
  PenTool, 
  Database, 
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Settings,
  Layers,
  Zap,
  ArrowLeft,
  ArrowRight,
  Moon, Sun
} from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";

const navItems = [
  { id: "designer", name: "Designer", icon: Palette, href: "/designer", adminOnly: false, gradient: "from-indigo-500 to-purple-600" },
  { id: "director", name: "Director", icon: Clapperboard, href: "/director", adminOnly: false, gradient: "from-purple-500 to-pink-600" },
  { id: "shooter", name: "Shooting", icon: Camera, href: "/shooting", adminOnly: false, gradient: "from-emerald-500 to-teal-600" },
  { id: "editor", name: "Editing", icon: PenTool, href: "/editing", adminOnly: false, gradient: "from-amber-500 to-orange-600" },
  { id: "mother_drive", name: "Mother Drive", icon: Database, href: "/mother-drive", adminOnly: false, gradient: "from-cyan-500 to-blue-600" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkTheme(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    if (newTheme) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const filteredItems = navItems.filter(item => 
    user?.role === "admin" || user?.role === item.id || (item.id === "shooter" && user?.role === "shooter")
  );

  if (!mounted) return null;

  return (
    <>
      {/* Mobile Toggle — OUTSIDE sidebar so it's always visible */}
      <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(!isMobileOpen)}>
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile — OUTSIDE sidebar */}
      {isMobileOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileOpen(false)} />
      )}

      <div className={`sidebar-wrapper ${isMobileOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <aside className="sidebar-premium">
          {/* Top Section */}
          <div className="sidebar-top">
            <div className="brand-section" onClick={() => router.push("/")}>
              <div className="brand-logo">
                <div className="logo-ring">
                  <Zap size={24} className="logo-icon" />
                </div>
              </div>
              {!isCollapsed && (
                <div className="brand-info">
                  <h1 className="brand-name">ANZAAR</h1>
                  <p className="brand-tagline">Content Console</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="sidebar-navigation">
            <div className="nav-group">
              {!isCollapsed && <p className="nav-group-title">Workspace</p>}
              
              {filteredItems.map((item, index) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link 
                    key={item.id} 
                    href={item.href} 
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setIsMobileOpen(false)}
                    onMouseEnter={() => setActiveTooltip(item.id)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`nav-icon-wrapper bg-gradient-to-r ${item.gradient}`}>
                      <item.icon size={20} className="nav-icon" />
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="nav-label">{item.name}</span>
                        {item.adminOnly && <span className="badge-admin">Admin</span>}
                      </>
                    )}
                    {isActive && <div className="active-dot" />}
                    
                    {isCollapsed && activeTooltip === item.id && (
                      <span className="tooltip">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="nav-group">
              {!isCollapsed && <p className="nav-group-title">System</p>}
              
              {user?.role === "admin" && (
                <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`} onClick={() => setIsMobileOpen(false)}>
                  <div className="nav-icon-wrapper bg-gradient-to-r from-yellow-500 to-orange-600">
                    <ShieldCheck size={20} className="nav-icon" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="nav-label">Super Admin</span>
                      <span className="badge-admin">Admin</span>
                    </>
                  )}
                  {pathname === '/admin' && <div className="active-dot" />}
                </Link>
              )}

              <Link href="/settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`} onClick={() => setIsMobileOpen(false)}>
                <div className="nav-icon-wrapper bg-gradient-to-r from-gray-500 to-slate-600">
                  <Settings size={20} className="nav-icon" />
                </div>
                {!isCollapsed && <span className="nav-label">Settings</span>}
                {pathname === '/settings' && <div className="active-dot" />}
              </Link>
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="sidebar-bottom">
            <div className="bottom-row">
              {/* User Profile */}
              <div className="user-avatar-small">
                <div className="avatar-gradient-small">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="online-indicator-small" />
              </div>
              
              {/* Notification Button */}
              <NotificationDropdown />
              
              {/* Theme Button */}
              <button className="bottom-action-btn" onClick={toggleTheme} title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              
              {/* Logout Button */}
              <button className="bottom-action-btn logout-action" onClick={handleSignOut} title="Sign Out">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* Collapse Toggle */}
        <button 
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="collapse-track">
            <span className="collapse-dot" />
            <span className="collapse-dot" />
            <span className="collapse-dot" />
          </span>
          <span className="collapse-icon">
            {isCollapsed ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          </span>
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          {filteredItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.id} href={item.href} className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}>
                <item.icon size={20} className="mobile-bottom-nav-icon" />
                <span className="mobile-bottom-nav-label">{item.name.length > 8 ? item.name.slice(0,7)+'..' : item.name}</span>
              </Link>
            );
          })}
          <Link href="/settings" className={`mobile-bottom-nav-item ${pathname === '/settings' ? 'active' : ''}`}>
            <Settings size={20} className="mobile-bottom-nav-icon" />
            <span className="mobile-bottom-nav-label">Settings</span>
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .sidebar-wrapper {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 1000;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sidebar-wrapper.collapsed .sidebar-premium {
          width: 80px;
        }

        .sidebar-premium {
          width: 300px;
          height: 100vh;
          background: linear-gradient(180deg, #0a0e1a 0%, #0f1629 50%, #0a0e1a 100%);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
        }

        [data-theme="light"] .sidebar-premium {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.08);
          border-right: 1px solid rgba(0, 0, 0, 0.08);
        }

        .sidebar-premium::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.15) 0%, transparent 40%);
          pointer-events: none;
          animation: bgShift 15s ease-in-out infinite alternate;
        }

        [data-theme="light"] .sidebar-premium::before {
          background: 
            radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 40%);
        }

        @keyframes bgShift {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .sidebar-top {
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          z-index: 1;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          padding: 8px;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .brand-section:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .brand-logo {
          position: relative;
        }

        .logo-ring {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
          animation: logoGlow 3s ease-in-out infinite;
        }

        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 12px 32px rgba(99, 102, 241, 0.6); }
        }

        .logo-ring::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 16px;
          background: linear-gradient(135deg, #6366f1, #a855f7, #6366f1);
          z-index: -1;
          opacity: 0.5;
          animation: rotate 4s linear infinite;
        }

        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .logo-icon {
          color: white;
          position: relative;
          z-index: 1;
        }

        [data-theme="light"] .logo-icon {
          color: white;
        }

        .brand-info {
          flex: 1;
        }

        .brand-name {
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
          letter-spacing: -0.02em;
          margin: 0;
        }

        [data-theme="light"] .brand-name {
          color: #0f172a;
        }

        .brand-tagline {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          font-weight: 500;
        }

        [data-theme="light"] .brand-tagline {
          color: rgba(15, 23, 42, 0.5);
        }

        .collapse-btn {
          position: absolute;
          top: 28px;
          left: 290px;
          width: 20px;
          height: 44px;
          border-radius: 10px;
          background: rgba(30, 41, 59, 0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 10;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .collapse-track {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          transition: opacity 0.3s ease;
        }

        .collapse-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transition: all 0.3s ease;
        }

        .collapse-icon {
          position: absolute;
          opacity: 0;
          transform: scale(0.5);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .collapse-btn:hover {
          width: 32px;
          left: 278px;
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(10, 132, 255, 0.3);
          color: white;
          box-shadow: 0 4px 16px rgba(10, 132, 255, 0.15);
        }

        .collapse-btn:hover .collapse-track {
          opacity: 0;
        }

        .collapse-btn:hover .collapse-icon {
          opacity: 1;
          transform: scale(1);
        }

        .collapsed .collapse-btn {
          left: 70px;
          background: rgba(10, 132, 255, 0.15);
          border-color: rgba(10, 132, 255, 0.2);
        }

        .collapsed .collapse-btn:hover {
          left: 58px;
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.4);
          box-shadow: 0 4px 20px rgba(10, 132, 255, 0.25);
        }

        [data-theme="light"] .collapse-btn {
          background: rgba(226, 232, 240, 0.6);
          border-color: rgba(0, 0, 0, 0.08);
          color: rgba(15, 23, 42, 0.5);
        }

        [data-theme="light"] .collapse-dot {
          background: rgba(15, 23, 42, 0.3);
        }

        [data-theme="light"] .collapse-btn:hover {
          background: rgba(203, 213, 225, 0.9);
          border-color: rgba(10, 132, 255, 0.3);
          color: #0f172a;
        }

        [data-theme="light"] .collapsed .collapse-btn {
          background: rgba(10, 132, 255, 0.1);
          border-color: rgba(10, 132, 255, 0.2);
        }

        [data-theme="light"] .collapsed .collapse-btn:hover {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.3);
        }


        .sidebar-navigation {
          flex: 1;
          padding: 0 12px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }

        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-group-title {
          font-size: 0.7rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.35);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0 12px 8px;
          margin: 0;
        }

        [data-theme="light"] .nav-group-title {
          color: rgba(15, 23, 42, 0.4);
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          position: relative;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          animation: slideIn 0.4s ease-out forwards;
          opacity: 0;
        }

        [data-theme="light"] .nav-link {
          color: rgba(15, 23, 42, 0.6);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          transform: translateX(4px);
        }

        [data-theme="light"] .nav-link:hover {
          background: rgba(0, 0, 0, 0.05);
          color: #0f172a;
        }

        .nav-link.active {
          background: rgba(99, 102, 241, 0.15);
          color: white;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
        }

        [data-theme="light"] .nav-link.active {
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
        }

        .nav-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s ease;
          position: relative;
        }

        .nav-link:hover .nav-icon-wrapper {
          transform: scale(1.1);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .nav-icon {
          color: white;
          position: relative;
          z-index: 1;
        }

        .nav-label {
          flex: 1;
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .badge-admin {
          font-size: 0.6rem;
          font-weight: 800;
          padding: 4px 8px;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: white;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .active-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.8);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }

        .tooltip {
          position: absolute;
          left: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%);
          background: #1e293b;
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 100;
          pointer-events: none;
        }

        [data-theme="light"] .tooltip {
          background: #0f172a;
          color: white;
        }

        .tooltip::before {
          content: '';
          position: absolute;
          left: -4px;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background: #1e293b;
          clip-path: polygon(100% 0, 0 50%, 100% 100%);
        }

        .sidebar-bottom {
          padding: 16px 12px 24px;
          position: relative;
          z-index: 1;
        }

        .bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .bottom-row {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .user-avatar-small {
          position: relative;
          flex-shrink: 0;
        }

        .avatar-gradient-small {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          font-size: 1rem;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .bottom-action-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        [data-theme="light"] .bottom-action-btn {
          background: rgba(0, 0, 0, 0.05);
          color: rgba(15, 23, 42, 0.6);
        }

        .bottom-action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transform: translateY(-2px);
        }

        [data-theme="light"] .bottom-action-btn:hover {
          background: rgba(0, 0, 0, 0.08);
          color: #0f172a;
        }

        .bottom-action-btn:active {
          transform: translateY(0) scale(0.95);
        }

        .logout-action:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .mobile-menu-btn {
          position: fixed;
          top: 16px;
          left: 16px;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          border: none;
          color: white;
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        [data-theme="light"] .mobile-menu-btn {
          background: linear-gradient(135deg, #6366f1, #a855f7);
          color: white;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
        }

        .mobile-menu-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 24px rgba(99, 102, 241, 0.5);
        }

        .mobile-menu-btn:active {
          transform: scale(0.95);
        }

        .mobile-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 999;
          backdrop-filter: blur(4px);
        }

        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex;
          }

          .sidebar-wrapper {
            transform: translateX(-100%);
          }

          .sidebar-wrapper.mobile-open {
            transform: translateX(0);
          }

          .sidebar-premium {
            width: 300px !important;
            box-shadow: 8px 0 32px rgba(0, 0, 0, 0.5);
          }

          .collapse-btn {
            display: none;
          }

          .mobile-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            animation: fadeIn 0.2s ease;
          }
        }

        /* ── Mobile Bottom Nav ── */
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 1050;
          background: rgba(10, 14, 26, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.4rem 0;
          padding-bottom: max(0.4rem, env(safe-area-inset-bottom));
        }

        [data-theme="light"] .mobile-bottom-nav {
          background: rgba(255, 255, 255, 0.95);
          border-top: 1px solid rgba(0, 0, 0, 0.08);
        }

        .mobile-bottom-nav-inner {
          display: flex;
          justify-content: space-around;
          align-items: center;
          max-width: 100%;
        }

        .mobile-bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 0.3rem 0.5rem;
          border-radius: 10px;
          text-decoration: none;
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.55rem;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
          background: none;
          border: none;
          min-width: 56px;
          -webkit-tap-highlight-color: transparent;
        }

        [data-theme="light"] .mobile-bottom-nav-item {
          color: rgba(15, 23, 42, 0.4);
        }

        .mobile-bottom-nav-item.active {
          color: #818cf8;
          background: rgba(99, 102, 241, 0.1);
        }

        [data-theme="light"] .mobile-bottom-nav-item.active {
          color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
        }

        .mobile-bottom-nav-item:active {
          transform: scale(0.9);
        }

        .mobile-bottom-nav-icon {
          width: 22px;
          height: 22px;
        }

        .mobile-bottom-nav-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 56px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: block;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
