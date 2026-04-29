"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { getCategories, addCategory, removeCategory } from "@/lib/actions";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Layers, 
  AlertCircle, 
  CheckCircle2,
  Tag
} from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

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
      setMessage({ text: "Category added successfully!", type: "success" });
      loadCategories();
    } else {
      setMessage({ text: result.error || "Failed to add category", type: "error" });
    }
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
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
        <div className="categories-page animate-fade">
          <header className="page-header">
            <div className="header-content">
              <h1>Category Management</h1>
              <p>Manage the product categories available in the Designer Portal.</p>
            </div>
          </header>

          <div className="content-grid">
            <div className="form-card glass">
              <div className="card-header">
                <Plus size={20} className="text-primary" />
                <h2>Add New Category</h2>
              </div>
              <form onSubmit={handleAddCategory} className="add-form">
                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder="Enter category name (e.g. Sarees)" 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    required
                  />
                  <button type="submit" disabled={isSubmitting || !newCategory.trim()}>
                    {isSubmitting ? <Loader2 className="spinner" size={20} /> : <Plus size={20} />}
                    <span>Add Category</span>
                  </button>
                </div>
                {message.text && (
                  <div className={`message-alert animate-shake ${message.type}`}>
                    {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{message.text}</span>
                  </div>
                )}
              </form>
            </div>

            <div className="list-card glass">
              <div className="card-header">
                <Layers size={20} className="text-primary" />
                <h2>Active Categories ({categories.length})</h2>
              </div>
              
              {isLoading ? (
                <div className="loading-state">
                  <Loader2 className="spinner" size={40} />
                  <p>Loading categories...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="empty-state">
                  <Tag size={40} />
                  <p>No categories found. Add one above.</p>
                </div>
              ) : (
                <div className="categories-list">
                  {categories.map((cat) => (
                    <div key={cat.id} className="category-item glass-hover animate-scale">
                      <div className="cat-info">
                        <div className="cat-bullet"></div>
                        <span className="cat-name">{cat.name}</span>
                      </div>
                      <button className="delete-btn" onClick={() => handleDelete(cat.id)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .categories-page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
          .page-header { margin-bottom: 3rem; }
          .page-header h1 { font-size: 2.2rem; margin-bottom: 0.5rem; }
          .page-header p { color: var(--text-dim); }

          .content-grid { display: grid; grid-template-columns: 1fr; gap: 2.5rem; }

          .card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
          .card-header h2 { font-size: 1.2rem; font-weight: 700; color: var(--text-main); }

          .form-card, .list-card { padding: 2rem; border-radius: 24px; }

          .add-form { display: flex; flex-direction: column; gap: 1.5rem; }
          .input-group { display: flex; gap: 1rem; }
          .input-group input { flex: 1; padding: 1.1rem 1.5rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 16px; color: var(--text-main); font-size: 1rem; transition: 0.3s; }
          .input-group input:focus { border-color: var(--primary); outline: none; background: rgba(255, 255, 255, 0.05); }
          .input-group button { padding: 0 1.5rem; background: var(--primary); color: white; border-radius: 16px; font-weight: 700; display: flex; align-items: center; gap: 0.8rem; transition: 0.3s; }
          .input-group button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px var(--primary-glow); }
          .input-group button:disabled { opacity: 0.5; cursor: not-allowed; }

          .message-alert { display: flex; align-items: center; gap: 0.8rem; padding: 1rem; border-radius: 12px; font-size: 0.9rem; }
          .message-alert.success { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
          .message-alert.error { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

          .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 0; gap: 1.5rem; color: var(--text-dim); }

          .categories-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
          .category-item { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 18px; transition: 0.3s; }
          .category-item:hover { background: rgba(255, 255, 255, 0.04); transform: translateX(5px); }

          .cat-info { display: flex; align-items: center; gap: 1rem; }
          .cat-bullet { width: 8px; height: 8px; background: var(--primary); border-radius: 50%; box-shadow: 0 0 10px var(--primary-glow); }
          .cat-name { font-weight: 600; color: var(--text-main); font-size: 1rem; }

          .delete-btn { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--text-dim); transition: 0.3s; }
          .delete-btn:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

          .spinner { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

          @media (max-width: 768px) {
            .categories-page { padding: 1rem; }
            .input-group { flex-direction: column; }
            .input-group button { height: 55px; }
            .categories-list { grid-template-columns: 1fr; }
          }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}
