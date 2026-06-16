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
  ChevronRight,
  Palette,
  TrendingUp,
  Package,
  Eye,
  Download
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
  const [dateRange, setDateRange] = useState("all");
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
    if (dateRange === "today") return pDate >= today;
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

  const TAB_COLORS: Record<string, string> = {
    history: "#6366f1",
    upload: "#10b981",
  };

  const TABS = [
    { id: "history", label: "History", icon: Layers, color: "#6366f1" },
    { id: "upload", label: "Upload", icon: Upload, color: "#10b981" },
  ];

  return (
    <RoleGuard allowedRoles={["designer"]}>
      <DashboardLayout>
        <div className="dh">
          <div className="dh-ambient">
            <div className="dh-glow dh-glow-1" />
            <div className="dh-glow dh-glow-2" />
            <div className="dh-glow dh-glow-3" />
            <div className="dh-grid" />
          </div>

          <div className="dh-content">
            <div className="dh-top">
              <div className="dh-top-l">
                <Palette size={22} className="dh-top-icon" />
                <div>
                  <h1 className="dh-top-title">Designer Hub</h1>
                  <p className="dh-top-sub">Upload & manage your creative designs</p>
                </div>
              </div>
              <div className="dh-tabs">
                {TABS.map(t => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  const count = t.id === "history" ? filteredHistory.length : selectedFiles.length;
                  return (
                    <button key={t.id} className={`dh-tab ${isActive ? "dh-tab-a" : ""}`} onClick={() => setActiveTab(t.id)} style={isActive ? { "--tab-color": t.color } as React.CSSProperties : {}}>
                      <Icon size={16} />
                      <span>{t.label}</span>
                      {count > 0 && <span className="dh-tab-c" style={{ background: t.color }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab === "history" && (
              <>
                <div className="dh-kpi">
                  <div className="dh-kpi-c" style={{ "--kpi-color": "#6366f1" } as React.CSSProperties}>
                    <div className="dh-kpi-h">
                      <Package size={18} />
                      <span>Total Products</span>
                    </div>
                    <div className="dh-kpi-v">{stats.total}</div>
                    <div className="dh-kpi-b"><div className="dh-kpi-bf" style={{ width: "100%" }} /></div>
                  </div>
                  <div className="dh-kpi-c" style={{ "--kpi-color": "#10b981" } as React.CSSProperties}>
                    <div className="dh-kpi-h">
                      <TrendingUp size={18} />
                      <span>Uploaded Today</span>
                    </div>
                    <div className="dh-kpi-v">{stats.today}</div>
                    <div className="dh-kpi-b"><div className="dh-kpi-bf" style={{ width: `${stats.total > 0 ? (stats.today / stats.total) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="dh-kpi-c" style={{ "--kpi-color": "#f59e0b" } as React.CSSProperties}>
                    <div className="dh-kpi-h">
                      <Clock size={18} />
                      <span>Awaiting Direction</span>
                    </div>
                    <div className="dh-kpi-v">{stats.pending}</div>
                    <div className="dh-kpi-b"><div className="dh-kpi-bf" style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }} /></div>
                  </div>
                </div>

                <div className="dh-controls">
                  <div className="dh-date-pills">
                    {[
                      { key: "all", label: "All Time" },
                      { key: "today", label: "Today" },
                      { key: "yesterday", label: "Yesterday" },
                      { key: "week", label: "7 Days" },
                      { key: "month", label: "30 Days" },
                      { key: "custom", label: "Custom" },
                    ].map(d => (
                      <button key={d.key} className={`dh-date-pill ${dateRange === d.key ? "dh-date-pill-a" : ""}`} onClick={() => setDateRange(d.key)}>{d.label}</button>
                    ))}
                  </div>
                  {dateRange === "custom" && (
                    <div className="dh-custom-dates">
                      <input type="date" value={customDates.start} onChange={e => setCustomDates(p => ({ ...p, start: e.target.value }))} />
                      <span>to</span>
                      <input type="date" value={customDates.end} onChange={e => setCustomDates(p => ({ ...p, end: e.target.value }))} />
                    </div>
                  )}
                  <div className="dh-search">
                    <Search size={16} />
                    <input type="text" placeholder="Search name or category..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <div className="dh-filters">
                    <div className="dh-filter">
                      <Filter size={14} />
                      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="all">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="dh-filter">
                      <Layers size={14} />
                      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
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

                <div className="dh-list">
                  {Object.keys(groupedProducts).length > 0 ? (
                    Object.keys(groupedProducts).map(date => (
                      <div key={date} className="dh-date-group">
                        <div className="dh-date-h">
                          <Calendar size={14} />
                          <span>{date}</span>
                        </div>
                        {groupedProducts[date].map((p: any) => (
                          <div key={p.id} className="dh-row">
                            <div className="dh-thumb" onClick={() => {
                              const imgUrl = getDisplayUrl(p.thumbnailUrl) || getDisplayUrl(p.mainDesignUrl || p.designUrl, p.mainDesignId || p.designId, 800);
                              if (imgUrl) setViewingImage(imgUrl);
                            }}>
                              {(p.thumbnailUrl || p.mainDesignUrl || p.designUrl) ? (
                                <img src={getDisplayUrl(p.thumbnailUrl) || getDisplayUrl(p.mainDesignUrl || p.designUrl, p.mainDesignId || p.designId, 80) || undefined} alt="" />
                              ) : (
                                <ImageIcon size={20} />
                              )}
                            </div>
                            <div className="dh-row-c">
                              <div className="dh-row-h">
                                <div className="dh-row-n">
                                  <h4>{p.name}</h4>
                                  <span className="dh-cat">{p.category}</span>
                                </div>
                                <div className="dh-row-m">
                                  <span className="dh-variations"><Layers size={12} /> {p.variationCount || 1} var.</span>
                                  <span className={`dh-status dh-status-${(p.status || "").replace(/\s+/g, "-").toLowerCase()}`}>{p.status}</span>
                                </div>
                              </div>
                            </div>
                            <button className="dh-details" onClick={() => {
                              const imgUrl = getDisplayUrl(p.thumbnailUrl) || getDisplayUrl(p.mainDesignUrl || p.designUrl, p.mainDesignId || p.designId, 800);
                              if (imgUrl) setViewingImage(imgUrl);
                            }}>
                              <Eye size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="dh-empty">
                      <Package size={40} />
                      <h3>No products found</h3>
                      <p>Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "upload" && (
              <div className="dh-upload">
                <div className="dh-upload-form">
                  <div className="dh-uf-header">
                    <h3>New Design Upload</h3>
                    <p>Fill in the details and upload your design files</p>
                  </div>
                  <form onSubmit={handleSubmit}>
                    <div className="dh-field">
                      <label>Collection / Product Name</label>
                      <input type="text" placeholder="e.g. Summer Silk Kurta v1" value={productName} onChange={e => setProductName(e.target.value)} required />
                    </div>
                    <div className="dh-field">
                      <label>Category</label>
                      <select value={category} onChange={e => setCategory(e.target.value)} required>
                        <option value="">Select Category</option>
                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                      </select>
                    </div>
                    {selectedFiles.length > 1 && (
                      <div className="dh-field">
                        <label>Variation Labels (Optional)</label>
                        <input type="text" placeholder="e.g. Red, Blue, Green" value={variationLabels} onChange={e => setVariationLabels(e.target.value)} />
                        <span className="dh-helper">Leave empty to auto-name as Variation 1, 2, 3...</span>
                      </div>
                    )}
                    {error && (
                      <div className="dh-error">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}
                    <button type="submit" className="dh-submit" disabled={isUploading || isSuccess || selectedFiles.length === 0}>
                      {isUploading ? (
                        <><Loader2 className="dh-spin" size={18} /> Uploading...</>
                      ) : isSuccess ? (
                        <><CheckCircle2 size={18} /> Uploaded Successfully</>
                      ) : (
                        <><Upload size={18} /> {selectedFiles.length > 1 ? `Upload ${selectedFiles.length} Variations` : "Upload Design"}</>
                      )}
                    </button>
                  </form>
                </div>

                <div className="dh-upload-zone">
                  <div className={`dh-drop ${selectedFiles.length > 0 ? "dh-drop-has" : ""}`} onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={handleFileChange} />
                    <div className="dh-drop-c">
                      <div className="dh-drop-i">
                        <ImageIcon size={40} />
                        <Plus size={18} className="dh-drop-plus" />
                      </div>
                      <h3>Drop your designs here</h3>
                      <p>or click to browse high-res images</p>
                    </div>
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="dh-previews">
                      <div className="dh-prev-h">
                        <span>Variations ({selectedFiles.length})</span>
                        <button type="button" className="dh-clear" onClick={() => setSelectedFiles([])}>Clear All</button>
                      </div>
                      <div className="dh-prev-g">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="dh-prev-card">
                            <img src={file.preview} alt="" />
                            <button type="button" className="dh-remove" onClick={e => { e.stopPropagation(); removeFile(idx); }}><X size={16} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {viewingImage && (
          <div className="dh-viewer" onClick={() => setViewingImage(null)}>
            <div className="dh-viewer-c" onClick={e => e.stopPropagation()}>
              <button className="dh-viewer-x" onClick={() => setViewingImage(null)}><X size={22} /></button>
              <img src={viewingImage} alt="" />
            </div>
          </div>
        )}

        <style jsx>{`
          .dh { position: relative; min-height: calc(100vh - 2rem); padding: 1.5rem; font-family: -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif; color: #ebebf5; }
          .dh-ambient { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
          .dh-glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.15; }
          .dh-glow-1 { width: 500px; height: 500px; top: -100px; right: -100px; background: #6366f1; }
          .dh-glow-2 { width: 400px; height: 400px; bottom: -50px; left: -50px; background: #10b981; }
          .dh-glow-3 { width: 300px; height: 300px; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #8b5cf6; opacity: 0.08; }
          .dh-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; }
          .dh-content { position: relative; z-index: 1; max-width: 1600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
          .dh-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
          .dh-top-l { display: flex; align-items: center; gap: 0.75rem; }
          .dh-top-icon { color: #6366f1; }
          .dh-top-title { font-size: 1.4rem; font-weight: 700; margin: 0; line-height: 1.3; }
          .dh-top-sub { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; }
          .dh-tabs { display: flex; gap: 0.4rem; background: rgba(255,255,255,0.04); padding: 0.35rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
          .dh-tab { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border-radius: 9px; background: none; border: none; color: rgba(255,255,255,0.4); font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; white-space: nowrap; }
          .dh-tab:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.03); }
          .dh-tab-a { background: rgba(255,255,255,0.06) !important; color: #fff !important; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tab-color) 30%, transparent); }
          .dh-tab-c { font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 6px; color: #fff; line-height: 1.4; }
          .dh-kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
          .dh-kpi-c { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1rem 1.25rem; transition: all 0.25s; }
          .dh-kpi-c:hover { background: rgba(255,255,255,0.05); transform: translateY(-2px); }
          .dh-kpi-h { display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--kpi-color); margin-bottom: 0.5rem; }
          .dh-kpi-v { font-size: 2rem; font-weight: 800; line-height: 1; margin-bottom: 0.5rem; }
          .dh-kpi-b { height: 3px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
          .dh-kpi-bf { height: 100%; border-radius: 4px; background: var(--kpi-color); transition: width 0.6s ease; }
          .dh-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
          .dh-date-pills { display: flex; gap: 0.25rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.2rem; }
          .dh-date-pill { padding: 0.35rem 0.7rem; border-radius: 6px; background: none; border: none; color: rgba(255,255,255,0.4); font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
          .dh-date-pill:hover { color: rgba(255,255,255,0.7); }
          .dh-date-pill-a { background: rgba(99,102,241,0.2) !important; color: #818cf8 !important; }
          .dh-custom-dates { display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.3rem 0.7rem; }
          .dh-custom-dates input { background: none; border: none; color: #fff; font-size: 0.75rem; font-family: inherit; outline: none; }
          .dh-custom-dates span { color: rgba(255,255,255,0.3); font-size: 0.7rem; }
          .dh-search { display: flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.3rem 0.7rem; flex: 1; min-width: 160px; }
          .dh-search svg { color: rgba(255,255,255,0.3); flex-shrink: 0; }
          .dh-search input { background: none; border: none; color: #fff; font-size: 0.8rem; font-family: inherit; width: 100%; outline: none; }
          .dh-search input::placeholder { color: rgba(255,255,255,0.25); }
          .dh-filters { display: flex; gap: 0.4rem; }
          .dh-filter { display: flex; align-items: center; gap: 0.3rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.25rem 0.5rem; }
          .dh-filter svg { color: rgba(255,255,255,0.3); flex-shrink: 0; }
          .dh-filter select { background: none; border: none; color: #fff; font-size: 0.7rem; font-weight: 600; font-family: inherit; outline: none; cursor: pointer; padding: 0.25rem 0; }
          .dh-list { display: flex; flex-direction: column; gap: 1rem; }
          .dh-date-group { }
          .dh-date-h { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.3); margin-bottom: 0.5rem; padding-bottom: 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
          .dh-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.04); background: rgba(255,255,255,0.02); transition: all 0.2s; cursor: pointer; }
          .dh-row:hover { background: rgba(255,255,255,0.04); border-color: rgba(99,102,241,0.2); transform: translateX(4px); }
          .dh-thumb { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
          .dh-thumb img { width: 100%; height: 100%; object-fit: cover; }
          .dh-thumb svg { color: rgba(255,255,255,0.2); }
          .dh-row-c { flex: 1; min-width: 0; }
          .dh-row-h { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
          .dh-row-n { display: flex; align-items: center; gap: 0.5rem; }
          .dh-row-n h4 { font-size: 0.85rem; font-weight: 600; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .dh-cat { font-size: 0.65rem; font-weight: 600; padding: 0.15rem 0.4rem; border-radius: 4px; background: rgba(99,102,241,0.1); color: #818cf8; white-space: nowrap; }
          .dh-row-m { display: flex; align-items: center; gap: 0.75rem; }
          .dh-variations { font-size: 0.7rem; color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 0.25rem; white-space: nowrap; }
          .dh-status { font-size: 0.65rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); white-space: nowrap; }
          .dh-status-pending-direction { color: #818cf8; border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.08); }
          .dh-status-pending-shoot { color: #60a5fa; border-color: rgba(96,165,250,0.3); background: rgba(96,165,250,0.08); }
          .dh-status-pending-selection { color: #c084fc; border-color: rgba(192,132,252,0.3); background: rgba(192,132,252,0.08); }
          .dh-status-pending-edit { color: #fbbf24; border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.08); }
          .dh-status-pending-review { color: #fb923c; border-color: rgba(251,146,60,0.3); background: rgba(251,146,60,0.08); }
          .dh-status-completed { color: #34d399; border-color: rgba(52,211,153,0.3); background: rgba(52,211,153,0.08); }
          .dh-details { width: 32px; height: 32px; border-radius: 8px; background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
          .dh-details:hover { background: rgba(99,102,241,0.15); color: #818cf8; }
          .dh-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 3rem; color: rgba(255,255,255,0.3); text-align: center; }
          .dh-empty h3 { font-size: 1.1rem; margin: 0; color: rgba(255,255,255,0.5); }
          .dh-empty p { font-size: 0.85rem; margin: 0; }

          .dh-upload { display: grid; grid-template-columns: 340px 1fr; gap: 1rem; }
          .dh-upload-form { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1.5rem; }
          .dh-uf-header { margin-bottom: 1.25rem; }
          .dh-uf-header h3 { font-size: 1rem; font-weight: 700; margin: 0 0 0.25rem; }
          .dh-uf-header p { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin: 0; }
          .dh-field { margin-bottom: 1rem; }
          .dh-field label { display: block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.4); margin-bottom: 0.35rem; }
          .dh-field input, .dh-field select { width: 100%; padding: 0.65rem 0.8rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #fff; font-size: 0.85rem; font-family: inherit; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
          .dh-field input:focus, .dh-field select:focus { border-color: #6366f1; }
          .dh-helper { font-size: 0.7rem; color: rgba(255,255,255,0.25); margin-top: 0.3rem; display: block; }
          .dh-error { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15); color: #f87171; font-size: 0.8rem; margin-bottom: 1rem; }
          .dh-submit { width: 100%; padding: 0.75rem; border-radius: 10px; border: none; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; transition: all 0.25s; font-family: inherit; }
          .dh-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99,102,241,0.3); }
          .dh-submit:disabled { opacity: 0.5; cursor: not-allowed; }
          .dh-spin { animation: dhSpin 1s linear infinite; }
          @keyframes dhSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

          .dh-upload-zone { display: flex; flex-direction: column; gap: 1rem; }
          .dh-drop { height: 180px; border: 2px dashed rgba(255,255,255,0.08); border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.25s; background: rgba(255,255,255,0.01); }
          .dh-drop:hover { border-color: #6366f1; background: rgba(99,102,241,0.04); }
          .dh-drop-has { height: 120px; border-style: solid; border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.02); }
          .dh-drop-c { text-align: center; }
          .dh-drop-i { position: relative; width: 56px; height: 56px; margin: 0 auto 0.75rem; display: flex; align-items: center; justify-content: center; }
          .dh-drop-i svg:first-child { color: rgba(255,255,255,0.15); }
          .dh-drop-plus { position: absolute; bottom: 0; right: 0; background: #6366f1; color: #fff; border-radius: 50%; padding: 3px; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
          .dh-drop h3 { font-size: 0.95rem; font-weight: 600; margin: 0 0 0.25rem; }
          .dh-drop p { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin: 0; }
          .dh-previews { flex: 1; }
          .dh-prev-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
          .dh-prev-h span { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.5); }
          .dh-clear { background: none; border: none; color: rgba(239,68,68,0.6); font-size: 0.7rem; font-weight: 600; cursor: pointer; font-family: inherit; padding: 0.2rem 0.4rem; border-radius: 4px; transition: all 0.15s; }
          .dh-clear:hover { color: #ef4444; background: rgba(239,68,68,0.08); }
          .dh-prev-g { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.5rem; }
          .dh-prev-card { aspect-ratio: 1; border-radius: 8px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.04); }
          .dh-prev-card img { width: 100%; height: 100%; object-fit: cover; }
          .dh-remove { position: absolute; inset: 0; background: rgba(239,68,68,0.7); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; color: #fff; border: none; cursor: pointer; width: 100%; }
          .dh-prev-card:hover .dh-remove { opacity: 1; }

          .dh-viewer { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.92); backdrop-filter: blur(20px); display: flex; align-items: center; justify-content: center; }
          .dh-viewer-c { position: relative; max-width: 90vw; max-height: 90vh; }
          .dh-viewer-c img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }
          .dh-viewer-x { position: absolute; top: -3rem; right: 0; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.08); border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
          .dh-viewer-x:hover { background: rgba(239,68,68,0.3); }

          @media (max-width: 1024px) { .dh-upload { grid-template-columns: 1fr; } .dh-kpi { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 768px) { .dh-top { flex-direction: column; align-items: flex-start; } .dh-tabs { width: 100%; } .dh-tab { flex: 1; justify-content: center; } .dh-kpi { grid-template-columns: 1fr; } .dh-controls { flex-direction: column; align-items: stretch; } .dh-filters { flex-wrap: wrap; } .dh-row-h { flex-direction: column; align-items: flex-start; gap: 0.4rem; } .dh-prev-g { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); } }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}
