"use client";

import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { createBulkProducts } from "@/lib/actions";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Upload, 
  CheckCircle2, 
  Loader2, 
  Image as ImageIcon, 
  AlertCircle,
  Files,
  X,
  Plus,
  Clock,
  Search,
  Filter,
  Layers,
  Calendar,
  ChevronRight
} from "lucide-react";

interface FileWithPreview extends File {
  preview?: string;
}

export default function DesignerPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [variationLabels, setVariationLabels] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("history");
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all"); // all, today, yesterday, week, month, custom
  const [customDates, setCustomDates] = useState({ start: "", end: "" });
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/actions").then(actions => {
      actions.getCategories().then(setCategories);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const isWithinDateRange = (date: any) => {
    if (dateRange === "all") return true;
    if (!date?.toDate) return true;
    
    const pDate = date.toDate();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateRange === "today") {
      return pDate >= today;
    }
    if (dateRange === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return pDate >= yesterday && pDate < today;
    }
    if (dateRange === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return pDate >= weekAgo;
    }
    if (dateRange === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return pDate >= monthAgo;
    }
    if (dateRange === "custom" && customDates.start && customDates.end) {
      const start = new Date(customDates.start);
      const end = new Date(customDates.end);
      end.setHours(23, 59, 59, 999);
      return pDate >= start && pDate <= end;
    }
    return true;
  };

  const filteredHistory = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category === filterCategory;
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const matchesDate = isWithinDateRange(p.createdAt);
    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [selectedFiles]);

  // Keyboard shortcuts for viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewingImage) return;
      if (e.key === "Escape") setViewingImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingImage]);

  const getDisplayUrl = (url: string, id?: string, size = 400) => {
    if (!url && !id) return null;
    if (id) return `/api/image?id=${id}`;
    const match = url?.match(/[-\w]{25,}/);
    if (match) return `/api/image?id=${match[0]}`;
    return url;
  };

  const groupedProducts = filteredHistory.reduce((groups: any, product) => {
    const date = product.createdAt?.toDate ? product.createdAt.toDate().toLocaleDateString() : 'Just now';
    if (!groups[date]) groups[date] = [];
    groups[date].push(product);
    return groups;
  }, {});

  const stats = {
    total: filteredHistory.length,
    today: filteredHistory.filter(p => {
      const today = new Date().toLocaleDateString();
      const pDate = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'Just now';
      return today === pDate;
    }).length,
    pending: filteredHistory.filter(p => p.status === 'Pending Direction').length
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).map(file => 
        Object.assign(file, {
          preview: URL.createObjectURL(file)
        })
      );
      setSelectedFiles(prev => [...prev, ...filesArray]);
      setError("");
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    if (fileToRemove.preview) URL.revokeObjectURL(fileToRemove.preview);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || selectedFiles.length === 0) return;

    setIsUploading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("name", productName);
    formData.append("category", category);
    
    if (variationLabels.trim()) {
      formData.append("variationLabels", variationLabels);
    }
    
    selectedFiles.forEach(file => {
      formData.append("files", file);
    });

    try {
      const result = await createBulkProducts(formData);
      setIsUploading(false);
      if (result && result.success) {
        setIsSuccess(true);
        setProductName("");
        setCategory("");
        setVariationLabels("");
        setSelectedFiles([]);
        setTimeout(() => setIsSuccess(false), 5000);
      } else {
        setError(result?.error || "Failed to add products.");
      }
    } catch (err: any) {
      setIsUploading(false);
      setError("System Error: " + err.message);
    }
  };

  return (
    <RoleGuard allowedRoles={["designer"]}>
      <DashboardLayout>
        <div className="designer-page animate-fade">
          <header className="page-header">
            <div className="header-info">
              <h1 className="text-gradient">Designer Hub</h1>
              <p>{activeTab === "upload" ? "Upload your creative designs to initiate production." : "Track and manage your design history."}</p>
            </div>
            
            <div className="header-controls">
              {activeTab === "history" ? (
                <button className="advance-upload-btn bg-gradient" onClick={() => setActiveTab("upload")}>
                  <Plus size={20} />
                  <span>Advance New Upload</span>
                </button>
              ) : (
                <button className="back-to-archive-btn glass" onClick={() => setActiveTab("history")}>
                  <ChevronRight size={20} className="icon-flip" />
                  <span>Back to Archive</span>
                </button>
              )}
            </div>
          </header>

          {activeTab === "upload" ? (
            <div className="designer-grid animate-fade">
              <aside className="upload-config glass">
                <form onSubmit={handleSubmit} className="design-form">
                  <div className="form-group">
                    <label>Collection / Product Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Summer Silk Kurta v1" 
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedFiles.length > 1 && (
                    <div className="form-group">
                      <label>Variation Labels (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Red, Blue, Green (comma separated)" 
                        value={variationLabels}
                        onChange={(e) => setVariationLabels(e.target.value)}
                      />
                      <span className="helper-text">Leave empty to auto-name as Variation 1, 2, 3...</span>
                    </div>
                  )}

                  {error && (
                    <div className="error-alert animate-shake">
                      <AlertCircle size={18} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="submit-btn bg-gradient"
                    disabled={isUploading || isSuccess || selectedFiles.length === 0}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="spinner" size={20} />
                        <span>Uploading {selectedFiles.length} variation{selectedFiles.length > 1 ? 's' : ''}...</span>
                      </>
                    ) : isSuccess ? (
                      <>
                        <CheckCircle2 size={20} />
                        <span>Success! Uploaded</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        <span>{selectedFiles.length > 1 ? `Upload ${selectedFiles.length} Variations` : 'Initialize Production'}</span>
                      </>
                    )}
                  </button>
                </form>
              </aside>

              <main className="upload-canvas glass">
                <div 
                  className={`drop-zone ${selectedFiles.length > 0 ? 'has-files' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    hidden 
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <div className="prompt-content">
                    <div className="icon-stack">
                      <ImageIcon size={48} className="icon-main" />
                      <Plus size={24} className="icon-sub" />
                    </div>
                    <h3>Add Product Designs</h3>
                    <p>Drag and drop or click to browse high-res images</p>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="previews-container animate-fade">
                    <div className="preview-header">
                      <div className="preview-title-group">
                        <h3>Variations</h3>
                        {selectedFiles.length > 1 && (
                          <span className="variation-count-badge">{selectedFiles.length}</span>
                        )}
                      </div>
                      <button type="button" className="clear-btn" onClick={() => setSelectedFiles([])}>Clear All</button>
                    </div>
                    <div className="preview-grid">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="preview-card animate-scale">
                          <div className="preview-image-wrapper">
                            <img src={file.preview} alt="preview" />
                            <button 
                              type="button" 
                              className="remove-overlay"
                              onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            >
                              <X size={20} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </main>
            </div>
          ) : (
            <div className="history-dashboard animate-fade">
              <div className="history-filters-header animate-fade">
                <div className="date-presets glass">
                  <button className={dateRange === "all" ? "active" : ""} onClick={() => setDateRange("all")}>All Time</button>
                  <button className={dateRange === "today" ? "active" : ""} onClick={() => setDateRange("today")}>Today</button>
                  <button className={dateRange === "yesterday" ? "active" : ""} onClick={() => setDateRange("yesterday")}>Yesterday</button>
                  <button className={dateRange === "week" ? "active" : ""} onClick={() => setDateRange("week")}>Last 7 Days</button>
                  <button className={dateRange === "month" ? "active" : ""} onClick={() => setDateRange("month")}>Last 30 Days</button>
                  <button className={dateRange === "custom" ? "active" : ""} onClick={() => setDateRange("custom")}>Custom Range</button>
                </div>
                
                {dateRange === "custom" && (
                  <div className="custom-date-inputs glass animate-scale">
                    <input type="date" value={customDates.start} onChange={(e) => setCustomDates(prev => ({...prev, start: e.target.value}))} />
                    <span>to</span>
                    <input type="date" value={customDates.end} onChange={(e) => setCustomDates(prev => ({...prev, end: e.target.value}))} />
                  </div>
                )}
              </div>

              <section className="stats-grid">
                <div className="stat-item glass border-indigo">
                  <Files size={24} className="text-primary" />
                  <div className="stat-content">
                    <h3>{stats.total}</h3>
                    <p>Total Products</p>
                  </div>
                </div>
                <div className="stat-item glass border-green">
                  <CheckCircle2 size={24} className="text-success" />
                  <div className="stat-content">
                    <h3>{stats.today}</h3>
                    <p>Uploaded Today</p>
                  </div>
                </div>
                <div className="stat-item glass border-yellow">
                  <Clock size={24} className="text-warning" />
                  <div className="stat-content">
                    <h3>{stats.pending}</h3>
                    <p>Awaiting Direction</p>
                  </div>
                </div>
              </section>

              <div className="dashboard-controls glass">
                <div className="search-box">
                  <Search size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by name or category..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <div className="filter-item">
                    <Filter size={16} />
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                      <option value="all">All Categories</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="filter-item">
                    <Layers size={16} />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="all">All Statuses</option>
                      <option value="Pending Direction">Pending Direction</option>
                      <option value="Pending Shoot">Pending Shoot</option>
                      <option value="Pending Selection">Pending Selection</option>
                      <option value="Pending Edit">Pending Edit</option>
                      <option value="Pending Review">Pending Review</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="history-list">
                {Object.keys(groupedProducts).length > 0 ? (
                  Object.keys(groupedProducts).map(date => (
                    <div key={date} className="date-group animate-fade">
                      <div className="date-header">
                        <Calendar size={16} />
                        <span>{date}</span>
                        <div className="date-line"></div>
                      </div>
                      <div className="products-stack">
                        {groupedProducts[date].map((p: any) => (
                          <div key={p.id} className="history-row glass-card hover-glow">
                            <div className="row-thumb" onClick={() => {
                              const imgUrl = getDisplayUrl(p.thumbnailUrl) || getDisplayUrl(p.mainDesignUrl || p.designUrl, p.mainDesignId || p.designId, 800);
                              if (imgUrl) setViewingImage(imgUrl);
                            }}>
                              <img src={getDisplayUrl(p.thumbnailUrl) || getDisplayUrl(p.mainDesignUrl || p.designUrl, p.mainDesignId || p.designId, 80)} alt="" />
                            </div>
                            <div className="row-content">
                              <div className="row-main">
                                <div className="name-group">
                                  <h4>{p.name}</h4>
                                  <span className="cat-badge">{p.category}</span>
                                </div>
                                <div className="meta-group">
                                  <div className="variation-pill">
                                    <Layers size={14} />
                                    <span>{p.variationCount || 1} Variations</span>
                                  </div>
                                  <div className={`status-pill ${p.status?.replace(' ', '-').toLowerCase()}`}>
                                    {p.status}
                                  </div>
                                </div>
                              </div>
                              <button className="details-btn">
                                <ChevronRight size={20} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-history glass">
                    <Search size={48} className="text-muted" />
                    <h3>No products found</h3>
                    <p>Try adjusting your search or filters to find what you're looking for.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div className="image-viewer-overlay" onClick={() => setViewingImage(null)}>
          <div className="image-viewer-content" onClick={e => e.stopPropagation()}>
            <button className="viewer-close" onClick={() => setViewingImage(null)}>
              <X size={24} />
            </button>
            <img src={viewingImage} alt="Preview" />
          </div>
        </div>
      )}

      <style jsx>{`
        .designer-page { padding: 2rem; max-width: 1600px; margin: 0 auto; min-height: 100vh; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
        .text-gradient { background: linear-gradient(135deg, #fff 0%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.5rem; font-weight: 900; letter-spacing: -0.03em; }
        .header-info p { color: var(--text-dim); font-size: 1.1rem; margin-top: 0.5rem; }
        
        .header-controls { display: flex; align-items: center; gap: 1.5rem; }
        
        .advance-upload-btn { display: flex; align-items: center; gap: 0.8rem; padding: 0.8rem 1.8rem; border-radius: 14px; color: white; font-weight: 700; transition: all 0.3s; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.2); }
        .advance-upload-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(99, 102, 241, 0.3); }

        .back-to-archive-btn { display: flex; align-items: center; gap: 0.8rem; padding: 0.8rem 1.8rem; border-radius: 14px; color: rgba(255,255,255,0.6); font-weight: 700; transition: all 0.3s; border: 1px solid rgba(255,255,255,0.1); }
        .back-to-archive-btn:hover { background: rgba(255,255,255,0.05); color: white; }
        .back-to-archive-btn:hover .icon-flip { transform: translateX(-4px) rotate(180deg); }
        .icon-flip { transform: rotate(180deg); transition: 0.3s; }

        /* Date Filters Header */
        .history-filters-header { margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1rem; }
        .date-presets { display: flex; gap: 0.5rem; padding: 0.5rem; border-radius: 18px; background: rgba(15, 23, 42, 0.4); width: fit-content; border: 1px solid rgba(255,255,255,0.05); }
        .date-presets button { padding: 0.7rem 1.5rem; border-radius: 12px; font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.4); transition: all 0.3s; }
        .date-presets button.active { background: #6366f1; color: white; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); }
        .date-presets button:hover:not(.active) { background: rgba(255,255,255,0.03); color: white; }

        .custom-date-inputs { display: flex; align-items: center; gap: 1rem; padding: 0.8rem 1.5rem; border-radius: 18px; background: rgba(15, 23, 42, 0.4); width: fit-content; border: 1px solid rgba(99, 102, 241, 0.2); }
        .custom-date-inputs input { background: transparent; border: none; color: white; font-family: inherit; font-weight: 600; outline: none; cursor: pointer; }
        .custom-date-inputs span { color: rgba(255,255,255,0.3); font-weight: 700; font-size: 0.8rem; text-transform: uppercase; }

        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
        .stat-item { padding: 1.5rem 2rem; border-radius: 24px; display: flex; align-items: center; gap: 1.5rem; transition: transform 0.3s; }
        .stat-item:hover { transform: translateY(-5px); }
        .stat-content h3 { font-size: 2rem; font-weight: 900; line-height: 1; margin-bottom: 0.3rem; }
        .stat-content p { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.4); letter-spacing: 0.05em; }

        .dashboard-controls { padding: 1.5rem; border-radius: 24px; margin-bottom: 2.5rem; display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
        .search-box { flex: 1; position: relative; display: flex; align-items: center; }
        .search-box svg { position: absolute; left: 1.2rem; color: rgba(255,255,255,0.3); }
        .search-box input { width: 100%; padding: 1rem 1rem 1rem 3.5rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; color: white; font-size: 1rem; transition: 0.3s; }
        .search-box input:focus { border-color: #6366f1; background: rgba(0,0,0,0.3); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); outline: none; }
        
        .filter-group { display: flex; gap: 1rem; }
        .filter-item { display: flex; align-items: center; gap: 0.8rem; padding: 0.2rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; color: rgba(255,255,255,0.4); }
        .filter-item select { background: transparent; border: none; color: white; font-weight: 700; font-size: 0.9rem; outline: none; cursor: pointer; padding: 0.8rem 0; }

        .history-list { display: flex; flex-direction: column; gap: 3rem; }
        .date-header { display: flex; align-items: center; gap: 1.2rem; margin-bottom: 1.5rem; color: rgba(255,255,255,0.5); }
        .date-header span { font-weight: 800; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; }
        .date-line { flex: 1; height: 1px; background: linear-gradient(to right, rgba(255,255,255,0.1), transparent); }

        .products-stack { display: flex; flex-direction: column; gap: 1rem; }
        .history-row { padding: 0.8rem; border-radius: 20px; display: flex; align-items: center; gap: 1.5rem; transition: all 0.3s; border: 1px solid rgba(255,255,255,0.05); }
        .history-row:hover { transform: translateX(10px); border-color: rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.05); }
        
        .row-thumb { width: 80px; height: 80px; border-radius: 14px; overflow: hidden; background: linear-gradient(135deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(225deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(315deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, #1e293b 25%, transparent 25%); background-size: 20px 20px; background-color: #0f172a; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .row-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
        
        .row-content { flex: 1; display: flex; justify-content: space-between; align-items: center; }
        .row-main { display: flex; align-items: center; gap: 3rem; flex: 1; }
        
        .name-group { min-width: 250px; }
        .name-group h4 { font-size: 1.1rem; font-weight: 800; margin-bottom: 0.2rem; }
        .cat-badge { font-size: 0.75rem; font-weight: 700; color: #818cf8; background: rgba(129, 140, 248, 0.1); padding: 0.2rem 0.6rem; border-radius: 6px; }
        
        .meta-group { display: flex; align-items: center; gap: 2rem; }
        .variation-pill { display: flex; align-items: center; gap: 0.6rem; color: rgba(255,255,255,0.3); font-size: 0.9rem; font-weight: 600; min-width: 120px; }
        
        .status-pill { padding: 0.5rem 1.2rem; border-radius: 100px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); min-width: 160px; text-align: center; }
        .status-pill.pending-direction { color: #818cf8; border-color: rgba(99, 102, 241, 0.3); }
        .status-pill.completed { color: #10b981; border-color: rgba(16, 185, 129, 0.3); }
        .status-pill.pending-review { color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); }

        .details-btn { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); color: white; transition: 0.3s; }
        .history-row:hover .details-btn { background: #6366f1; color: white; transform: rotate(-90deg); }

        .empty-history { padding: 5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; border: 2px dashed rgba(255,255,255,0.05); }
        .empty-history h3 { font-size: 1.5rem; margin-top: 1rem; }
        .empty-history p { color: rgba(255,255,255,0.4); max-width: 300px; }

        .designer-grid { display: grid; grid-template-columns: 350px 1fr; gap: 2rem; height: calc(100vh - 250px); min-height: 700px; }
        .upload-config { padding: 2.5rem; border-radius: 32px; background: rgba(15, 23, 42, 0.4); }
        .design-form { display: flex; flex-direction: column; gap: 2rem; }
        .form-group { display: flex; flex-direction: column; gap: 1rem; }
        .form-group label { font-weight: 800; color: rgba(255,255,255,0.4); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; }
        .form-group input, .form-group select { padding: 1.2rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; color: white; font-size: 1rem; transition: all 0.3s; }
        .form-group input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
        .helper-text { font-size: 0.75rem; color: rgba(255,255,255,0.3); }

        .upload-canvas { padding: 2rem; border-radius: 32px; display: flex; flex-direction: column; gap: 2rem; overflow: hidden; background: rgba(15, 23, 42, 0.4); }
        .drop-zone { height: 200px; border: 2px dashed rgba(255,255,255,0.1); border-radius: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.4s; background: rgba(255,255,255,0.02); }
        .drop-zone:hover { border-color: #6366f1; background: rgba(99, 102, 241, 0.05); }
        .drop-zone.has-files { height: 160px; border-style: solid; border-color: rgba(99, 102, 241, 0.5); background: rgba(99, 102, 241, 0.02); }
        
        .icon-stack { position: relative; width: 64px; height: 64px; margin: 0 auto 1.5rem; }
        .icon-main { color: rgba(255,255,255,0.2); transition: 0.3s; }
        .icon-sub { position: absolute; bottom: 0; right: 0; background: #6366f1; color: white; border-radius: 50%; padding: 4px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
        .drop-zone:hover .icon-main { color: #6366f1; transform: scale(1.1); }

        .previews-container { flex: 1; overflow-y: auto; padding: 1rem; }
        .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1.2rem; }
        .preview-card { aspect-ratio: 1; border-radius: 20px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.05); }
        .preview-image-wrapper img { width: 100%; height: 100%; object-fit: cover; }
        .remove-overlay { position: absolute; inset: 0; background: rgba(239, 68, 68, 0.8); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; color: white; }
        .preview-card:hover .remove-overlay { opacity: 1; }

        .submit-btn { width: 100%; padding: 1.4rem; border-radius: 20px; color: white; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 1rem; transition: 0.4s; box-shadow: 0 15px 35px rgba(99, 102, 241, 0.3); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-5px); box-shadow: 0 20px 50px rgba(99, 102, 241, 0.4); }

        .error-alert { padding: 1rem; border-radius: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #f87171; display: flex; align-items: center; gap: 0.8rem; font-size: 0.9rem; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .animate-fade { animation: fadeIn 0.6s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-scale { animation: scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
        
        @media (max-width: 1200px) { .row-main { gap: 1.5rem; } .status-pill { min-width: 120px; } }
        @media (max-width: 900px) { .row-main { flex-direction: column; align-items: flex-start; gap: 0.5rem; } .name-group { min-width: auto; } }
        
        /* Image Viewer Styles */
        .image-viewer-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(25px); z-index: 9999; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .image-viewer-content { position: relative; max-width: 90vw; max-height: 90vh; display: flex; align-items: center; justify-content: center; }
        .image-viewer-content img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 16px; box-shadow: 0 50px 150px rgba(0,0,0,0.9); animation: zoomIn 0.3s ease-out; }
        .viewer-close { position: absolute; top: -50px; right: 0; width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 1px solid rgba(255,255,255,0.2); transition: all 0.3s; cursor: pointer; }
        .viewer-close:hover { background: rgba(239, 68, 68, 0.3); border-color: #ef4444; transform: scale(1.1); }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </RoleGuard>
  );
}
