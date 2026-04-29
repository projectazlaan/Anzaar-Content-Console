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

  // Show minimal loading state
  if (loading || !user) {
    return (
      <div className="flex-center" style={{ height: '100vh', background: '#020617' }}>
        <Loader2 className="spinner" size={48} color="#6366f1" />
      </div>
    );
  }

  const filteredRoles = roles;


  return (
    <main className="entry-page">
      <div className="bg-decor">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <header className="entry-header animate-fade">
        <h1 className="text-gradient">ANZAAR CONTENT CONSOL</h1>
        <p>Welcome back, <strong>{user.email?.split('@')[0]}</strong>. Choose your portal:</p>
      </header>

      <div className="role-grid container">
        {user.role === "admin" && (
          <div 
            className="role-card glass admin-card animate-fade"
            onClick={() => router.push("/admin")}
          >
            <div className="role-icon" style={{ backgroundColor: `rgba(248, 113, 113, 0.1)`, color: "#f87171" }}>
              <ShieldCheck size={32} />
            </div>
            <h3>Admin Console</h3>
            <p>Manage users, roles, and global production permissions.</p>
            <div className="role-border" style={{ backgroundColor: "#f87171" }}></div>
          </div>
        )}

        {filteredRoles.map((role, i) => (
          <div 
            key={role.name} 
            className="role-card glass animate-fade"
            style={{ animationDelay: `${(i + 1) * 0.1}s` }}
            onClick={() => router.push(role.href)}
          >
            <div className="role-icon" style={{ backgroundColor: `${role.color}20`, color: role.color }}>
              <role.icon size={32} />
            </div>
            <h3>{role.name}</h3>
            <p>{role.desc}</p>
            <div className="role-border" style={{ backgroundColor: role.color }}></div>
          </div>
        ))}

        {user.role === "pending" && (
          <div className="pending-notice glass animate-fade">
            <Loader2 className="spinner" size={32} />
            <h2>Account Pending Approval</h2>
            <p>Your account has been created successfully. Please wait for a Super Admin to assign your role before you can access the production portals.</p>
            <button 
              className="btn-primary"
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
              style={{ 
                marginTop: '1rem',
                padding: '0.8rem 2rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--warning), #f97316)',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                fontSize: '1rem'
              }}
            >
              Self-Approve as Admin (Quick Fix)
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .entry-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          position: relative;
          overflow: hidden;
          background: var(--bg-deep);
        }

        .bg-decor {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .blob {
          position: absolute;
          width: 600px;
          height: 600px;
          filter: blur(120px);
          opacity: 0.15;
          border-radius: 50%;
          animation: float 8s ease-in-out infinite;
        }

        .blob-1 { 
          background: var(--primary); 
          top: -200px; 
          right: -200px;
          animation-delay: 0s;
        }
        .blob-2 { 
          background: var(--secondary); 
          bottom: -200px; 
          left: -200px;
          animation-delay: 4s;
        }

        .entry-header {
          text-align: center;
          margin-bottom: 4rem;
          position: relative;
          z-index: 1;
        }

        .entry-header h1 {
          font-size: clamp(2rem, 5vw, 4rem);
          margin-bottom: 1rem;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .entry-header p {
          color: var(--text-dim);
          font-size: clamp(1rem, 2vw, 1.2rem);
        }

        .role-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          width: 100%;
          max-width: 1400px;
          position: relative;
          z-index: 1;
        }

        .role-card {
          padding: 3rem 2.5rem;
          text-align: left;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: all var(--transition-slow);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          min-height: 320px;
        }

        .role-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          transition: left 0.6s ease;
        }

        .role-card:hover::before {
          left: 100%;
        }

        .role-card:hover {
          transform: translateY(-10px) scale(1.02);
          background-color: var(--bg-hover);
          border-color: var(--border-glow);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 40px var(--primary-glow);
        }

        .admin-card:hover {
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 40px var(--danger-glow);
        }

        .role-icon {
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

        .role-card:hover .role-icon {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .role-card h3 {
          font-size: clamp(1.5rem, 2vw, 1.8rem);
          margin-bottom: 1rem;
          position: relative;
          z-index: 1;
        }

        .role-card p {
          color: var(--text-muted);
          font-size: 1rem;
          line-height: 1.6;
          position: relative;
          z-index: 1;
        }

        .role-border {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 6px;
          transition: width var(--transition-base);
          border-radius: 0 0 16px 16px;
        }

        .role-card:hover .role-border { 
          width: 100%; 
        }

        .pending-notice {
          grid-column: 1 / -1;
          padding: 4rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          background: rgba(251, 191, 36, 0.05);
          border: 1px dashed rgba(251, 191, 36, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }

        .pending-notice h2 { 
          color: #fbbf24; 
          font-size: clamp(1.5rem, 3vw, 2rem);
        }
        .pending-notice p { 
          color: var(--text-dim); 
          max-width: 600px; 
          font-size: clamp(0.95rem, 1.5vw, 1.1rem);
        }

        .spinner { 
          animation: spin 1s linear infinite; 
        }
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }

        @media (max-width: 768px) {
          .entry-page {
            padding: 2rem 1rem;
          }
          .entry-header {
            margin-bottom: 2rem;
          }
          .role-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .role-card {
            padding: 2rem;
            min-height: auto;
          }
          .blob {
            width: 400px;
            height: 400px;
          }
        }

        @media (max-width: 480px) {
          .role-card {
            padding: 1.5rem;
          }
          .role-icon {
            width: 60px;
            height: 60px;
            margin-bottom: 1.5rem;
          }
        }
      `}</style>
    </main>
  );
}
