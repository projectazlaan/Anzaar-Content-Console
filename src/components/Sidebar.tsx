"use client";

import React from "react";
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
  Settings
} from "lucide-react";

const navItems = [
  { id: "designer", name: "Designer", icon: Palette, href: "/designer", color: "#6366f1" },
  { id: "director", name: "Director", icon: Clapperboard, href: "/director", color: "#a855f7" },
  { id: "shooter", name: "Shooting", icon: Camera, href: "/shooting", color: "#f59e0b" },
  { id: "editor", name: "Editing", icon: PenTool, href: "/editing", color: "#10b981" },
  { id: "mother_drive", name: "Mother Drive", icon: Database, href: "/mother-drive", color: "#ef4444" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const filteredItems = navItems.filter(item => 
    user?.role === "admin" || user?.role === item.id || (item.id === "shooter" && user?.role === "shooter")
  );

  return (
    <div className="sidebar-container glass">
      <div className="sidebar-header">
        <div className="logo-glow"></div>
        <h1 className="text-gradient hover-scale" onClick={() => router.push("/")} style={{ cursor: 'pointer' }}>ANZAAR</h1>
        <p>CONTENT CONSOL</p>
      </div>

      <nav className="sidebar-nav">
        {user?.role === "admin" && (
          <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}>
            <div className="nav-icon-wrapper" style={{ '--icon-color': '#f87171' } as React.CSSProperties}>
              <ShieldCheck size={20} />
            </div>
            <span className="nav-text">Admin Console</span>
            {pathname === '/admin' && <div className="active-blob" style={{ backgroundColor: '#f87171' }}></div>}
          </Link>
        )}

        {filteredItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.name} href={item.href} className={`nav-link ${isActive ? 'active' : ''}`}>
              <div className="nav-icon-wrapper" style={{ '--icon-color': item.color } as React.CSSProperties}>
                <Icon size={20} />
              </div>
              <span className="nav-text">{item.name}</span>
              {isActive && <div className="active-blob" style={{ backgroundColor: item.color }}></div>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info-pill glass">
          <div className="user-avatar bg-gradient">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div className="user-meta">
            <strong>{user?.role}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
        
        <button className="nav-link signout-btn" onClick={handleSignOut}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>

      <style jsx>{`
        .sidebar-container {
          width: 280px;
          height: calc(100vh - 40px);
          margin: 20px;
          display: flex;
          flex-direction: column;
          padding: 2rem 1.5rem;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .sidebar-header {
          margin-bottom: 3rem;
          text-align: center;
          position: relative;
        }

        .logo-glow {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 60px;
          background: var(--primary);
          filter: blur(40px);
          opacity: 0.3;
          z-index: -1;
        }

        .sidebar-header h1 {
          font-size: 1.8rem;
          margin-bottom: 0.2rem;
        }

        .sidebar-header p {
          font-size: 0.7rem;
          letter-spacing: 0.3em;
          color: var(--text-dim);
          text-transform: uppercase;
        }

        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          padding: 0.8rem 1rem;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--text-muted);
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .nav-link:hover {
          background: var(--bg-hover);
          color: var(--text-main);
          transform: translateX(5px);
        }

        .nav-link.active {
          background: var(--bg-hover);
          color: var(--text-main);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .nav-icon-wrapper {
          margin-right: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--icon-color);
        }

        .nav-text {
          font-weight: 500;
          font-size: 0.95rem;
        }

        .active-blob {
          position: absolute;
          right: -10px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          filter: blur(10px);
          border-radius: 50%;
          opacity: 0.6;
        }

        .sidebar-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border);
        }

        .user-info-pill {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.8rem;
          border-radius: 12px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          font-size: 0.9rem;
        }

        .user-meta {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-meta strong {
          font-size: 0.85rem;
          text-transform: capitalize;
        }

        .user-meta span {
          font-size: 0.7rem;
          color: var(--text-dim);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .signout-btn {
          color: #f87171;
          gap: 1rem;
        }

        .signout-btn:hover {
          background: rgba(248, 113, 113, 0.1);
        }

        @media (max-width: 1024px) {
          .sidebar-container { width: 80px; padding: 2rem 0.5rem; }
          .nav-text, .sidebar-header p, .sidebar-header h1, .user-meta { display: none; }
          .nav-icon-wrapper { margin-right: 0; }
          .nav-link { justify-content: center; }
        }
      `}</style>
    </div>
  );
}
