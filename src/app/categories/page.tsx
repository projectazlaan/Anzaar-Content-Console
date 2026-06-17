"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { getCategories, addCategory, removeCategory } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";
import {
  Plus, 
  Trash2, 
  Loader2, 
  Layers, 
  Tag,
  Zap
} from "lucide-react";

export default function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    const data = await getCategories();
    setCategories(data);
    setIsLoading(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setIsSubmitting(true);
    const result = await addCategory(newCategory.trim());
    setIsSubmitting(false);

    if (result.success) {
      setNewCategory("");
      showToast({ type: "success", title: "Success!", description: "Category added successfully." });
      loadCategories();
    } else {
      showToast({ type: "error", title: "Error", description: result.error || "Failed to add category" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    
    const result = await removeCategory(id);
    if (result.success) {
      loadCategories();
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="ca-root">
          {/* Ambient Background */}
          <div className="ca-ambient" aria-hidden="true">
            <div className="amb-orb amb-orb-1" />
            <div className="amb-orb amb-orb-2" />
            <div className="amb-orb amb-orb-3" />
            <div className="ca-grid-lines" />
          </div>

          <header className="ca-header">
            <div>
              <div className="ca-badge">
                <Zap size={11} />
                <span>Organization</span>
              </div>
              <h1 className="ca-title">
                <span className="ca-title-accent">Category</span> Management
              </h1>
              <p className="ca-subtitle">Manage the product categories available in the Designer Portal.</p>
            </div>
          </header>

          <div className="ca-body">
            <div className="ca-card">
              <div className="ca-card-head">
                <Plus size={18} />
                <h2>Add New Category</h2>
              </div>
              <form onSubmit={handleAddCategory} className="ca-form">
                <div className="ca-input-row">
                  <input 
                    type="text" 
                    placeholder="Enter category name (e.g. Sarees)" 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    required
                    className="ca-input"
                  />
                  <button type="submit" disabled={isSubmitting || !newCategory.trim()} className="ca-btn ca-btn-primary">
                    {isSubmitting ? <Loader2 className="ca-spin" size={18} /> : <Plus size={18} />}
                    <span>{isSubmitting ? "Adding..." : "Add Category"}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="ca-card">
              <div className="ca-card-head">
                <Layers size={18} />
                <h2>Active Categories ({categories.length})</h2>
              </div>
              
              {isLoading ? (
                <div className="ca-empty">
                  <div className="ca-empty-icon"><Loader2 className="ca-spin" size={36} /></div>
                  <p>Loading categories...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="ca-empty">
                  <div className="ca-empty-icon"><Tag size={36} /></div>
                  <p>No categories found. Add one above.</p>
                </div>
              ) : (
                <div className="ca-list">
                  {categories.map((cat) => (
                    <div key={cat.id} className="ca-item">
                      <div className="ca-item-left">
                        <div className="ca-bullet" />
                        <span className="ca-item-name">{cat.name}</span>
                      </div>
                      <button className="ca-delete-btn" onClick={() => handleDelete(cat.id)} title="Delete category">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .ca-root {
            padding: 2rem 2rem 3rem;
            max-width: 1200px;
            margin: 0 auto;
            position: relative;
            min-height: 100vh;
            font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
            color: var(--text-main);
          }

          .ca-ambient {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
          }
          .amb-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(120px);
            animation: amb-drift 20s ease-in-out infinite alternate;
          }
          .amb-orb-1 {
            width: 700px; height: 700px;
            background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
            top: -200px; left: -100px;
            animation-duration: 18s;
            opacity: 0.2;
          }
          .amb-orb-2 {
            width: 500px; height: 500px;
            background: radial-gradient(circle, var(--secondary-glow) 0%, transparent 70%);
            top: 30%; right: 5%;
            animation-duration: 24s;
            animation-delay: -8s;
            opacity: 0.18;
          }
          .amb-orb-3 {
            width: 400px; height: 400px;
            background: radial-gradient(circle, var(--info-glow) 0%, transparent 70%);
            bottom: 5%; left: 35%;
            animation-duration: 30s;
            animation-delay: -15s;
            opacity: 0.15;
          }
          @keyframes amb-drift {
            0%   { transform: translate(0, 0) scale(1); opacity: 0.7; }
            50%  { transform: translate(40px, 30px) scale(1.08); opacity: 1; }
            100% { transform: translate(-20px, 15px) scale(0.93); opacity: 0.6; }
          }
          .ca-grid-lines {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(99,102,241,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.02) 1px, transparent 1px);
            background-size: 48px 48px;
          }

          .ca-header {
            margin-bottom: 2.5rem;
            position: relative;
            z-index: 2;
          }
          .ca-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            padding: 0.35rem 0.8rem;
            background: var(--bg-hover);
            border: 1px solid var(--border);
            border-radius: 100px;
            color: var(--primary);
            font-size: 0.65rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 0.6rem;
            box-shadow: var(--shadow-sm);
          }
          .ca-badge svg { animation: pulse-dot 2s ease-in-out infinite; }
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          .ca-title {
            font-size: clamp(1.8rem, 3vw, 2.5rem);
            font-weight: 900;
            letter-spacing: -0.04em;
            line-height: 1.1;
            margin: 0 0 0.4rem 0;
            color: var(--text-main);
          }
          .ca-title-accent {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .ca-subtitle {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin: 0;
            font-weight: 400;
            letter-spacing: 0.01em;
          }

          .ca-body {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            position: relative;
            z-index: 2;
          }

          .ca-card {
            border-radius: var(--radius-xl);
            background: var(--bg-card);
            border: 1px solid var(--border);
            backdrop-filter: var(--glass);
            box-shadow: var(--shadow-xl);
            padding: 2rem;
          }
          .ca-card-head {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            margin-bottom: 1.75rem;
            padding-bottom: 0.85rem;
            border-bottom: 1px solid var(--border);
            color: var(--primary);
          }
          .ca-card-head h2 {
            font-size: 1.1rem;
            font-weight: 800;
            color: var(--text-main);
            margin: 0;
          }

          .ca-form {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }
          .ca-input-row {
            display: flex;
            gap: 0.85rem;
          }
          .ca-input {
            flex: 1;
            padding: 1rem 1.4rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            color: var(--text-main);
            font-size: 0.95rem;
            transition: all var(--transition-base);
            font-family: inherit;
          }
          .ca-input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-glow);
            outline: none;
            background: var(--bg-hover);
          }
          .ca-input::placeholder { color: var(--text-dim); }

          .ca-btn {
            display: flex;
            align-items: center;
            gap: 0.55rem;
            padding: 1rem 1.6rem;
            border: none;
            border-radius: var(--radius-md);
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all var(--transition-base);
            font-family: inherit;
            white-space: nowrap;
          }
          .ca-btn-primary {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: #fff !important;
            box-shadow: 0 4px 14px var(--primary-glow);
          }
          .ca-btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px var(--primary-glow);
          }
          .ca-btn-primary:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .ca-message {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            padding: 0.85rem 1.1rem;
            border-radius: var(--radius-md);
            font-size: 0.85rem;
            font-weight: 600;
            animation: success-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .ca-message-success {
            background: rgba(16, 185, 129, 0.05);
            border: 1px solid var(--accent);
            color: var(--accent);
          }
          .ca-message-error {
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid var(--danger);
            color: var(--danger);
          }
          @keyframes success-pop {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }

          .ca-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 0.8rem;
          }
          .ca-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.2rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            transition: all var(--transition-base);
          }
          .ca-item:hover {
            background: var(--bg-hover);
            border-color: var(--primary-glow);
            transform: translateX(5px);
            box-shadow: var(--shadow-md);
          }
          .ca-item-left {
            display: flex;
            align-items: center;
            gap: 0.85rem;
          }
          .ca-bullet {
            width: 8px; height: 8px;
            background: var(--primary);
            border-radius: 50%;
            box-shadow: 0 0 10px var(--primary-glow);
            flex-shrink: 0;
          }
          .ca-item-name {
            font-weight: 700;
            color: var(--text-main);
            font-size: 0.92rem;
          }
          .ca-delete-btn {
            width: 34px; height: 34px;
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-dim);
            background: transparent;
            border: 1px solid transparent;
            cursor: pointer;
            transition: all var(--transition-fast);
            flex-shrink: 0;
          }
          .ca-delete-btn:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.2);
            color: var(--danger);
            transform: translateY(-1px);
          }

          .ca-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 4rem 2rem;
            color: var(--text-muted);
            text-align: center;
          }
          .ca-empty-icon {
            width: 72px; height: 72px;
            border-radius: var(--radius-lg);
            background: var(--bg-hover);
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-dim);
          }
          .ca-empty p {
            font-size: 0.9rem;
            font-weight: 600;
            margin: 0;
          }

          .ca-spin { animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }

          @media (max-width: 768px) {
            .ca-root { padding: 1rem; padding-top: 90px; }
            .ca-header { flex-direction: column; gap: 1rem; }
            .ca-title { font-size: 1.3rem; }
            .ca-card { padding: 1rem; }
            .ca-form { flex-direction: column; }
            .ca-input { width: 100%; }
            .ca-btn { width: 100%; }
            .ca-input-row { flex-direction: column; }
            .ca-list { grid-template-columns: 1fr; }
          }
          @media (max-width: 480px) {
            .ca-root { padding: 0.7rem; padding-top: 85px; }
            .ca-card { padding: 0.7rem; }
          }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}
