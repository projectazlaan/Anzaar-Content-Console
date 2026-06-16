"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function RoleGuard({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: string[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    
    // Show loading only if it takes more than 300ms
    const timer = setTimeout(() => {
      if (loading) {
        setShowLoading(true);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [user, loading, router]);

  if (loading && showLoading) {
    return (
      <div className="flex-center" style={{ height: '80vh' }}>
        <Loader2 className="spinner" size={48} />
      </div>
    );
  }

  if (!user) return null;

  const isAuthorized = allowedRoles.includes(user.role) || user.role === "admin";

  if (!isAuthorized) {
    return (
      <div className="forbidden-page flex-center" style={{ height: '80vh', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
        <ShieldAlert size={64} className="text-danger" />
        <h1 style={{ fontSize: '3rem', textAlign: 'center' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '1.2rem', textAlign: 'center', maxWidth: '600px' }}>
          Your account role is <strong style={{ color: 'var(--warning)' }}>"{user.role}"</strong>. 
          {user.role === 'pending' && (
            <>
              <br /><br />
              Your account is pending admin approval. Please contact an administrator to assign you a role.
            </>
          )}
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            className="btn-primary" 
            onClick={() => router.push("/")}
            style={{ padding: '0.8rem 2rem', borderRadius: '10px' }}
          >
            Go to Home
          </button>
          {user.role === 'pending' && (
            <button 
              className="btn-primary" 
              onClick={async () => {
                try {
                  // Use forceSetAsAdmin for immediate fix
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
                padding: '0.8rem 2rem', 
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--warning), #f97316)'
              }}
            >
              Self-Approve Account (Admin)
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
