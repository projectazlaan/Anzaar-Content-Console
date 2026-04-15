"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { 
  getDocs, 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  submitDirection, 
  getInstructionPresets, 
  addInstructionPreset, 
  removeInstructionPreset 
} from "@/lib/actions";
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Send, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Settings
} from "lucide-react";

export default function DirectorPage() {
  const [activeTab, setActiveTab] = useState("directions");
  const [products, setProducts] = useState<any[]>([]);
  const [presets, setPresets] = useState<{id: string, text: string}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [newPreset, setNewPreset] = useState("");

  const [shootDir, setShootDir] = useState("");
  const [editDir, setEditDir] = useState("");

  // Real-time products listener
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Fetch Presets
  useEffect(() => {
    getInstructionPresets().then(setPresets);
  }, []);

  const handleAddPreset = async () => {
    if (!newPreset) return;
    const result = await addInstructionPreset(newPreset);
    setPresets([...presets, result]);
    setNewPreset("");
  };

  const handleRemovePreset = async (id: string) => {
    await removeInstructionPreset(id);
    setPresets(presets.filter(p => p.id !== id));
  };

  const handleSendDirection = async () => {
    if (!selectedProduct || !shootDir || !editDir) return;
    const result = await submitDirection(selectedProduct.id, shootDir, editDir);
    if (result.success) {
      setSelectedProduct(null);
      setShootDir("");
      setEditDir("");
    }
  };

  const filteredProducts = products.filter(p => {
    if (activeTab === "directions") return p.status === "Pending Direction";
    if (activeTab === "selections") return p.status === "Pending Selection";
    if (activeTab === "reviews") return p.status === "Pending Review";
    return true;
  });

  return (
    <RoleGuard allowedRoles={["director"]}>
      <DashboardLayout>
        <div className="director-page animate-fade">
          <header className="page-header">
            <div>
              <h1>Director Control Center</h1>
              <p>Manage the production flow and provide critical directions.</p>
            </div>

            <div className="header-actions">
              <button className="settings-pill glass" onClick={() => setShowPresetManager(true)}>
                <Settings size={18} />
                <span>Manage Instructions</span>
              </button>
              <div className="tab-switcher glass">
                <button 
                  className={activeTab === "directions" ? "active" : ""} 
                  onClick={() => setActiveTab("directions")}
                >
                  Directions
                </button>
                <button 
                  className={activeTab === "selections" ? "active" : ""} 
                  onClick={() => setActiveTab("selections")}
                >
                  Selections
                </button>
                <button 
                  className={activeTab === "reviews" ? "active" : ""} 
                  onClick={() => setActiveTab("reviews")}
                >
                  Reviews
                </button>
              </div>
            </div>
          </header>

          {showPresetManager && (
            <div className="modal-overlay flex-center">
              <div className="modal-card glass animate-fade">
                <div className="modal-header">
                  <h3>Manage Instruction Presets</h3>
                  <button onClick={() => setShowPresetManager(false)}>×</button>
                </div>
                <div className="preset-input">
                  <input 
                    type="text" 
                    placeholder="Add new instruction template..." 
                    value={newPreset}
                    onChange={(e) => setNewPreset(e.target.value)}
                  />
                  <button onClick={handleAddPreset} className="bg-gradient"><Plus size={18} /></button>
                </div>
                <div className="preset-list">
                  {presets.map(p => (
                    <div key={p.id} className="preset-item">
                      <span>{p.text}</span>
                      <button onClick={() => handleRemovePreset(p.id)}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <section className="stats-row grid-dashboard">
            <div className="stat-card glass border-indigo">
              <Clock size={20} className="stat-icon" />
              <div className="stat-info">
                <span>{products.filter(p => p.status === 'Pending Direction').length}</span>
                <p>Pending Direction</p>
              </div>
            </div>
            <div className="stat-card glass border-yellow">
              <AlertCircle size={20} className="stat-icon" />
              <div className="stat-info">
                <span>{products.filter(p => p.status === 'Pending Selection').length}</span>
                <p>Pending Selection</p>
              </div>
            </div>
            <div className="stat-card glass border-emerald">
              <CheckCircle2 size={20} className="stat-icon" />
              <div className="stat-info">
                <span>{products.filter(p => p.status === 'Done').length}</span>
                <p>Completed (Archive)</p>
              </div>
            </div>
          </section>

          <div className="content-grid">
            <div className="list-container glass">
              <div className="list-header">
                <div className="search-bar">
                  <Search size={18} />
                  <input type="text" placeholder="Search products..." />
                </div>
                <button className="filter-btn">
                  <Filter size={18} />
                  <span>Filter</span>
                </button>
              </div>

              <div className="product-list">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className={`product-item ${selectedProduct?.id === product.id ? 'active' : ''}`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="product-main">
                      <div className="product-thumb">
                        {product.designUrl && <img src={product.designUrl} alt="" />}
                      </div>
                      <div className="product-details">
                        <h4>{product.name}</h4>
                        <span>{product.category} • {product.createdAt?.toDate ? product.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                      </div>
                    </div>
                    <div className="product-actions">
                      <button className="action-btn primary">
                        <span>Select</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && <div className="empty-state-list">No products found in this stage.</div>}
              </div>
            </div>

            <aside className="direction-panel glass">
              {selectedProduct ? (
                <div className="direction-form animate-fade">
                  <div className="form-header">
                    <h2>Production Direction</h2>
                    <p>Product: {selectedProduct.name}</p>
                  </div>

                  <div className="form-group">
                    <label>Shoot Direction</label>
                    <textarea 
                      placeholder="Describe how to shoot this product..."
                      value={shootDir}
                      onChange={(e) => setShootDir(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Edit Direction</label>
                    <textarea 
                      placeholder="Describe specific editing requirements..."
                      value={editDir}
                      onChange={(e) => setEditDir(e.target.value)}
                    />
                  </div>

                  <button className="send-btn bg-gradient" onClick={handleSendDirection}>
                    <Send size={18} />
                    <span>Send to Shooter</span>
                  </button>
                </div>
              ) : (
                <div className="panel-empty">
                  <Send size={48} />
                  <p>Select a product from the list to provide directions</p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </DashboardLayout>

      <style jsx>{`
        .director-page {
          max-width: 1400px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3rem;
        }

        .page-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: var(--text-muted);
        }

        .tab-switcher {
          display: flex;
          padding: 0.4rem;
          border-radius: 14px;
        }

        .tab-switcher button {
          padding: 0.8rem 1.5rem;
          border-radius: 10px;
          color: var(--text-muted);
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .tab-switcher button.active {
          background: var(--bg-hover);
          color: var(--text-main);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stats-row {
          margin-bottom: 2.5rem;
        }

        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .border-indigo { border-left: 4px solid var(--primary); }
        .border-yellow { border-left: 4px solid var(--warning); }
        .border-emerald { border-left: 4px solid var(--accent); }

        .stat-icon {
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          width: 44px;
          height: 44px;
        }

        .stat-info span {
          display: block;
          font-size: 1.5rem;
          font-weight: 800;
        }

        .stat-info p {
          font-size: 0.85rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 450px;
          gap: 2rem;
          height: 600px;
        }

        .list-container {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .list-header {
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .search-bar {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.8rem 1.2rem;
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .search-bar input {
          background: none;
          border: none;
          color: var(--text-main);
          width: 100%;
          outline: none;
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.8rem 1.2rem;
          background: var(--bg-hover);
          border-radius: 12px;
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-weight: 600;
        }

        .product-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .product-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.2rem 1.5rem;
          border-bottom: 1px solid var(--border);
          transition: background 0.2s ease;
        }

        .product-item:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .product-main {
          display: flex;
          align-items: center;
          gap: 1.2rem;
        }

        .product-thumb {
          width: 50px;
          height: 50px;
          border-radius: 10px;
          background: linear-gradient(45deg, var(--bg-hover), var(--border));
        }

        .product-details h4 {
          margin-bottom: 0.2rem;
        }

        .product-details span {
          font-size: 0.85rem;
          color: var(--text-dim);
        }

        .product-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .action-btn {
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .action-btn.primary {
          background: var(--primary);
          color: white;
        }

        .direction-panel {
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
        }

        .direction-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          width: 100%;
        }

        .form-header {
          margin-bottom: 1rem;
        }

        .form-header h2 {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
        }

        .form-header p {
          color: var(--primary);
          font-weight: 600;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .form-group label {
          font-weight: 700;
          color: var(--text-muted);
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-group textarea {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.2rem;
          color: var(--text-main);
          min-height: 120px;
          resize: vertical;
          font-family: inherit;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .form-group textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .send-btn {
          margin-top: 1rem;
          padding: 1.2rem;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          box-shadow: 0 10px 20px var(--primary-glow);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .settings-pill {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.8rem 1.2rem;
          border-radius: 12px;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.3s ease;
        }

        .settings-pill:hover {
          background: var(--bg-hover);
          color: var(--text-main);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 1000;
        }

        .modal-card {
          width: 500px;
          padding: 2.5rem;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .modal-header button {
          font-size: 2rem;
          color: var(--text-dim);
        }

        .preset-input {
          display: flex;
          gap: 0.8rem;
          margin-bottom: 2rem;
        }

        .preset-input input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0.8rem 1.2rem;
          color: var(--text-main);
        }

        .preset-input button {
          padding: 0 1.2rem;
          border-radius: 10px;
          color: white;
        }

        .preset-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          max-height: 300px;
          overflow-y: auto;
        }

        .preset-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          border: 1px solid var(--border);
        }

        .preset-item button {
          color: var(--danger);
          padding: 0.5rem;
          border-radius: 6px;
        }

        .preset-item button:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .empty-state-list {
          padding: 3rem;
          text-align: center;
          color: var(--text-dim);
        }

        @media (max-width: 1200px) {
          .content-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .direction-panel {
            min-height: 400px;
          }
        }
      `}</style>
    </RoleGuard>
  );
}
