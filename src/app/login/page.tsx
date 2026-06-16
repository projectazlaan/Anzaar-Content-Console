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
        
        // Fetch user metadata via server action
        const result = await getUserData(userCredential.user.uid);
        console.log('User data result', result);
        
        if (result.success) {
          console.log('Redirecting to home');
          // Use window.location for more reliable redirect
          window.location.href = "/";
        } else if (result.error === "User data not found") {
          // Auto-bootstrap if account exists in Auth but missing in Firestore
          console.log('Initializing user account...');
          await initializeUserAccount(userCredential.user.uid, formData.email);
          window.location.href = "/";
        } else {
          setError(result.error || "Account not fully set up. Please contact admin.");
        }
      } else {
        console.log('Creating new account...');
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        console.log('Account created', userCredential.user.uid);
        
        // Initialize user account via server action
        const result = await initializeUserAccount(userCredential.user.uid, formData.email);
        console.log('Initialization result', result);
        
        if (result.success) {
          console.log('Is first user?', result.isFirstUser);
          if (result.isFirstUser) {
            alert("🎉 SUCCESS! You are the first user and have been granted Super Admin status!\n\nYou can now access all features and manage users.");
            window.location.href = "/";
          } else {
            alert("⏳ Account created successfully!\n\nYour account is pending admin approval. Please contact the administrator to activate your account.\n\nNote: If you are the first user and seeing this, please delete existing users from Firebase Console and try again.");
            setIsLogin(true);
          }
        } else {
          setError(result.error || "Failed to initialize account. Please try again.");
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
    <main className="login-container-v2">
      {/* Animated Background */}
      <div className="login-bg-v2">
        <div className="bg-grid"></div>
        <div className="bg-gradient-orb orb-1"></div>
        <div className="bg-gradient-orb orb-2"></div>
        <div className="bg-gradient-orb orb-3"></div>
        <div className="floating-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }} />
          ))}
        </div>
      </div>
      
      <div className="login-wrapper-v2">
        {/* Left Side - Branding */}
        <div className="login-branding-v2">
          <div className="brand-content">
            <div className="brand-logo">
              <div className="logo-icon-wrapper">
                <ShieldCheck size={48} />
              </div>
              <Sparkles size={24} className="sparkle-icon" />
            </div>
            
            <h1 className="brand-title">
              ANZAAR
              <span className="title-accent">CONTENT CONSOL</span>
            </h1>
            
            <p className="brand-description">
              Enterprise-grade content production pipeline management system
            </p>

            <div className="brand-features">
              <div className="feature-item">
                <Zap size={20} />
                <span>Lightning Fast Workflow</span>
              </div>
              <div className="feature-item">
                <Globe size={20} />
                <span>Cloud-Powered Infrastructure</span>
              </div>
              <div className="feature-item">
                <ShieldCheck size={20} />
                <span>Enterprise Security</span>
              </div>
            </div>

            <div className="brand-stats">
              <div className="stat-item">
                <div className="stat-number">6+</div>
                <div className="stat-label">Production Roles</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-number">100%</div>
                <div className="stat-label">Cloud Based</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Real-time Sync</div>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <p>© 2026 Anzaar Content Consol. All rights reserved.</p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section-v2">
          <div className="form-card-v2 glass-strong">
            <div className="form-header-v2">
              <div className="header-badge">
                {isLogin ? <ArrowRight size={16} /> : <Sparkles size={16} />}
                <span>{isLogin ? "Welcome Back" : "Get Started"}</span>
              </div>
              <h2>{isLogin ? "Sign in to your account" : "Create your account"}</h2>
              <p>{isLogin ? "Enter your credentials to access the production console" : "Register to join the production pipeline"}</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form-v2">
              <div className="input-group-v2">
                <label className="input-label-v2">
                  <Mail size={16} />
                  <span>Email Address</span>
                </label>
                <div className="input-wrapper-v2">
                  <input 
                    type="email" 
                    placeholder="name@anzaar.com" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="input-field-v2"
                  />
                </div>
              </div>

              <div className="input-group-v2">
                <div className="label-row-v2">
                  <label className="input-label-v2">
                    <Lock size={16} />
                    <span>Password</span>
                  </label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={handleForgotPassword} 
                      className="forgot-link-v2"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="input-wrapper-v2">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter your password" 
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="input-field-v2"
                  />
                  <button 
                    type="button" 
                    className="password-toggle-v2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-alert-v2">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {resetSent && (
                <div className="success-alert-v2">
                  <Sparkles size={18} />
                  <span>Reset link sent to your email. Check your inbox!</span>
                </div>
              )}

              <button 
                type="submit" 
                className="submit-btn-v2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="spinner" size={20} />
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

            <div className="form-footer-v2">
              <div className="divider-v2">
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

            {/* Debug Info Panel */}
            {showDebug && (
              <div className="debug-panel">
                <div className="debug-header">
                  <Info size={16} />
                  <span>Debug Info</span>
                </div>
                <div className="debug-content">
                  <p><strong>First User = Super Admin</strong></p>
                  <p>If you're seeing "Pending Approval" on signup, it means there are already users in the database.</p>
                  <p className="debug-step">✅ To become Super Admin:</p>
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
        .login-container-v2 {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: var(--bg-deep);
        }

        /* Animated Background */
        .login-bg-v2 {
          position: fixed;
          inset: 0;
          z-index: 0;
        }

        .bg-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }

        .bg-gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.4;
          animation: orbFloat 15s ease-in-out infinite;
        }

        .orb-1 {
          width: 600px;
          height: 600px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          top: -200px;
          right: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, var(--secondary), var(--accent));
          bottom: -150px;
          left: -100px;
          animation-delay: 5s;
        }

        .orb-3 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, var(--primary), var(--info));
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 10s;
          opacity: 0.2;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        .floating-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          bottom: -10px;
          width: 4px;
          height: 4px;
          background: var(--primary);
          border-radius: 50%;
          opacity: 0;
          animation: particleRise 10s ease-in infinite;
          box-shadow: 0 0 10px var(--primary-glow);
        }

        @keyframes particleRise {
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

        /* Main Layout */
        .login-wrapper-v2 {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
        }

        /* Left Side - Branding */
        .login-branding-v2 {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 4rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05));
          border-right: 1px solid var(--border);
          animation: fadeInLeft 0.8s ease-out;
        }

        .brand-content {
          max-width: 600px;
        }

        .brand-logo {
          position: relative;
          display: inline-flex;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .logo-icon-wrapper {
          width: 90px;
          height: 90px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 20px 60px var(--primary-glow);
          animation: logoGlow 3s ease-in-out infinite;
        }

        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 20px 60px var(--primary-glow); }
          50% { box-shadow: 0 20px 80px var(--primary-glow), 0 0 100px var(--secondary-glow); }
        }

        .sparkle-icon {
          position: absolute;
          top: -10px;
          right: -10px;
          color: var(--warning);
          animation: sparkle 2s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
        }

        .brand-title {
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, var(--text-main), var(--primary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .title-accent {
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

        .brand-description {
          font-size: 1.1rem;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 3rem;
        }

        .brand-features {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          margin-bottom: 3rem;
        }

        .feature-item {
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

        .feature-item:hover {
          background: rgba(99, 102, 241, 0.1);
          border-color: var(--primary);
          transform: translateX(10px);
        }

        .feature-item svg {
          color: var(--primary);
        }

        .brand-stats {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 16px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 900;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.3rem;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-divider {
          width: 1px;
          height: 50px;
          background: var(--border);
        }

        .brand-footer {
          color: var(--text-dim);
          font-size: 0.9rem;
        }

        /* Right Side - Form */
        .login-form-section-v2 {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          animation: fadeInRight 0.8s ease-out;
        }

        .form-card-v2 {
          width: 100%;
          max-width: 480px;
          padding: 3rem;
          animation: fadeInUp 0.6s ease-out 0.2s both;
        }

        .form-header-v2 {
          margin-bottom: 2.5rem;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, var(--primary-glow), var(--secondary-glow));
          border: 1px solid var(--primary);
          border-radius: 100px;
          color: var(--primary);
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }

        .form-header-v2 h2 {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          color: var(--text-main);
        }

        .form-header-v2 p {
          color: var(--text-muted);
          font-size: 1rem;
        }

        .login-form-v2 {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .input-group-v2 {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .input-label-v2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .input-label-v2 svg {
          color: var(--primary);
        }

        .label-row-v2 {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .forgot-link-v2 {
          font-size: 0.85rem;
          color: var(--primary);
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .forgot-link-v2:hover {
          color: var(--secondary);
          text-decoration: underline;
        }

        .input-wrapper-v2 {
          position: relative;
        }

        .input-field-v2 {
          width: 100%;
          padding: 1rem 1.2rem;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: white;
          font-size: 1rem;
          transition: all var(--transition-base);
        }

        .input-field-v2:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 4px var(--primary-glow);
          transform: translateY(-2px);
        }

        .input-field-v2::placeholder {
          color: var(--text-dim);
        }

        .password-toggle-v2 {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-dim);
          padding: 0.5rem;
          transition: color var(--transition-fast);
        }

        .password-toggle-v2:hover {
          color: var(--primary);
        }

        .error-alert-v2 {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-md);
          color: #f87171;
          font-size: 0.9rem;
          animation: fadeInDown 0.4s ease-out;
        }

        .success-alert-v2 {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 1rem;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: var(--radius-md);
          color: #34d399;
          font-size: 0.9rem;
          animation: fadeInDown 0.4s ease-out;
        }

        .submit-btn-v2 {
          margin-top: 0.5rem;
          padding: 1.2rem;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          box-shadow: 0 10px 30px var(--primary-glow);
          transition: all var(--transition-base);
          position: relative;
          overflow: hidden;
        }

        .submit-btn-v2::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
          opacity: 0;
          transition: opacity var(--transition-base);
        }

        .submit-btn-v2:hover::before {
          opacity: 1;
        }

        .submit-btn-v2:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px var(--primary-glow);
        }

        .submit-btn-v2:active {
          transform: translateY(-1px);
        }

        .submit-btn-v2:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .form-footer-v2 {
          margin-top: 2rem;
        }

        .divider-v2 {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .divider-v2::before,
        .divider-v2::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .divider-v2 span {
          color: var(--text-dim);
          font-size: 0.9rem;
        }

        .form-footer-v2 p {
          text-align: center;
          color: var(--text-dim);
          font-size: 0.95rem;
        }

        .form-footer-v2 button {
          color: var(--primary);
          font-weight: 700;
          margin-left: 0.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          transition: all var(--transition-fast);
        }

        .form-footer-v2 button:hover {
          color: var(--secondary);
          text-decoration: underline;
        }

        .spinner { 
          animation: spin 1s linear infinite; 
        }
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }

        /* Debug Panel */
        .debug-panel {
          margin-top: 2rem;
          padding: 1.5rem;
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: var(--radius-lg);
        }

        .debug-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: var(--warning);
          margin-bottom: 1rem;
        }

        .debug-content {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .debug-content p {
          margin-bottom: 0.8rem;
        }

        .debug-content strong {
          color: var(--text-main);
        }

        .debug-step {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(245, 158, 11, 0.2);
          font-weight: 600;
          color: var(--accent) !important;
        }

        .debug-content ol {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
        }

        .debug-content li {
          margin-bottom: 0.5rem;
        }

        .debug-content a {
          color: var(--primary);
          text-decoration: underline;
        }

        .debug-content a:hover {
          color: var(--secondary);
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .login-branding-v2 {
            padding: 3rem;
          }
          .brand-title {
            font-size: 2.5rem;
          }
        }

        @media (max-width: 768px) {
          .login-wrapper-v2 {
            grid-template-columns: 1fr;
          }
          .login-branding-v2 {
            display: none;
          }
          .login-form-section-v2 {
            padding: 2rem 1.5rem;
          }
          .form-card-v2 {
            padding: 2rem 1.5rem;
          }
          .form-header-v2 h2 {
            font-size: 1.8rem;
          }
        }

        @media (max-width: 480px) {
          .login-form-section-v2 {
            padding: 1.5rem 1rem;
          }
          .form-card-v2 {
            padding: 1.5rem 1rem;
          }
          .form-header-v2 h2 {
            font-size: 1.5rem;
          }
          .submit-btn-v2 {
            padding: 1rem;
          }
        }
      `}</style>
    </main>
  );
}
