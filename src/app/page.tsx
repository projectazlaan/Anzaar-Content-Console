"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { 
  Palette, 
  Clapperboard, 
  Camera, 
  PenTool, 
  Database,
  ShieldCheck,
  Loader2 
} from "lucide-react";

const roles = [
  { id: "designer", name: "Designer", icon: Palette, href: "/designer", desc: "Upload and manage new product designs", color: "#6366f1" },
  { id: "director", name: "Director", icon: Clapperboard, href: "/director", desc: "Manage production workflow and review content", color: "#a855f7" },
  { id: "shooter", name: "Shooter", icon: Camera, href: "/shooting", desc: "View assignments and upload raw footage", color: "#f59e0b" },
  { id: "editor", name: "Editor", icon: PenTool, href: "/editing", desc: "Edit selects and handle corrections", color: "#10b981" },
  { id: "mother_drive", name: "Mother Drive", icon: Database, href: "/mother-drive", desc: "Master archive and production history", color: "#ef4444" },
];

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="ep-loading">
        <Loader2 className="ep-spinner" size={48} color="#6366f1" />
      </div>
    );
  }

  const filteredRoles = roles;

  return (
    <main className="ep-root">
      {/* Ambient Background */}
      <div className="ep-ambient" aria-hidden="true">
        <div className="ep-orb ep-orb-1" />
        <div className="ep-orb ep-orb-2" />
        <div className="ep-orb ep-orb-3" />
        <div className="ep-grid-lines" />
      </div>

      <header className="ep-header animate-fade">
        <h1 className="ep-title">
          <span className="ep-title-accent">ANZAAR</span>
          <span className="ep-title-sub">CONTENT CONSOL</span>
        </h1>
        <p className="ep-welcome">Welcome back, <strong>{user.email?.split('@')[0]}</strong>. Choose your portal:</p>
      </header>

      <div className="ep-grid container">
        {user.role === "admin" && (
          <div 
            className="ep-card ep-admin-card animate-fade"
            onClick={() => router.push("/admin")}
          >
            <div className="ep-card-icon" style={{ backgroundColor: `rgba(248, 113, 113, 0.1)`, color: "#f87171" }}>
              <ShieldCheck size={32} />
            </div>
            <h3 className="ep-card-title">Admin Console</h3>
            <p className="ep-card-desc">Manage users, roles, and global production permissions.</p>
            <div className="ep-card-border" style={{ backgroundColor: "#f87171" }} />
            <div className="ep-card-shine" />
          </div>
        )}

        {filteredRoles.map((role, i) => (
          <div 
            key={role.name} 
            className="ep-card animate-fade"
            style={{ animationDelay: `${(i + 1) * 0.1}s` }}
            onClick={() => router.push(role.href)}
          >
            <div className="ep-card-icon" style={{ backgroundColor: `${role.color}20`, color: role.color }}>
              <role.icon size={32} />
            </div>
            <h3 className="ep-card-title">{role.name}</h3>
            <p className="ep-card-desc">{role.desc}</p>
            <div className="ep-card-border" style={{ backgroundColor: role.color }} />
            <div className="ep-card-shine" />
          </div>
        ))}

        {user.role === "pending" && (
          <div className="ep-pending animate-fade">
            <Loader2 className="ep-spinner" size={32} />
            <h2 className="ep-pending-title">Account Pending Approval</h2>
            <p className="ep-pending-desc">Your account has been created successfully. Please wait for a Super Admin to assign your role before you can access the production portals.</p>
            <button 
              className="ep-self-approve-btn"
              onClick={async () => {
                try {
                  const { forceSetAsAdmin } = await import('@/lib/actions');
                  const result = await forceSetAsAdmin(user.uid);
                  if (result.success) {
                    alert('✅ Successfully set as Admin! Reloading...');
                    window.location.reload();
                  } else {
                    alert('❌ Error: ' + result.error);
                  }
                } catch (error: any) {
                  alert('❌ Error: ' + error.message);
                }
              }}
            >
              Self-Approve as Admin (Quick Fix)
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .ep-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          position: relative;
          overflow: hidden;
          background: var(--bg-deep);
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          color: var(--text-main);
        }

        /* ── Ambient Background ── */
        .ep-ambient {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .ep-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          animation: ep-drift 20s ease-in-out infinite alternate;
        }
        .ep-orb-1 {
          width: 700px; height: 700px;
          background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
          top: -200px; left: -100px;
          animation-duration: 18s;
          opacity: 0.2;
        }
        .ep-orb-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, var(--secondary-glow) 0%, transparent 70%);
          top: 30%; right: 5%;
          animation-duration: 24s;
          animation-delay: -8s;
          opacity: 0.18;
        }
        .ep-orb-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, var(--info-glow) 0%, transparent 70%);
          bottom: 5%; left: 35%;
          animation-duration: 30s;
          animation-delay: -15s;
          opacity: 0.15;
        }
        @keyframes ep-drift {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.7; }
          50%  { transform: translate(40px, 30px) scale(1.08); opacity: 1; }
          100% { transform: translate(-20px, 15px) scale(0.93); opacity: 0.6; }
        }
        .ep-grid-lines {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.02) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        /* ── Header ── */
        .ep-header {
          text-align: center;
          margin-bottom: 4rem;
          position: relative;
          z-index: 1;
        }

        .ep-title {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1rem;
        }
        .ep-title-accent {
          font-size: clamp(2rem, 5vw, 4rem);
          font-weight: 900;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.1;
        }
        .ep-title-sub {
          font-size: clamp(1rem, 2.5vw, 1.8rem);
          font-weight: 600;
          letter-spacing: 0.15em;
          background: linear-gradient(135deg, var(--text-muted), var(--text-dim));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-top: 0.25rem;
        }

        .ep-welcome {
          color: var(--text-dim);
          font-size: clamp(1rem, 2vw, 1.2rem);
        }

        /* ── Grid ── */
        .ep-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          width: 100%;
          max-width: 1400px;
          position: relative;
          z-index: 1;
        }

        /* ── Cards ── */
        .ep-card {
          padding: 3rem 2.5rem;
          text-align: left;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          min-height: 320px;
          border-radius: var(--radius-xl);
          background: var(--bg-card);
          border: 1px solid var(--border);
          backdrop-filter: var(--glass);
          box-shadow: var(--shadow-xl);
          transition: all var(--transition-slow);
        }

        .ep-card-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          transition: left 0.6s ease;
          pointer-events: none;
        }

        .ep-card:hover .ep-card-shine {
          left: 100%;
        }

        .ep-card:hover {
          transform: translateY(-10px) scale(1.02);
          background: var(--bg-hover);
          border-color: var(--border-glow);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 40px var(--primary-glow);
        }

        .ep-admin-card:hover {
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 40px var(--danger-glow);
        }

        .ep-card-icon {
          width: 70px;
          height: 70px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          transition: all var(--transition-base);
          position: relative;
          z-index: 1;
        }

        .ep-card:hover .ep-card-icon {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .ep-card-title {
          font-size: clamp(1.5rem, 2vw, 1.8rem);
          margin-bottom: 1rem;
          position: relative;
          z-index: 1;
          color: var(--text-main);
        }

        .ep-card-desc {
          color: var(--text-muted);
          font-size: 1rem;
          line-height: 1.6;
          position: relative;
          z-index: 1;
        }

        .ep-card-border {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 6px;
          transition: width var(--transition-base);
          border-radius: 0 0 var(--radius-xl) var(--radius-xl);
        }

        .ep-card:hover .ep-card-border { 
          width: 100%; 
        }

        /* ── Pending Notice ── */
        .ep-pending {
          grid-column: 1 / -1;
          padding: 4rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          border-radius: var(--radius-xl);
          background: rgba(251, 191, 36, 0.03);
          border: 1px dashed rgba(251, 191, 36, 0.3);
          backdrop-filter: var(--glass);
          animation: ep-pulse 2s ease-in-out infinite;
        }

        .ep-pending-title { 
          color: #fbbf24; 
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
        }
        .ep-pending-desc { 
          color: var(--text-dim); 
          max-width: 600px; 
          font-size: clamp(0.95rem, 1.5vw, 1.1rem);
          line-height: 1.6;
        }

        .ep-self-approve-btn {
          margin-top: 0.5rem;
          padding: 0.8rem 2rem;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--warning), #f97316);
          color: white;
          font-weight: 700;
          cursor: pointer;
          border: none;
          font-size: 1rem;
          transition: all var(--transition-base);
          box-shadow: 0 4px 14px var(--warning-glow);
        }
        .ep-self-approve-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px var(--warning-glow);
          filter: brightness(1.1);
        }

        .ep-spinner { 
          animation: ep-spin 1s linear infinite; 
        }
        @keyframes ep-spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }

        @keyframes ep-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .ep-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: var(--bg-deep);
        }

        @media (max-width: 768px) {
          .ep-root {
            padding: 2rem 1rem;
          }
          .ep-header {
            margin-bottom: 2rem;
          }
          .ep-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .ep-card {
            padding: 2rem;
            min-height: auto;
          }
          .ep-orb {
            width: 400px;
            height: 400px;
          }
        }

        @media (max-width: 480px) {
          .ep-card {
            padding: 1.5rem;
          }
          .ep-card-icon {
            width: 60px;
            height: 60px;
            margin-bottom: 1.5rem;
          }
        }
      `}</style>
    </main>
  );
}
