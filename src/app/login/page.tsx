"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        // Fetch user role
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDoc.exists()) {
          router.push("/");
        } else {
          setError("Account not fully set up. Please contact admin.");
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        // Initialize user with pending status
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: formData.email,
          role: "pending",
          permissions: { view: true, edit: false, delete: false },
          createdAt: new Date().toISOString()
        });
        alert("Account created. Please wait for Admin approval.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Please enter your email first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, formData.email);
      setResetSent(true);
      setError("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="login-container">
      <div className="login-bg shadow-bloom"></div>
      
      <div className="login-card glass animate-fade">
        <div className="card-header">
          <div className="logo-box bg-gradient">
            <ShieldCheck size={32} />
          </div>
          <h1>{isLogin ? "Welcome Back" : "Join the Pipeline"}</h1>
          <p>{isLogin ? "Enter your credentials to access the console" : "Register your production account"}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-field">
            <label>Email Address</label>
            <div className="login-input-box">
              <Mail size={18} className="login-field-icon" />
              <input 
                type="email" 
                placeholder="name@anzaar.com" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="input-field">
            <div className="label-row">
              <label>Password</label>
              {isLogin && <button type="button" onClick={handleForgotPassword} className="forgot-link">Forgot?</button>}
            </div>
            <div className="login-input-box">
              <Lock size={18} className="login-field-icon" />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button 
                type="button" 
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-error animate-fade">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {resetSent && (
            <div className="auth-success animate-fade">
              <span>Reset link sent to your email.</span>
            </div>
          )}

          <button type="submit" className="login-btn bg-gradient" disabled={isLoading}>
            {isLoading ? <Loader2 className="spinner" size={20} /> : (
              <>
                <span>{isLogin ? "Access Console" : "Create Account"}</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="card-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Sign up now" : "Go to Login"}
            </button>
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          background: #020617;
          overflow: hidden;
        }

        .login-bg {
          position: absolute;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
          filter: blur(80px);
          opacity: 0.4;
          z-index: 1;
        }

        .login-card {
          width: 520px;
          padding: 4rem;
          z-index: 10;
          position: relative;
        }

        .card-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .logo-box {
          width: 70px;
          height: 70px;
          margin: 0 auto 1.5rem;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }

        .card-header h1 {
          font-size: 2.2rem;
          margin-bottom: 0.5rem;
          font-weight: 800;
        }

        .card-header p {
          color: var(--text-dim);
          font-size: 1rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .input-field {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .forgot-link {
          font-size: 0.85rem;
          color: var(--primary);
          font-weight: 600;
        }

        .input-field label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .login-input-box {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 14px;
          height: 60px;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .login-input-box:focus-within {
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .login-field-icon {
          position: absolute;
          left: 1.5rem;
          color: var(--text-dim);
          pointer-events: none;
          z-index: 5;
        }

        .login-input-box input {
          width: 100%;
          height: 100%;
          background: transparent !important;
          border: none !important;
          padding: 0 1.5rem 0 3.8rem !important; /* Force text to stay 3.8rem away from the left edge */
          color: white !important;
          font-size: 1.05rem;
          outline: none !important;
        }

        .toggle-password {
          position: absolute;
          right: 1.2rem;
          color: var(--text-dim);
          padding: 0.5rem;
        }

        .login-btn {
          margin-top: 1rem;
          padding: 1.1rem;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          box-shadow: 0 10px 20px var(--primary-glow);
          transition: transform 0.2s ease;
        }

        .login-btn:hover {
          transform: translateY(-2px);
        }

        .auth-error {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          color: #f87171;
          font-size: 0.9rem;
        }

        .auth-success {
          padding: 1rem;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 10px;
          color: #34d399;
          font-size: 0.9rem;
          text-align: center;
        }

        .card-footer {
          margin-top: 2rem;
          text-align: center;
        }

        .card-footer p {
          color: var(--text-dim);
          font-size: 0.95rem;
        }

        .card-footer button {
          color: var(--primary);
          font-weight: 700;
          margin-left: 0.5rem;
        }

        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
