"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
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
      <div className="forbidden-page flex-center" style={{ height: '80vh', flexDirection: 'column', gap: '2rem' }}>
        <ShieldAlert size={64} className="text-danger" />
        <h1 style={{ fontSize: '3rem' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}>
          Your account role ({user.role}) does not have permission to access this portal.
        </p>
        <button 
          className="btn-primary" 
          onClick={() => router.push("/")}
          style={{ padding: '0.8rem 2rem', borderRadius: '10px' }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
