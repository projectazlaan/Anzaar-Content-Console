"use client";

import React, { useState, useEffect } from "react";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  Globe,
  ChevronRight,
  Info
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { initializeUserAccount, getUserData } from "@/lib/actions";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Form submitted', { email: formData.email, isLogin });
    
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }
    
    setIsLoading(true);
    setError("");

    try {
      if (isLogin) {
        console.log('Attempting login...');
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        console.log('Login successful', userCredential.user.uid);
        
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        console.log('User data result', userDoc.exists());
        
        if (userDoc.exists()) {
          console.log('Redirecting to home');
          window.location.href = "/";
        } else {
          console.log('Initializing user account via server action...');
          const initResult = await initializeUserAccount(userCredential.user.uid, formData.email);
          if (initResult.success) {
            window.location.href = "/";
          } else {
            setError(initResult.error || "Failed to initialize user account");
          }
        }
      } else {
        console.log('Creating new account...');
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        console.log('Account created', userCredential.user.uid);
        
        console.log('Initializing user account via server action...');
        const initResult = await initializeUserAccount(userCredential.user.uid, formData.email);
        
        if (initResult.success) {
          if (initResult.isFirstUser) {
            alert("✨ Welcome! You are the first user, so you have been automatically approved as Super Admin. Redirecting to console...");
            window.location.href = "/";
          } else {
            alert("⏳ Account created successfully!\n\nYour account is pending admin approval. Please contact the administrator to activate your account.");
            setIsLogin(true);
            setFormData({ ...formData, password: "" });
          }
        } else {
          setError(initResult.error || "Failed to initialize user account");
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message?.replace("Firebase: ", "") || "An error occurred during login";
      setError(errorMessage);
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
    <main className="lg-root">
      {/* Ambient Background */}
      <div className="lg-bg" aria-hidden="true">
        <div className="lg-grid-bg" />
        <div className="lg-orb lg-orb-1" />
        <div className="lg-orb lg-orb-2" />
        <div className="lg-orb lg-orb-3" />
        <div className="lg-particles">
          {isMounted && [...Array(20)].map((_, i) => (
            <div key={i} className="lg-particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }} />
          ))}
        </div>
      </div>
      
      <div className="lg-wrapper">
        {/* Left Side - Branding */}
        <div className="lg-brand">
          <div className="lg-brand-content">
            <div className="lg-logo">
              <div className="lg-logo-icon">
                <ShieldCheck size={48} />
              </div>
              <Sparkles size={24} className="lg-logo-sparkle" />
            </div>
            
            <h1 className="lg-brand-title">
              ANZAAR
              <span className="lg-brand-accent">CONTENT CONSOL</span>
            </h1>
            
            <p className="lg-brand-desc">
              Enterprise-grade content production pipeline management system
            </p>

            <div className="lg-features">
              <div className="lg-feature">
                <Zap size={20} />
                <span>Lightning Fast Workflow</span>
              </div>
              <div className="lg-feature">
                <Globe size={20} />
                <span>Cloud-Powered Infrastructure</span>
              </div>
              <div className="lg-feature">
                <ShieldCheck size={20} />
                <span>Enterprise Security</span>
              </div>
            </div>

            <div className="lg-stats">
              <div className="lg-stat">
                <div className="lg-stat-num">6+</div>
                <div className="lg-stat-label">Production Roles</div>
              </div>
              <div className="lg-stat-divider" />
              <div className="lg-stat">
                <div className="lg-stat-num">100%</div>
                <div className="lg-stat-label">Cloud Based</div>
              </div>
              <div className="lg-stat-divider" />
              <div className="lg-stat">
                <div className="lg-stat-num">24/7</div>
                <div className="lg-stat-label">Real-time Sync</div>
              </div>
            </div>
          </div>

          <div className="lg-brand-footer">
            <p>© 2026 Anzaar Content Consol. All rights reserved.</p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="lg-form-section">
          <div className="lg-form-card">
            <div className="lg-form-header">
              <div className="lg-badge">
                {isLogin ? <ArrowRight size={16} /> : <Sparkles size={16} />}
                <span>{isLogin ? "Welcome Back" : "Get Started"}</span>
              </div>
              <h2 className="lg-form-title">{isLogin ? "Sign in to your account" : "Create your account"}</h2>
              <p className="lg-form-subtitle">{isLogin ? "Enter your credentials to access the production console" : "Register to join the production pipeline"}</p>
            </div>

            <form onSubmit={handleSubmit} className="lg-form">
              <div className="lg-field">
                <label className="lg-label">
                  <Mail size={16} />
                  <span>Email Address</span>
                </label>
                <div className="lg-input-wrap">
                  <input 
                    type="email" 
                    placeholder="name@anzaar.com" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="lg-input"
                  />
                </div>
              </div>

              <div className="lg-field">
                <div className="lg-label-row">
                  <label className="lg-label">
                    <Lock size={16} />
                    <span>Password</span>
                  </label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={handleForgotPassword} 
                      className="lg-forgot"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="lg-input-wrap">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter your password" 
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="lg-input"
                  />
                  <button 
                    type="button" 
                    className="lg-toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="lg-alert lg-alert-error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {resetSent && (
                <div className="lg-alert lg-alert-success">
                  <Sparkles size={18} />
                  <span>Reset link sent to your email. Check your inbox!</span>
                </div>
              )}

              <button 
                type="submit" 
                className="lg-submit"
                disabled={isLoading}
              >
                <div className="lg-submit-bg" />
                {isLoading ? (
                  <>
                    <Loader2 className="lg-spinner" size={20} />
                    <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? "Access Console" : "Create Account"}</span>
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="lg-form-footer">
              <div className="lg-divider">
                <span>or</span>
              </div>
              <p>
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setResetSent(false);
                }}>
                  {isLogin ? "Sign up now" : "Go to Login"}
                  <ArrowRight size={16} />
                </button>
              </p>
            </div>

            {showDebug && (
              <div className="lg-debug">
                <div className="lg-debug-head">
                  <Info size={16} />
                  <span>Debug Info</span>
                </div>
                <div className="lg-debug-body">
                  <p><strong>First User = Super Admin</strong></p>
                  <p>If you're seeing "Pending Approval" on signup, it means there are already users in the database.</p>
                  <p className="lg-debug-step">✅ To become Super Admin:</p>
                  <ol>
                    <li>Go to <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a></li>
                    <li>Open Firestore Database</li>
                    <li>Delete the "users" collection</li>
                    <li>Go to Authentication → Users → Delete all users</li>
                    <li>Sign up again - you'll be Super Admin!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .lg-root {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: var(--bg-deep);
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          color: var(--text-main);
        }

        /* ── Animated Background ── */
        .lg-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
        }

        .lg-grid-bg {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: lg-grid-move 20s linear infinite;
        }

        @keyframes lg-grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }

        .lg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.4;
          animation: lg-orb-float 15s ease-in-out infinite;
        }

        .lg-orb-1 {
          width: 600px;
          height: 600px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          top: -200px;
          right: -100px;
          animation-delay: 0s;
        }

        .lg-orb-2 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, var(--secondary), var(--accent));
          bottom: -150px;
          left: -100px;
          animation-delay: 5s;
        }

        .lg-orb-3 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, var(--primary), var(--info));
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 10s;
          opacity: 0.2;
        }

        @keyframes lg-orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        .lg-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .lg-particle {
          position: absolute;
          bottom: -10px;
          width: 4px;
          height: 4px;
          background: var(--primary);
          border-radius: 50%;
          opacity: 0;
          animation: lg-particle-rise 10s ease-in infinite;
          box-shadow: 0 0 10px var(--primary-glow);
        }

        @keyframes lg-particle-rise {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0);
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-100vh) scale(1);
          }
        }

        /* ── Main Layout ── */
        .lg-wrapper {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
        }

        /* ── Left Side - Branding ── */
        .lg-brand {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 4rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05));
          border-right: 1px solid var(--border);
          animation: lg-fade-left 0.8s ease-out;
        }

        .lg-brand-content {
          max-width: 600px;
        }

        .lg-logo {
          position: relative;
          display: inline-flex;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .lg-logo-icon {
          width: 90px;
          height: 90px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 20px 60px var(--primary-glow);
          animation: lg-logo-glow 3s ease-in-out infinite;
        }

        @keyframes lg-logo-glow {
          0%, 100% { box-shadow: 0 20px 60px var(--primary-glow); }
          50% { box-shadow: 0 20px 80px var(--primary-glow), 0 0 100px var(--secondary-glow); }
        }

        .lg-logo-sparkle {
          position: absolute;
          top: -10px;
          right: -10px;
          color: var(--warning);
          animation: lg-sparkle 2s ease-in-out infinite;
        }

        @keyframes lg-sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
        }

        .lg-brand-title {
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, var(--text-main), var(--primary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lg-brand-accent {
          display: block;
          font-size: 1.2rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          margin-top: 0.5rem;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lg-brand-desc {
          font-size: 1.1rem;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 3rem;
        }

        .lg-features {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          margin-bottom: 3rem;
        }

        .lg-feature {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-main);
          font-weight: 500;
          transition: all var(--transition-base);
        }

        .lg-feature:hover {
          background: rgba(99, 102, 241, 0.1);
          border-color: var(--primary);
          transform: translateX(10px);
        }

        .lg-feature svg {
          color: var(--primary);
        }

        .lg-stats {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 16px;
        }

        .lg-stat {
          text-align: center;
        }

        .lg-stat-num {
          font-size: 2rem;
          font-weight: 900;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.3rem;
        }

        .lg-stat-label {
          font-size: 0.85rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .lg-stat-divider {
          width: 1px;
          height: 50px;
          background: var(--border);
        }

        .lg-brand-footer {
          color: var(--text-dim);
          font-size: 0.9rem;
        }

        /* ── Right Side - Form ── */
        .lg-form-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          animation: lg-fade-right 0.8s ease-out;
        }

        .lg-form-card {
          width: 100%;
          max-width: 480px;
          padding: 3rem;
          border-radius: var(--radius-xl);
          background: var(--bg-card);
          border: 1px solid var(--border);
          backdrop-filter: var(--glass);
          box-shadow: var(--shadow-xl);
          animation: lg-fade-up 0.6s ease-out 0.2s both;
        }

        .lg-form-header {
          margin-bottom: 2.5rem;
        }

        .lg-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--primary-glow);
          border: 1px solid var(--primary);
          border-radius: 100px;
          color: var(--primary);
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }

        .lg-form-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          color: var(--text-main);
        }

        .lg-form-subtitle {
          color: var(--text-muted);
          font-size: 1rem;
        }

        .lg-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .lg-field {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .lg-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .lg-label svg {
          color: var(--primary);
        }

        .lg-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .lg-forgot {
          font-size: 0.85rem;
          color: var(--primary);
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .lg-forgot:hover {
          color: var(--secondary);
          text-decoration: underline;
        }

        .lg-input-wrap {
          position: relative;
        }

        .lg-input {
          width: 100%;
          padding: 1rem 1.2rem;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: white;
          font-size: 1rem;
          transition: all var(--transition-base);
        }

        .lg-input:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 4px var(--primary-glow);
          transform: translateY(-2px);
        }

        .lg-input::placeholder {
          color: var(--text-dim);
        }

        .lg-toggle-pw {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-dim);
          padding: 0.5rem;
          transition: color var(--transition-fast);
        }

        .lg-toggle-pw:hover {
          color: var(--primary);
        }

        .lg-alert {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          animation: lg-fade-down 0.4s ease-out;
        }

        .lg-alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .lg-alert-success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .lg-submit {
          margin-top: 0.5rem;
          padding: 1.2rem;
          border-radius: var(--radius-md);
          background: transparent;
          border: none;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all var(--transition-base);
        }

        .lg-submit-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: var(--radius-md);
          transition: all var(--transition-base);
        }

        .lg-submit::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.15) 50%, transparent 70%);
          background-size: 200% 200%;
          animation: lg-shimmer 4s ease-in-out infinite;
          border-radius: var(--radius-md);
          z-index: 1;
        }

        @keyframes lg-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .lg-submit > * { position: relative; z-index: 2; }

        .lg-submit:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px var(--primary-glow);
        }

        .lg-submit:hover:not(:disabled) .lg-submit-bg {
          filter: brightness(1.15);
        }

        .lg-submit:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .lg-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .lg-form-footer {
          margin-top: 2rem;
        }

        .lg-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .lg-divider::before,
        .lg-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .lg-divider span {
          color: var(--text-dim);
          font-size: 0.9rem;
        }

        .lg-form-footer p {
          text-align: center;
          color: var(--text-dim);
          font-size: 0.95rem;
        }

        .lg-form-footer button {
          color: var(--primary);
          font-weight: 700;
          margin-left: 0.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          transition: all var(--transition-fast);
        }

        .lg-form-footer button:hover {
          color: var(--secondary);
          text-decoration: underline;
        }

        .lg-spinner { 
          animation: lg-spin 1s linear infinite; 
        }
        @keyframes lg-spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }

        /* ── Debug Panel ── */
        .lg-debug {
          margin-top: 2rem;
          padding: 1.5rem;
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: var(--radius-lg);
        }

        .lg-debug-head {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: var(--warning);
          margin-bottom: 1rem;
        }

        .lg-debug-body {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .lg-debug-body p {
          margin-bottom: 0.8rem;
        }

        .lg-debug-body strong {
          color: var(--text-main);
        }

        .lg-debug-step {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(245, 158, 11, 0.2);
          font-weight: 600;
          color: var(--accent) !important;
        }

        .lg-debug-body ol {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
        }

        .lg-debug-body li {
          margin-bottom: 0.5rem;
        }

        .lg-debug-body a {
          color: var(--primary);
          text-decoration: underline;
        }

        .lg-debug-body a:hover {
          color: var(--secondary);
        }

        /* ── Animations ── */
        @keyframes lg-fade-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes lg-fade-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes lg-fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes lg-fade-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .lg-brand {
            padding: 3rem;
          }
          .lg-brand-title {
            font-size: 2.5rem;
          }
        }

        @media (max-width: 768px) {
          .lg-wrapper {
            grid-template-columns: 1fr;
          }
          .lg-brand {
            display: none;
          }
          .lg-form-section {
            padding: 2rem 1.5rem;
          }
          .lg-form-card {
            padding: 2rem 1.5rem;
          }
          .lg-form-title {
            font-size: 1.8rem;
          }
        }

        @media (max-width: 480px) {
          .lg-form-section {
            padding: 1.5rem 1rem;
          }
          .lg-form-card {
            padding: 1.5rem 1rem;
          }
          .lg-form-title {
            font-size: 1.5rem;
          }
          .lg-submit {
            padding: 1rem;
          }
        }
      `}</style>
    </main>
  );
}
