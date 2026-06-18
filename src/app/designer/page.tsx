"use client";

import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { createBulkProducts } from "@/lib/actions";
import { getDisplayUrl } from "@/lib/utils";
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
  ChevronLeft,
  Info,
  Eye,
  ArrowRight,
  Camera,
  PenTool,
  CheckCircle,
  Circle,
  CheckSquare,
  Activity,
  RotateCcw
} from "lucide-react";
import { useImageViewer } from "@/components/ImageViewerProvider";
import { useToast } from "@/components/ToastProvider";

interface FileWithPreview extends File {
  preview?: string;
}

export default function DesignerPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadElapsed, setUploadElapsed] = useState(0);
  const [error, setError] = useState("");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [variationLabels, setVariationLabels] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<string>("history");
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [customDates, setCustomDates] = useState({ start: "", end: "" });
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "variations" | "timeline">("overview");
  const [detailPreviewIdx, setDetailPreviewIdx] = useState(0);
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const { openViewer } = useImageViewer();
  const { showToast } = useToast();

  const tabConfig: Record<string, { label: string; color: string; glow: string; icon: React.ReactNode }> = {
    history: {
      label: "History",
      color: "#818cf8",
      glow: "rgba(99,102,241,0.35)",
      icon: <RotateCcw size={14} />
    },
    upload: {
      label: "Upload",
      color: "#10b981",
      glow: "rgba(16,185,129,0.35)",
      icon: <Upload size={14} />
    },
    requests: {
      label: "Requests",
      color: "#f59e0b",
      glow: "rgba(245,158,11,0.35)",
      icon: <PenTool size={14} />
    }
  };

  const counts: Record<string, number> = {
    history: products.length,
    upload: selectedFiles.length,
    requests: requests.length
  };

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

  useEffect(() => {
    (async () => {
      const { getDesignerRequests } = await import("@/lib/actions");
      const data = await getDesignerRequests();
      setRequests(data);
    })();
    const interval = setInterval(async () => {
      const { getDesignerRequests } = await import("@/lib/actions");
      const data = await getDesignerRequests();
      setRequests(data);
    }, 10000);
    return () => clearInterval(interval);
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

  const kpiFilters: Record<string, (p: any) => boolean> = {
    total: () => true,
    today: (p) => { const td = new Date().toLocaleDateString(); const pd = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : ''; return td === pd; },
    pending: (p) => p.status === 'Pending Direction',
  };

  const filteredHistory = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category === filterCategory;
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const matchesDate = isWithinDateRange(p.createdAt);
    const matchesKpi = !activeKpi || kpiFilters[activeKpi](p);
    return matchesSearch && matchesCategory && matchesStatus && matchesDate && matchesKpi;
  });

  useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [selectedFiles]);

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
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadElapsed(0);
    setError("");

    const startTime = Date.now();
    const timer = setInterval(() => {
      setUploadElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 2 + Math.floor(Math.random() * 3), 90));
    }, selectedFiles.length > 3 ? 600 : 1000);

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
      clearInterval(timer);
      clearInterval(progressTimer);
      setIsUploading(false);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 2000);
      if (result && result.success) {
        showToast({ type: "success", title: "Success!", description: "Products uploaded successfully." });
        setProductName("");
        setCategory("");
        setVariationLabels("");
        setSelectedFiles([]);
      } else {
        setError(result?.error || "Failed to add products.");
      }
    } catch (err: any) {
      clearInterval(timer);
      clearInterval(progressTimer);
      setIsUploading(false);
      setUploadProgress(0);
      setError("System Error: " + err.message);
    }
  };

  const openProductDetail = (product: any) => {
    setSelectedDetailProduct(product);
    setDetailTab("overview");
    setDetailPreviewIdx(0);
  };

  const closeProductDetail = () => {
    setSelectedDetailProduct(null);
  };

  const getProductImages = (product: any) => {
    if (product.variations && product.variations.length > 0) {
      return product.variations;
    }
    const main = { url: product.mainDesignUrl || product.designUrl, id: product.mainDesignId || product.designId };
    return main.url ? [main] : [];
  };

  const statusSteps = [
    "Pending Direction",
    "Pending Shoot",
    "Pending Selection",
    "Pending Edit",
    "Pending Review",
    "Completed"
  ];

  const getStatusIndex = (status: string) => statusSteps.indexOf(status);

  return (
    <RoleGuard allowedRoles={["designer"]}>
      <DashboardLayout>
        <div className="dh-root animate-fade-in">
          <div className="dh-ambient" aria-hidden="true">
            <div className="dh-orb dh-orb-1" />
            <div className="dh-orb dh-orb-2" />
            <div className="dh-orb dh-orb-3" />
            <div className="dh-grid-lines" />
          </div>

          <header className="dh-header">
            <div className="dh-header-left">
              <span className="dh-badge">Designer Hub</span>
              <h1 className="dh-title">
                Creative <span className="dh-title-accent">Studio</span>
              </h1>
              <p className="dh-subtitle">
                {activeTab === "upload" ? "Upload your creative designs to initiate production." : activeTab === "requests" ? "View and manage requests from the Director." : "Track and manage your design history."}
              </p>
            </div>
            <div className="dh-tabs">
              {Object.entries(tabConfig).map(([key, cfg]) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    className={`dh-tab ${isActive ? "dh-tab-active" : ""}`}
                    style={isActive ? { "--tab-color": cfg.color, "--tab-glow": cfg.glow } as React.CSSProperties : {}}
                    onClick={() => setActiveTab(key)}
                  >
                    <span className="dh-tab-icon">{cfg.icon}</span>
                    <span>{cfg.label}</span>
                    {counts[key] > 0 && <span className="dh-tab-count">{counts[key]}</span>}
                  </button>
                );
              })}
            </div>
          </header>

          {activeTab === "history" && (
            <>
              <section className="dh-kpi-strip">
                {[
                  { key: null, label: "Total Products", value: stats.total, icon: <Activity size={18} />, color: "#818cf8", glow: "rgba(99,102,241,0.35)" },
                  { key: "today", label: "Uploaded Today", value: stats.today, icon: <CheckCircle2 size={18} />, color: "#10b981", glow: "rgba(16,185,129,0.35)" },
                  { key: "pending", label: "Awaiting Direction", value: stats.pending, icon: <Clock size={18} />, color: "#f59e0b", glow: "rgba(245,158,11,0.35)" }
                ].map((kpi) => {
                  const isActive = activeKpi === kpi.key;
                  const isDimmed = activeKpi !== null && !isActive;
                  return (
                    <button
                      key={kpi.key || "all"}
                      className={`dh-kpi ${isActive ? "dh-kpi-active" : ""} ${isDimmed ? "dh-kpi-dimmed" : ""}`}
                      style={{ "--kpi-color": kpi.color, "--kpi-glow": kpi.glow } as React.CSSProperties}
                      onClick={() => setActiveKpi(isActive ? null : kpi.key)}
                    >
                      <div className="dh-kpi-icon">{kpi.icon}</div>
                      <div className="dh-kpi-body">
                        <div className="dh-kpi-num">{kpi.value}</div>
                        <div className="dh-kpi-label">{kpi.label}</div>
                      </div>
                      <div className="dh-kpi-bar"><div className="dh-kpi-bar-fill" style={{ width: `${Math.min(100, (kpi.value / (stats.total || 1)) * 100)}%` }} /></div>
                      {isActive && <div className="dh-kpi-pulse" />}
                    </button>
                  );
                })}
              </section>

              <div className="dh-body">
                <div className="dh-panel dh-panel-full">
                  <div className="dh-history-filters">
                    <div className="dh-date-presets">
                      {["all", "today", "yesterday", "week", "month", "custom"].map((range) => (
                        <button
                          key={range}
                          className={`dh-date-btn ${dateRange === range ? "active" : ""}`}
                          onClick={() => setDateRange(range)}
                        >
                          {range === "all" ? "All Time" : range === "today" ? "Today" : range === "yesterday" ? "Yesterday" : range === "week" ? "Last 7 Days" : range === "month" ? "Last 30 Days" : "Custom Range"}
                        </button>
                      ))}
                    </div>
                    {dateRange === "custom" && (
                      <div className="dh-custom-dates">
                        <input type="date" value={customDates.start} onChange={(e) => setCustomDates(prev => ({...prev, start: e.target.value}))} />
                        <span>to</span>
                        <input type="date" value={customDates.end} onChange={(e) => setCustomDates(prev => ({...prev, end: e.target.value}))} />
                      </div>
                    )}
                  </div>

                  <div className="dh-controls-bar">
                    <div className="dh-search-box">
                      <Search size={16} />
                      <input type="text" placeholder="Search by name or category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="dh-filter-group">
                      <div className="dh-filter-item">
                        <Filter size={14} />
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                          <option value="all">All Categories</option>
                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="dh-filter-item">
                        <Layers size={14} />
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
                      <div className="dh-bulk-toggle" onClick={() => {
                        if (selectedBulkIds.length === filteredHistory.length) {
                          setSelectedBulkIds([]);
                        } else {
                          setSelectedBulkIds(filteredHistory.map(p => p.id));
                        }
                      }}>
                        <input type="checkbox" readOnly checked={selectedBulkIds.length > 0 && selectedBulkIds.length === filteredHistory.length} />
                      </div>
                    </div>
                  </div>

                  {selectedBulkIds.length > 0 && (
                    <div className="dh-bulk-bar">
                      <div className="dh-bulk-info">
                        <CheckSquare size={16} />
                        <span><strong>{selectedBulkIds.length}</strong> product{selectedBulkIds.length > 1 ? 's' : ''} selected</span>
                      </div>
                      <div className="dh-bulk-controls">
                        <select className="dh-bulk-select" onChange={async (e) => {
                          const status = e.target.value;
                          if (!status) return;
                          setIsBulkUpdating(true);
                          const { bulkUpdateProductStatus } = await import('@/lib/actions');
                          const result = await bulkUpdateProductStatus(selectedBulkIds, status);
                          if (result.success) {
                            setSelectedBulkIds([]);
                          }
                          setIsBulkUpdating(false);
                          e.target.value = '';
                        }} disabled={isBulkUpdating}>
                          <option value="">Set Status...</option>
                          <option value="Pending Direction">Pending Direction</option>
                          <option value="Pending Shoot">Pending Shoot</option>
                          <option value="Pending Selection">Pending Selection</option>
                          <option value="Pending Edit">Pending Edit</option>
                          <option value="Pending Review">Pending Review</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <button className="dh-bulk-clear" onClick={() => setSelectedBulkIds([])}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="dh-product-list" key={activeKpi || 'all'}>
                    {Object.keys(groupedProducts).length > 0 ? (
                      Object.keys(groupedProducts).map(date => (
                        <div key={date} className="dh-date-group">
                          <div className="dh-date-header">
                            <Calendar size={14} />
                            <span>{date}</span>
                            <div className="dh-date-line" />
                          </div>
                          <div className="dh-products-stack">
                            {groupedProducts[date].map((p: any) => (
                              <div
                                key={p.id}
                                className={`dh-product-row ${selectedBulkIds.includes(p.id) ? 'dh-row-selected' : ''}`}
                                onClick={() => openProductDetail(p)}
                              >
                                <div className="dh-row-check" onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBulkIds(prev =>
                                    prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                  );
                                }}>
                                  <input type="checkbox" readOnly checked={selectedBulkIds.includes(p.id)} />
                                </div>
                                <div className="dh-row-thumb" onClick={(e) => { e.stopPropagation(); openViewer(p); }}>
                                  <img src={(getDisplayUrl(p.thumbnailUrl) || getDisplayUrl(p.mainDesignUrl || p.designUrl, p.mainDesignId || p.designId, 80)) || undefined} alt="" />
                                </div>
                                <div className="dh-row-body">
                                  <div className="dh-row-main">
                                    <div className="dh-row-title">
                                      <h4>{p.name}</h4>
                                      <span className="dh-cat-pill">{p.category}</span>
                                    </div>
                                    <div className="dh-row-meta">
                                      <span className="dh-var-count">
                                        <Layers size={12} />
                                        {p.variationCount || 1}
                                      </span>
                                      <span className={`dh-status-pill ${p.status?.replace(' ', '-').toLowerCase()}`}>
                                        {p.status}
                                      </span>
                                    </div>
                                  </div>
                                  <button className="dh-details-btn" onClick={(e) => { e.stopPropagation(); openProductDetail(p); }}>
                                    <ChevronRight size={18} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="dh-empty">
                        <Search size={40} />
                        <h3>No products found</h3>
                        <p>Try adjusting your search or filters to find what you're looking for.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "upload" && (
            <div className="dh-body">
              <div className="dh-panel dh-panel-upload">
                <aside className="dh-upload-sidebar">
                  <form onSubmit={handleSubmit} className="dh-upload-form">
                    <div className="dh-form-group">
                      <label>Collection / Product Name <span className="dh-optional">(Optional)</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Summer Silk Kurta v1 (leave empty for director to name)"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                      />
                    </div>
                    <div className="dh-form-group">
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
                      <div className="dh-form-group">
                        <label>Variation Labels <span className="dh-optional">(Optional)</span></label>
                        <input
                          type="text"
                          placeholder="e.g. Red, Blue, Green (comma separated)"
                          value={variationLabels}
                          onChange={(e) => setVariationLabels(e.target.value)}
                        />
                        <span className="dh-helper">Leave empty to auto-name as Variation 1, 2, 3...</span>
                      </div>
                    )}
                    {error && (
                      <div className="dh-error">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}
                    {isUploading && (
                      <div className="dh-progress-wrap">
                        <div className="dh-progress-bar">
                          <div className="dh-progress-fill" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <div className="dh-progress-info">
                          <span className="dh-progress-text">{uploadProgress < 100 ? 'Uploading...' : 'Finalizing...'}</span>
                          <span className="dh-progress-time">{uploadElapsed}s</span>
                        </div>
                      </div>
                    )}
                    <button
                      type="submit"
                      className="dh-submit-btn"
                      disabled={isUploading || selectedFiles.length === 0}
                    >
                      {isUploading ? (
                        <><Loader2 className="dh-spin" size={18} /><span>{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} · {uploadElapsed}s</span></>
                      ) : (
                        <><Upload size={18} /><span>{selectedFiles.length > 1 ? `Upload ${selectedFiles.length} Variations` : 'Initialize Production'}</span></>
                      )}
                    </button>
                  </form>
                </aside>
                <main className="dh-upload-main">
                  <div
                    className={`dh-drop-zone ${selectedFiles.length > 0 ? 'dh-has-files' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={handleFileChange} />
                    <div className="dh-drop-content">
                      <div className="dh-icon-stack">
                        <ImageIcon size={40} className="dh-icon-main" />
                        <Plus size={20} className="dh-icon-plus" />
                      </div>
                      <h3>Add Product Designs</h3>
                      <p>Drag and drop or click to browse high-res images</p>
                    </div>
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="dh-previews">
                      <div className="dh-preview-header">
                        <div className="dh-preview-title">
                          <h3>Variations</h3>
                          {selectedFiles.length > 1 && <span className="dh-count-badge">{selectedFiles.length}</span>}
                        </div>
                        <button type="button" className="dh-clear-btn" onClick={() => setSelectedFiles([])}>Clear All</button>
                      </div>
                      <div className="dh-preview-grid">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="dh-preview-card">
                            <div className="dh-preview-img">
                              <img src={file.preview} alt="preview" />
                              <button type="button" className="dh-remove-overlay" onClick={(e) => { e.stopPropagation(); removeFile(idx); }}>
                                <X size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </main>
              </div>
            </div>
          )}

          {activeTab === "requests" && (
            <div className="dh-body">
              <div className="dh-panel dh-panel-full">
                <div className="dh-requests-header">
                  <div className="dh-requests-title">
                    <PenTool size={18} />
                    <h3>Director Requests</h3>
                    <span className="dh-requests-count">{requests.length}</span>
                  </div>
                  {selectedRequestIds.length > 0 && (
                    <div className="dh-requests-bulk">
                      <span>{selectedRequestIds.length} selected</span>
                      <button onClick={() => setSelectedRequestIds([])}>Clear</button>
                    </div>
                  )}
                </div>

                <div className="dh-requests-grid">
                  {requests.length === 0 ? (
                    <div className="dh-empty dh-empty-requests">
                      <PenTool size={40} />
                      <h3>No Requests Yet</h3>
                      <p>When the Director sends you a correction or color variation request, it will appear here.</p>
                    </div>
                  ) : (
                    requests.map(req => {
                      const isSelected = selectedRequestIds.includes(req.id);
                      return (
                        <div key={req.id} className={`dh-request-card dh-req-${req.status} ${isSelected ? 'dh-req-selected' : ''}`}>
                          <div className="dh-req-top">
                            <span className="dh-req-type">{req.type === 'correction' ? 'Correction' : 'Color Variation'}</span>
                            <span className={`dh-req-status dh-rs-${req.status}`}>{req.status.replace('_', ' ')}</span>
                          </div>
                          <h4 className="dh-req-name">{req.productName}</h4>
                          <p className="dh-req-instr">{req.instructions}</p>
                          <div className="dh-req-meta">
                            <span>Created {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : ''}</span>
                          </div>
                          <div className="dh-req-actions">
                            {req.status === 'pending' && (
                              <>
                                <button className="dh-accept-btn" onClick={async () => {
                                  const { updateDesignerRequestStatus, createNotification } = await import('@/lib/actions');
                                  await updateDesignerRequestStatus(req.id, 'in_progress');
                                  setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'in_progress' } : r));
                                }}>
                                  Accept
                                </button>
                                <button className="dh-reject-btn" onClick={async () => {
                                  const { updateDesignerRequestStatus } = await import('@/lib/actions');
                                  await updateDesignerRequestStatus(req.id, 'rejected');
                                  setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
                                }}>
                                  Reject
                                </button>
                              </>
                            )}
                            {req.status === 'in_progress' && (
                              <button className="dh-complete-btn" onClick={async () => {
                                const { updateDesignerRequestStatus } = await import('@/lib/actions');
                                await updateDesignerRequestStatus(req.id, 'completed');
                                setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'completed' } : r));
                              }}>
                                Mark Completed
                              </button>
                            )}
                            {req.status === 'completed' && <span className="dh-done-badge">Completed</span>}
                            {req.status === 'rejected' && <span className="dh-done-badge dh-done-reject">Rejected</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>

      {selectedDetailProduct && (
        <div className="dh-popup-overlay" onClick={closeProductDetail}>
          <div className="dh-popup" onClick={(e) => e.stopPropagation()}>
            <div className="dh-popup-header">
              <div className="dh-popup-title-group">
                <div className="dh-popup-thumb">
                  {(() => {
                    const images = getProductImages(selectedDetailProduct);
                    const img = images[0];
                    return img ? (
                      <img src={getDisplayUrl(img.url, img.id, 100) || img.url} alt="" />
                    ) : (
                      <div className="dh-popup-thumb-ph"><ImageIcon size={20} /></div>
                    );
                  })()}
                </div>
                <div className="dh-popup-title-text">
                  <h3>{selectedDetailProduct.name}</h3>
                  <div className="dh-popup-meta">
                    <span className="dh-cat-pill">{selectedDetailProduct.category}</span>
                    <span className={`dh-status-pill ${selectedDetailProduct.status?.replace(' ', '-').toLowerCase()}`}>
                      {selectedDetailProduct.status}
                    </span>
                  </div>
                </div>
              </div>
              <button className="dh-popup-close" onClick={closeProductDetail}>
                <X size={18} />
              </button>
            </div>

            <div className="dh-popup-body">
              <div className="dh-detail-tabs">
                <button className={`dh-detail-tab ${detailTab === 'overview' ? 'active' : ''}`} onClick={() => setDetailTab('overview')}>Overview</button>
                <button className={`dh-detail-tab ${detailTab === 'timeline' ? 'active' : ''}`} onClick={() => {
                  setDetailTab('timeline');
                  (async () => {
                    const { getProductHistory } = await import('@/lib/actions');
                    const history = await getProductHistory(selectedDetailProduct.id);
                    setSelectedDetailProduct((prev: any) => prev ? { ...prev, _history: history } : prev);
                  })();
                }}>History</button>
              </div>

              {detailTab === 'overview' ? (
                <>
                  <div className="dh-popup-stats">
                    <div className="dh-popup-stat">
                      <Layers size={14} />
                      <div>
                        <strong>{selectedDetailProduct.variationCount || 1}</strong>
                        <span>Variations</span>
                      </div>
                    </div>
                    <div className="dh-popup-stat">
                      <Camera size={14} />
                      <div>
                        <strong>{(selectedDetailProduct.rawUrls || []).length}</strong>
                        <span>Raw Shots</span>
                      </div>
                    </div>
                    <div className="dh-popup-stat">
                      <Clock size={14} />
                      <div>
                        <strong>
                          {selectedDetailProduct.updatedAt?.toDate
                            ? selectedDetailProduct.updatedAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })
                            : "-"}
                        </strong>
                        <span>Last Updated</span>
                      </div>
                    </div>
                  </div>
                  <div className="dh-popup-images">
                    <h4>Variations</h4>
                    <div className="dh-popup-thumbs">
                      {getProductImages(selectedDetailProduct).map((img: any, idx: number) => (
                        <div
                          key={idx}
                          className="dh-popup-thumb-item"
                          onClick={() => { openViewer(selectedDetailProduct, idx); closeProductDetail(); }}
                        >
                          <img src={getDisplayUrl(img.url, img.id, 150) || img.url} alt="" />
                        </div>
                      ))}
                      {getProductImages(selectedDetailProduct).length === 0 && (
                        <p className="dh-popup-no-imgs">No variation images</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="dh-popup-timeline">
                  <h4>Change History</h4>
                  <div className="dh-timeline-list">
                    {(!selectedDetailProduct._history || selectedDetailProduct._history.length === 0) ? (
                      <p className="dh-timeline-empty">No history recorded yet.</p>
                    ) : (
                      selectedDetailProduct._history.map((entry: any, idx: number) => (
                        <div key={entry.id || idx} className="dh-timeline-item">
                          <div className="dh-timeline-dot" />
                          <div className="dh-timeline-content">
                            <p className="dh-timeline-field">
                              <strong>{entry.field}</strong>
                              {entry.oldValue && <span className="dh-timeline-old">"{entry.oldValue}"</span>}
                              <span className="dh-timeline-arrow">→</span>
                              {entry.newValue && <span className="dh-timeline-new">"{entry.newValue}"</span>}
                            </p>
                            <span className="dh-timeline-date">
                              {entry.changedAt?.toDate ? entry.changedAt.toDate().toLocaleString() : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="dh-popup-footer">
              <button className="dh-popup-viewer-btn" onClick={() => { openViewer(selectedDetailProduct); closeProductDetail(); }}>
                <Eye size={16} />
                <span>Open in Viewer</span>
              </button>
              <button className="dh-popup-close-btn" onClick={closeProductDetail}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* ===== ROOT & AMBIENT ===== */
        .dh-root {
          position: relative;
          max-width: 1600px;
          margin: 0 auto;
          padding: 1.8rem 2rem;
          min-height: calc(100vh - 100px);
          isolation: isolate;
        }
        .dh-ambient {
          position: fixed; inset: 0; z-index: 0;
          pointer-events: none; overflow: hidden;
        }
        .dh-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.7;
          animation: dh-drift 20s ease-in-out infinite alternate;
        }
        .dh-orb-1 {
          width: 700px; height: 700px;
          background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
          top: -200px; left: -200px;
          animation-duration: 18s;
        }
        .dh-orb-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, var(--secondary-glow) 0%, transparent 70%);
          top: -100px; right: -150px;
          animation-duration: 24s;
        }
        .dh-orb-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, var(--info-glow) 0%, transparent 70%);
          bottom: -100px; left: 40%;
          animation-duration: 30s;
        }
        @keyframes dh-drift {
          0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          33% { transform: translate(40px, -30px) scale(1.05); opacity: 1; }
          66% { transform: translate(-20px, 20px) scale(0.95); opacity: 0.8; }
          100% { transform: translate(30px, 40px) scale(1.02); opacity: 0.6; }
        }
        .dh-grid-lines {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.02) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        @keyframes dh-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: dh-fade-in 0.5s ease-out forwards; }
        @keyframes dh-slide-in {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dh-scale-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .dh-spin { animation: dh-spin 1s linear infinite; }
        @keyframes dh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ===== HEADER ===== */
        .dh-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 2rem;
          margin-bottom: 1.8rem;
          position: relative;
          z-index: 2;
        }
        .dh-header-left { flex-shrink: 0; }
        .dh-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          background: var(--primary-glow);
          color: var(--primary);
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.4rem;
          border: 1px solid rgba(99,102,241,0.25);
        }
        .dh-title {
          font-size: 1.8rem;
          font-weight: 900;
          color: var(--text-main);
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin: 0;
        }
        .dh-title-accent {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .dh-subtitle {
          font-size: 0.8rem;
          color: var(--text-dim);
          margin-top: 0.2rem;
          margin: 0.2rem 0 0 0;
        }

        /* ===== TABS ===== */
        .dh-tabs {
          display: flex;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 0.35rem;
          gap: 0.3rem;
          backdrop-filter: var(--glass);
          box-shadow: var(--shadow-md);
          flex-shrink: 0;
          overflow-x: auto;
          max-width: 100%;
        }
        .dh-tabs::-webkit-scrollbar { height: 2px; }
        .dh-tabs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        .dh-tab {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-muted);
          transition: all var(--transition-base);
          border: none;
          background: transparent;
          cursor: pointer;
          white-space: nowrap;
        }
        .dh-tab:hover { color: var(--text-main); background: var(--bg-hover); }
        .dh-tab-active {
          background: var(--bg-hover);
          color: var(--tab-color, var(--primary));
          box-shadow: 0 0 0 1px var(--border) inset, 0 4px 12px rgba(0,0,0,0.1), 0 0 20px var(--tab-glow, transparent);
        }
        .dh-tab-icon { display: flex; align-items: center; opacity: 0.7; }
        .dh-tab-active .dh-tab-icon { opacity: 1; }
        .dh-tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 10px;
          font-size: 0.65rem;
          font-weight: 800;
          background: var(--border);
          color: var(--text-muted);
          transition: all var(--transition-base);
        }
        .dh-tab-active .dh-tab-count {
          background: var(--tab-color, var(--primary));
          color: white;
        }

        /* ===== KPI STRIP ===== */
        .dh-kpi-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.85rem;
          margin-bottom: 1.8rem;
          position: relative;
          z-index: 2;
        }
        @media (max-width: 1000px) { .dh-kpi-strip { grid-template-columns: 1fr; } }
        .dh-kpi {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 1rem 1.2rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-slow);
          overflow: hidden;
          text-align: left;
          box-shadow: var(--shadow-md);
          backdrop-filter: var(--glass);
        }
        .dh-kpi::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 15% 50%, var(--kpi-glow, transparent) 0%, transparent 60%);
          opacity: 0;
          transition: opacity var(--transition-slow);
          pointer-events: none;
        }
        .dh-kpi:hover { transform: translateY(-4px); border-color: var(--kpi-color, var(--primary)); }
        .dh-kpi:hover::before, .dh-kpi-active::before { opacity: 1; }
        .dh-kpi-active {
          transform: translateY(-4px) scale(1.02);
          border-color: var(--kpi-color, var(--primary));
          box-shadow: 0 0 15px var(--kpi-glow, transparent);
        }
        .dh-kpi-dimmed { opacity: 0.5; filter: grayscale(0.5); transform: scale(0.96); pointer-events: none; }
        .dh-kpi-icon {
          width: 48px; height: 48px;
          display: flex; align-items: center; justify-content: center;
          border-radius: var(--radius-md);
          background: var(--bg-hover);
          border: 1px solid var(--border);
          color: var(--kpi-color, var(--text-muted));
          flex-shrink: 0;
          transition: all var(--transition-base);
        }
        .dh-kpi:hover .dh-kpi-icon, .dh-kpi-active .dh-kpi-icon {
          background: var(--kpi-color, var(--primary));
          color: white;
          border-color: transparent;
        }
        .dh-kpi-body { flex: 1; min-width: 0; }
        .dh-kpi-num {
          font-size: 2rem;
          font-weight: 900;
          color: var(--text-main);
          letter-spacing: -0.04em;
          line-height: 1;
          margin-bottom: 0.15rem;
        }
        .dh-kpi-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .dh-kpi-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          background: var(--border);
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
          overflow: hidden;
        }
        .dh-kpi-bar-fill {
          height: 100%;
          background: var(--kpi-color, var(--primary));
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
          transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .dh-kpi-pulse {
          position: absolute;
          top: 0.6rem; right: 0.6rem;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--kpi-color, var(--primary));
          animation: dh-pulse 1.5s ease-in-out infinite;
        }
        @keyframes dh-pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--kpi-glow); }
          50% { box-shadow: 0 0 0 8px transparent; }
        }

        /* ===== BODY & PANEL ===== */
        .dh-body {
          position: relative;
          z-index: 2;
        }
        .dh-panel {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          backdrop-filter: var(--glass);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
        }
        .dh-panel-full { padding: 1.5rem; }

        /* ===== HISTORY FILTERS ===== */
        .dh-history-filters {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.2rem;
        }
        .dh-date-presets {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
        }
        .dh-date-btn {
          padding: 0.4rem 0.9rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          background: var(--bg-hover);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .dh-date-btn:hover { color: var(--text-main); border-color: var(--primary); }
        .dh-date-btn.active {
          background: var(--primary-glow);
          color: var(--primary);
          border-color: var(--primary);
          box-shadow: 0 0 10px rgba(99,102,241,0.15);
        }
        .dh-custom-dates {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .dh-custom-dates input[type="date"] {
          padding: 0.4rem 0.6rem;
          border-radius: var(--radius-sm);
          background: var(--bg-input);
          border: 1px solid var(--border);
          color: var(--text-main);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .dh-custom-dates span { color: var(--text-dim); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }

        /* ===== CONTROLS ===== */
        .dh-controls-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.2rem;
          padding: 0.75rem 1rem;
          background: var(--bg-hover);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .dh-search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 0.75rem;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-dim);
        }
        .dh-search-box input {
          flex: 1;
          padding: 0.5rem 0;
          background: transparent;
          border: none;
          color: var(--text-main);
          font-size: 0.8rem;
          font-weight: 600;
          outline: none;
        }
        .dh-search-box input::placeholder { color: var(--text-dim); }
        .dh-filter-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .dh-filter-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.1rem 0.6rem;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-dim);
        }
        .dh-filter-item select {
          background: transparent;
          border: none;
          color: var(--text-main);
          font-weight: 700;
          font-size: 0.72rem;
          outline: none;
          cursor: pointer;
          padding: 0.4rem 0;
        }
        .dh-bulk-toggle {
          display: flex;
          align-items: center;
          padding: 0.1rem 0.5rem;
          cursor: pointer;
        }
        .dh-bulk-toggle input[type="checkbox"] {
          width: 16px; height: 16px;
          accent-color: var(--primary);
          cursor: pointer;
        }

        /* ===== BULK BAR ===== */
        .dh-bulk-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.7rem 1rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.2rem;
          border: 1px solid rgba(99,102,241,0.2);
          background: rgba(99,102,241,0.05);
          animation: dh-slide-in 0.3s ease-out;
        }
        .dh-bulk-info { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-main); }
        .dh-bulk-controls { display: flex; align-items: center; gap: 0.5rem; }
        .dh-bulk-select {
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-sm);
          background: var(--bg-input);
          border: 1px solid var(--border);
          color: var(--text-main);
          font-weight: 600;
          font-size: 0.72rem;
          cursor: pointer;
          outline: none;
        }
        .dh-bulk-clear {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          border-radius: var(--radius-sm);
          background: rgba(239,68,68,0.1);
          color: var(--danger);
          cursor: pointer;
          border: none;
          transition: all var(--transition-fast);
        }
        .dh-bulk-clear:hover { background: rgba(239,68,68,0.2); transform: rotate(90deg); }

        /* ===== PRODUCT LIST ===== */
        .dh-product-list { display: flex; flex-direction: column; gap: 2.5rem; }
        .dh-date-group { animation: dh-fade-in 0.4s ease-out both; }
        .dh-date-header {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          margin-bottom: 1rem;
          color: var(--text-muted);
        }
        .dh-date-header span {
          font-weight: 800;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          white-space: nowrap;
        }
        .dh-date-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, var(--border), transparent);
        }
        .dh-products-stack { display: flex; flex-direction: column; gap: 0.6rem; }
        .dh-product-row {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.65rem 0.8rem;
          border-radius: var(--radius-md);
          background: var(--bg-hover);
          border: 1px solid var(--border);
          transition: all var(--transition-base);
          cursor: pointer;
        }
        .dh-product-row:hover {
          transform: translateX(6px);
          border-color: var(--primary-glow);
          background: rgba(99,102,241,0.04);
        }
        .dh-row-selected {
          border-color: rgba(99,102,241,0.4);
          background: rgba(99,102,241,0.08);
          box-shadow: 0 0 15px rgba(99,102,241,0.08);
        }
        .dh-row-check {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          cursor: pointer;
        }
        .dh-row-check input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; }
        .dh-row-thumb {
          width: 64px; height: 64px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: linear-gradient(135deg, #1e293b 25%, transparent 25%) -50px 0,
                      linear-gradient(225deg, #1e293b 25%, transparent 25%) -50px 0,
                      linear-gradient(315deg, #1e293b 25%, transparent 25%),
                      linear-gradient(45deg, #1e293b 25%, transparent 25%);
          background-size: 20px 20px;
          background-color: #0f172a;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dh-row-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .dh-row-body { flex: 1; display: flex; justify-content: space-between; align-items: center; min-width: 0; }
        .dh-row-main { display: flex; align-items: center; gap: 2rem; }
        .dh-row-title { min-width: 180px; }
        .dh-row-title h4 { font-size: 0.9rem; font-weight: 800; margin: 0 0 0.15rem 0; color: var(--text-main); }
        .dh-cat-pill {
          font-size: 0.62rem;
          font-weight: 700;
          color: var(--primary);
          background: rgba(99,102,241,0.1);
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
        }
        .dh-row-meta { display: flex; align-items: center; gap: 1.2rem; }
        .dh-var-count {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          color: var(--text-dim);
          font-size: 0.72rem;
          font-weight: 600;
        }
        .dh-status-pill {
          padding: 0.35rem 0.9rem;
          border-radius: 100px;
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--bg-input);
          border: 1px solid var(--border);
          min-width: 120px;
          text-align: center;
        }
        .dh-status-pill.pending-direction { color: var(--primary); border-color: rgba(99,102,241,0.3); }
        .dh-status-pill.pending-shoot { color: var(--warning); border-color: rgba(245,158,11,0.3); }
        .dh-status-pill.pending-selection { color: #fbbf24; border-color: rgba(251,191,36,0.3); }
        .dh-status-pill.pending-edit { color: var(--info); border-color: rgba(6,182,212,0.3); }
        .dh-status-pill.pending-review { color: var(--accent); border-color: rgba(16,185,129,0.3); }
        .dh-status-pill.completed { color: #10b981; border-color: rgba(16,185,129,0.3); }
        .dh-details-btn {
          width: 36px; height: 36px;
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          color: var(--text-muted);
          border: none;
          cursor: pointer;
          transition: all var(--transition-base);
        }
        .dh-product-row:hover .dh-details-btn {
          background: var(--primary);
          color: white;
          transform: rotate(-90deg);
        }

        /* ===== EMPTY STATE ===== */
        .dh-empty {
          padding: 3rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          color: var(--text-dim);
        }
        .dh-empty h3 { font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--text-muted); }
        .dh-empty p { font-size: 0.8rem; margin: 0; max-width: 300px; }

        /* ===== UPLOAD LAYOUT ===== */
        .dh-panel-upload {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 0;
          min-height: 600px;
        }
        @media (max-width: 1000px) { .dh-panel-upload { grid-template-columns: 1fr; } }
        .dh-upload-sidebar {
          padding: 1.5rem;
          border-right: 1px solid var(--border);
          background: var(--bg-hover);
        }
        .dh-upload-form { display: flex; flex-direction: column; gap: 1.2rem; }
        .dh-form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .dh-form-group label {
          font-weight: 800;
          color: var(--text-muted);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .dh-optional { color: var(--text-dim); font-weight: 600; }
        .dh-form-group input, .dh-form-group select {
          padding: 0.8rem 1rem;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-main);
          font-size: 0.85rem;
          transition: all var(--transition-fast);
        }
        .dh-form-group input:focus, .dh-form-group select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
          outline: none;
        }
        .dh-helper { font-size: 0.68rem; color: var(--text-dim); }
        .dh-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 0.9rem;
          border-radius: var(--radius-sm);
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          color: var(--danger);
          font-size: 0.8rem;
          font-weight: 600;
        }
        .dh-progress-wrap { display:flex;flex-direction:column;gap:0.3rem;padding:0.25rem 0; }
        .dh-progress-bar { width:100%;height:4px;border-radius:4px;background:var(--border);overflow:hidden; }
        .dh-progress-fill { height:100%;border-radius:4px;background:linear-gradient(90deg,var(--primary),var(--secondary));transition:width 0.3s ease; }
        .dh-progress-info { display:flex;justify-content:space-between;align-items:center; }
        .dh-progress-text { font-size:0.65rem;font-weight:700;color:var(--text-muted); }
        .dh-progress-time { font-size:0.6rem;font-weight:700;color:var(--text-dim);font-variant-numeric:tabular-nums; }
        .dh-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 0.9rem;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          font-weight: 800;
          font-size: 0.9rem;
          border: none;
          cursor: pointer;
          transition: all var(--transition-base);
          box-shadow: 0 8px 20px rgba(99,102,241,0.25);
        }
        .dh-submit-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(99,102,241,0.35); }
        .dh-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        .dh-upload-main {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .dh-drop-zone {
          min-height: 180px;
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-base);
          background: var(--bg-input);
        }
        .dh-drop-zone:hover { border-color: var(--primary); background: rgba(99,102,241,0.03); }
        .dh-has-files { min-height: 120px; border-style: solid; border-color: rgba(99,102,241,0.3); }
        .dh-drop-content { text-align: center; }
        .dh-icon-stack { position: relative; width: 56px; height: 56px; margin: 0 auto 0.8rem; }
        .dh-icon-main { color: var(--text-dim); transition: all var(--transition-base); }
        .dh-drop-zone:hover .dh-icon-main { color: var(--primary); transform: scale(1.1); }
        .dh-icon-plus {
          position: absolute; bottom: 0; right: 0;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          padding: 3px;
          box-shadow: 0 4px 12px rgba(99,102,241,0.4);
        }
        .dh-drop-content h3 { font-size: 0.95rem; font-weight: 800; margin: 0 0 0.2rem 0; color: var(--text-main); }
        .dh-drop-content p { font-size: 0.75rem; color: var(--text-dim); margin: 0; }

        .dh-previews { flex: 1; }
        .dh-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .dh-preview-title { display: flex; align-items: center; gap: 0.5rem; }
        .dh-preview-title h3 { font-size: 0.85rem; font-weight: 800; margin: 0; color: var(--text-main); }
        .dh-count-badge {
          padding: 0.1rem 0.5rem;
          border-radius: 10px;
          background: var(--primary-glow);
          color: var(--primary);
          font-size: 0.65rem;
          font-weight: 800;
        }
        .dh-clear-btn {
          padding: 0.35rem 0.7rem;
          border-radius: var(--radius-sm);
          background: rgba(239,68,68,0.1);
          color: var(--danger);
          font-size: 0.7rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .dh-clear-btn:hover { background: rgba(239,68,68,0.2); }
        .dh-preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.8rem;
        }
        .dh-preview-card {
          aspect-ratio: 1;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border);
          position: relative;
        }
        .dh-preview-img { width: 100%; height: 100%; position: relative; }
        .dh-preview-img img { width: 100%; height: 100%; object-fit: cover; }
        .dh-remove-overlay {
          position: absolute; inset: 0;
          background: rgba(239,68,68,0.75);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: all var(--transition-fast);
          color: white; border: none; cursor: pointer; width: 100%;
        }
        .dh-preview-card:hover .dh-remove-overlay { opacity: 1; }

        /* ===== REQUESTS ===== */
        .dh-requests-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
        }
        .dh-requests-title { display: flex; align-items: center; gap: 0.6rem; }
        .dh-requests-title h3 { font-size: 1rem; font-weight: 800; margin: 0; color: var(--text-main); }
        .dh-requests-count {
          padding: 0.15rem 0.6rem;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
        }
        .dh-requests-bulk {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.4rem 0.8rem;
          background: rgba(99,102,241,0.08);
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-main);
        }
        .dh-requests-bulk button {
          color: var(--danger);
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.72rem;
        }
        .dh-requests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1rem;
        }
        .dh-request-card {
          padding: 1.2rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--bg-hover);
          transition: all var(--transition-base);
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .dh-request-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .dh-req-selected { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }
        .dh-req-in_progress { border-left: 4px solid var(--warning); }
        .dh-req-completed { border-left: 4px solid var(--accent); opacity: 0.7; }
        .dh-req-rejected { border-left: 4px solid var(--danger); opacity: 0.6; }
        .dh-req-top { display: flex; justify-content: space-between; align-items: center; }
        .dh-req-type {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          background: rgba(99,102,241,0.1);
          color: var(--primary);
        }
        .dh-req-status {
          font-size: 0.6rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0.2rem 0.7rem;
          border-radius: 12px;
        }
        .dh-rs-pending { background: rgba(245,158,11,0.15); color: var(--warning); }
        .dh-rs-in_progress { background: rgba(99,102,241,0.15); color: var(--primary); }
        .dh-rs-completed { background: rgba(16,185,129,0.15); color: var(--accent); }
        .dh-rs-rejected { background: rgba(239,68,68,0.15); color: var(--danger); }
        .dh-req-name { font-size: 0.9rem; font-weight: 800; margin: 0; color: var(--text-main); }
        .dh-req-instr { font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.5; }
        .dh-req-meta { font-size: 0.65rem; color: var(--text-dim); }
        .dh-req-actions { display: flex; gap: 0.4rem; margin-top: 0.3rem; }
        .dh-accept-btn {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          font-weight: 700;
          font-size: 0.72rem;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .dh-accept-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(99,102,241,0.3); }
        .dh-reject-btn {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--danger);
          font-weight: 700;
          font-size: 0.72rem;
          border: 1px solid rgba(239,68,68,0.3);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .dh-reject-btn:hover { background: rgba(239,68,68,0.1); }
        .dh-complete-btn {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          background: linear-gradient(135deg, var(--accent), #059669);
          color: white;
          font-weight: 700;
          font-size: 0.72rem;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .dh-complete-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16,185,129,0.3); }
        .dh-done-badge {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--accent);
          padding: 0.4rem 0;
        }
        .dh-done-reject { color: var(--danger); }
        .dh-empty-requests { grid-column: 1 / -1; }

        /* ===== POPUP ===== */
        .dh-popup-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(2, 6, 23, 0.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 2rem;
          animation: dh-fade-in 0.2s ease-out;
        }
        .dh-popup {
          width: 100%; max-width: 520px; max-height: 90vh;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(20, 30, 50, 0.96));
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          display: flex; flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-xl);
          animation: dh-scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dh-popup-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 1.2rem;
          border-bottom: 1px solid var(--border);
          gap: 0.8rem;
        }
        .dh-popup-title-group { display: flex; gap: 0.8rem; align-items: center; flex: 1; min-width: 0; }
        .dh-popup-thumb {
          width: 48px; height: 48px; border-radius: var(--radius-sm);
          overflow: hidden;
          background: rgba(0,0,0,0.3);
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .dh-popup-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .dh-popup-thumb-ph { color: var(--text-dim); }
        .dh-popup-title-text { min-width: 0; }
        .dh-popup-title-text h3 {
          font-size: 1rem; font-weight: 800;
          color: var(--text-main);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin: 0 0 0.2rem 0;
        }
        .dh-popup-meta { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
        .dh-popup-meta .dh-cat-pill { font-size: 0.6rem; }
        .dh-popup-meta .dh-status-pill { font-size: 0.6rem; padding: 0.15rem 0.5rem; min-width: auto; }
        .dh-popup-close {
          width: 32px; height: 32px; border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-input);
          border: 1px solid var(--border);
          color: var(--text-muted);
          transition: all var(--transition-fast);
          flex-shrink: 0;
          cursor: pointer;
        }
        .dh-popup-close:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: var(--danger); }
        .dh-popup-body {
          flex: 1; overflow-y: auto; padding: 1.2rem;
          display: flex; flex-direction: column; gap: 1.2rem;
        }
        .dh-popup-body::-webkit-scrollbar { width: 4px; }
        .dh-popup-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .dh-detail-tabs {
          display: flex;
          gap: 0.3rem;
          padding: 2px;
          background: rgba(0,0,0,0.2);
          border-radius: var(--radius-sm);
        }
        .dh-detail-tab {
          flex: 1;
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          transition: all var(--transition-base);
          border: none;
          background: none;
          cursor: pointer;
        }
        .dh-detail-tab.active {
          background: rgba(99,102,241,0.15);
          color: var(--primary);
          box-shadow: 0 0 8px rgba(99,102,241,0.1);
        }
        .dh-popup-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.6rem;
        }
        .dh-popup-stat {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem;
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .dh-popup-stat svg { color: var(--primary); flex-shrink: 0; }
        .dh-popup-stat strong { font-size: 0.9rem; font-weight: 900; color: var(--text-main); display: block; line-height: 1.2; }
        .dh-popup-stat span { font-size: 0.55rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.03em; }
        .dh-popup-images h4 {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0 0 0.6rem 0;
        }
        .dh-popup-thumbs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .dh-popup-thumb-item {
          width: 72px; height: 72px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .dh-popup-thumb-item:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99,102,241,0.15); }
        .dh-popup-thumb-item img { width: 100%; height: 100%; object-fit: cover; }
        .dh-popup-no-imgs { font-size: 0.75rem; color: var(--text-dim); padding: 0.3rem 0; }
        .dh-popup-timeline h4 {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0 0 0.8rem 0;
        }
        .dh-timeline-list { display: flex; flex-direction: column; gap: 0; }
        .dh-timeline-item {
          display: flex;
          gap: 0.8rem;
          padding: 0.6rem 0;
          border-left: 2px solid var(--border);
          padding-left: 1.2rem;
          position: relative;
        }
        .dh-timeline-dot {
          position: absolute;
          left: -5px;
          top: 0.8rem;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 8px rgba(99,102,241,0.5);
        }
        .dh-timeline-content { flex: 1; }
        .dh-timeline-field {
          font-size: 0.78rem;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
          color: var(--text-main);
        }
        .dh-timeline-old { color: var(--danger); text-decoration: line-through; font-size: 0.72rem; }
        .dh-timeline-arrow { color: var(--text-dim); font-size: 0.72rem; }
        .dh-timeline-new { color: var(--accent); font-size: 0.72rem; }
        .dh-timeline-date { font-size: 0.65rem; color: var(--text-dim); }
        .dh-timeline-empty { text-align: center; color: var(--text-dim); padding: 1.5rem; font-size: 0.78rem; }
        .dh-popup-footer {
          display: flex;
          gap: 0.6rem;
          padding: 0.8rem 1.2rem;
          border-top: 1px solid var(--border);
          background: rgba(0,0,0,0.15);
        }
        .dh-popup-viewer-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: var(--radius-sm);
          color: white;
          font-weight: 700;
          font-size: 0.78rem;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .dh-popup-viewer-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(99,102,241,0.3); }
        .dh-popup-close-btn {
          padding: 0.6rem 1.2rem;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .dh-popup-close-btn:hover { color: var(--text-main); background: var(--bg-hover); }

        @media (max-width: 768px) {
          .dh-root { padding: 1rem 1rem 1.5rem; padding-top: 0; }
          .dh-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .dh-header-left h1 { font-size: 1.3rem; }
          .dh-tabs { gap: 0.3rem; max-width: 100%; }
          .dh-tabs button { font-size: 0.7rem; padding: 0.4rem 0.7rem; }
          .dh-kpi-strip { grid-template-columns: repeat(2,1fr); gap: 0.5rem; }
          .dh-kpi-card { padding: 0.7rem; }
          .dh-kpi-value { font-size: 1.2rem; }
          .dh-kpi-label { font-size: 0.6rem; }
          .dh-panel-upload { grid-template-columns: 1fr; min-height: auto; }
          .dh-upload-sidebar { border-right: none; border-bottom: 1px solid var(--border); padding: 1rem; }
          .dh-controls-bar { flex-wrap: wrap; gap: 0.5rem; }
          .dh-search-box { width: 100%; }
          .dh-product-row { flex-direction: column; align-items: flex-start; gap: 0.5rem; padding: 0.8rem; }
          .dh-row-thumb { width: 60px; height: 60px; }
          .dh-row-main { flex-wrap: wrap; gap: 0.5rem; }
          .dh-row-title { min-width: auto; }
          .dh-product-name { font-size: 0.8rem; }
          .dh-requests-grid { grid-template-columns: 1fr; }
          .dh-popup { width: 95%; max-height: 95vh; border-radius: var(--radius-lg); margin: 0.5rem; }
          .dh-popup-content { padding: 1rem; }
          .dh-popup-preview-grid { grid-template-columns: repeat(auto-fill,minmax(80px,1fr)); }
          .dh-popup-header h2 { font-size: 1.1rem; }
          .dh-detail-section { padding: 1rem; }
          .dh-filter-group { justify-content: space-between; }
        }

        @media (max-width: 480px) {
          .dh-root { padding: 0.75rem 0.75rem 1.5rem; padding-top: 0; }
          .dh-kpi-strip { grid-template-columns: 1fr; }
          .dh-panel-upload { gap: 0.5rem; }
          .dh-requests-grid { gap: 0.5rem; }
          .dh-request-card { padding: 0.8rem; }
          .dh-popup-stats { grid-template-columns: 1fr 1fr; }
          .dh-popup-footer { flex-direction: column; gap: 0.5rem; }
          .dh-popup-viewer-btn,
          .dh-popup-close-btn { width: 100%; justify-content: center; }
          .dh-filter-select { font-size: 0.7rem; padding: 0.3rem 0.5rem; }
        }
      `}</style>
    </RoleGuard>
  );
}
