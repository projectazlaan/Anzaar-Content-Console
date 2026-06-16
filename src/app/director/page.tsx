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
  submitBulkDirections,
  submitSelection,
  approveProduct,
  submitBulkStatusUpdate,
  createNotification,
  getDesignerRequests,
  getProductHistory,
  getMasterTemplates
} from "@/lib/actions";
import { getDisplayUrl } from "@/lib/utils";
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Send, 
  X,
  ChevronLeft,
  CheckSquare,
  Square,
  Layers,
  Loader2,
  Camera,
  PenTool,
  Zap,
  Film,
  Target,
  Sparkles,
  ArrowRight,
  Star,
  CheckCircle2,
  Clock,
  Activity,
  RotateCcw
} from "lucide-react";
import { useImageViewer } from "@/components/ImageViewerProvider";
import { useToast } from "@/components/ToastProvider";

export default function DirectorPage() {
  const [activeTab, setActiveTab] = useState("directions");
  const { openViewer } = useImageViewer();
  const { showToast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [presets, setPresets] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [shootDir, setShootDir] = useState("");
  const [editDir, setEditDir] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showDesignerRequestForm, setShowDesignerRequestForm] = useState(false);
  const [designerRequestType, setDesignerRequestType] = useState<'correction' | 'color_variation'>('correction');
  const [designerRequestInstructions, setDesignerRequestInstructions] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Designer Requests tracking
  const [designerRequests, setDesignerRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  // Product History
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Master Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  
  // File Manager State
  const [fileManagerView, setFileManagerView] = useState<"grid" | "folder">("grid");
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Map<string, 'three-quarter' | 'half' | 'full'>>(new Map());
  const [fileManagerBreadcrumb, setFileManagerBreadcrumb] = useState<string[]>([]);

  // Toggle Selection
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const currentIds = filteredProducts.map(p => p.id);
    if (selectedIds.length === currentIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentIds);
    }
  };

  const openImageViewer = (product: any, index = 0) => {
    openViewer(product, index);
  };

  // Real-time products listener
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Fetch Presets & Master Templates
  useEffect(() => {
    import("@/lib/actions").then(({ getInstructionPresets }) => 
      getInstructionPresets().then(data => setPresets(data.map((p: any) => p.text)))
    );
    getMasterTemplates().then(data => setTemplates(data || [])).catch(() => {});
  }, []);

  // Designer Requests Subscription
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "designer_requests"), orderBy("createdAt", "desc")),
      (snap) => setDesignerRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  // Fetch Product History when product selected
  useEffect(() => {
    if (selectedProduct?.id) {
      getProductHistory(selectedProduct.id).then(data => setProductHistory(data || [])).catch(() => {});
    } else {
      setProductHistory([]);
    }
  }, [selectedProduct?.id]);

  const applyPreset = (text: string, target: 'shoot' | 'edit') => {
    const current = target === 'shoot' ? shootDir : editDir;
    const setter = target === 'shoot' ? setShootDir : setEditDir;

    if (current.toLowerCase().includes(text.toLowerCase())) {
      const regex = new RegExp(`(^|\\n)?${text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(\\n|$)`, 'i');
      setter(prev => prev.replace(regex, '\n').trim());
    } else {
      setter(prev => prev ? `${prev}\n${text}` : text);
    }
  };

  const insertTemplate = (value: string, target: 'shoot' | 'edit') => {
    const current = target === 'shoot' ? shootDir : editDir;
    const setter = target === 'shoot' ? setShootDir : setEditDir;

    if (current.toLowerCase().includes(value.toLowerCase())) {
      const regex = new RegExp(`(^|\\n)?${value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(\\n|$)`, 'i');
      setter(prev => prev.replace(regex, '\n').trim());
    } else {
      setter(prev => prev ? `${prev}\n${value}` : value);
    }
  };

  const handleSendDirection = async () => {
    setIsSending(true);
    try {
      let result;
      
      if (selectedIds.length > 0) {
        if (activeTab === "directions") {
          if (!shootDir && !editDir) {
            showToast({ type: 'warning', title: 'Missing Direction', description: 'Please fill in at least one direction (Shoot or Edit)' });
            setIsSending(false);
            return;
          }
          result = await submitBulkDirections(selectedIds, shootDir, editDir);
        } else if (activeTab === "selections") {
          result = await submitBulkStatusUpdate(selectedIds, "Pending Edit");
        } else if (activeTab === "reviews") {
          result = await submitBulkStatusUpdate(selectedIds, "Completed");
        }
      } else if (selectedProduct || (selectedFolder && activeTab === "directions")) {
        const product = selectedProduct || selectedFolder;
        if (activeTab === "directions") {
          if (!shootDir && !editDir) {
            showToast({ type: 'warning', title: 'Missing Direction', description: 'Please fill in at least one direction (Shoot or Edit)' });
            setIsSending(false);
            return;
          }
          result = await submitDirection(product.id, shootDir, editDir);
        } else if (activeTab === "selections") {
          const assets: Record<string, 'three-quarter' | 'half' | 'full'> = {};
          (selectedProduct.rawUrls || []).forEach((url: string) => { assets[url] = 'full'; });
          result = await submitSelection(selectedProduct.id, assets);
        } else if (activeTab === "reviews") {
          result = await approveProduct(selectedProduct.id);
        }
      }

      if (result?.success) {
        // Create notifications
        try {
          const product = selectedProduct || selectedFolder;
          const targetIds = selectedIds.length > 0 ? selectedIds : [product?.id].filter(Boolean);
          const noteTarget = activeTab === "directions" ? "shooter" : activeTab === "selections" ? "editor" : "designer";
          for (const pid of targetIds) {
            await createNotification({
              userId: `role:${noteTarget}`,
              title: `New ${activeTab} action`,
              message: `Director sent ${activeTab === "directions" ? "shoot/edit directions" : activeTab === "selections" ? "photos for selection" : "product for review"} for a product.`,
              type: 'info',
              link: `/director?product=${pid}`
            });
          }
        } catch (e) { /* notification is non-critical */ }
        setSelectedIds([]);
        setSelectedProduct(null);
        setSelectedFolder(null);
        setShootDir("");
        setEditDir("");
        showToast({ type: 'success', title: 'Sent Successfully!', description: activeTab === "directions" ? 'Directions sent to Shooter' : activeTab === "selections" ? 'Photos sent to Editor' : 'Product marked as Completed' });
      } else if (result) {
        showToast({ type: 'error', title: 'Send Failed', description: result.error });
      }
    } catch (error: any) {
      showToast({ type: 'error', title: 'System Error', description: error.message });
    } finally {
      setIsSending(false);
    }
  };

  const counts = {
    directions: products.filter(p => p.status === 'Pending Direction').length,
    shooting: products.filter(p => p.status === 'Pending Shoot').length,
    selections: products.filter(p => p.status === 'Pending Selection').length,
    editing: products.filter(p => p.status === 'Pending Edit').length,
    reviews: products.filter(p => p.status === 'Pending Review').length,
    completed: products.filter(p => p.status === 'Completed').length,
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setSelectedIds([]);
    if (tab === "selections" || tab === "directions" || tab === "shooting" || tab === "editing") {
      setSelectedFolder(null);
      setSelectedPhotos(new Map());
      setFileManagerBreadcrumb([]);
    }
  };

  // File Manager Functions
  const openFolder = (product: any) => {
    setSelectedFolder(product);
    setFileManagerBreadcrumb([product.name]);
    setSelectedPhotos(new Map());
  };

  const goBack = () => {
    setSelectedFolder(null);
    setSelectedPhotos(new Map());
    setFileManagerBreadcrumb([]);
  };

  const selectCropRatio = (photoUrl: string, ratio: 'three-quarter' | 'half' | 'full') => {
    setSelectedPhotos(prev => {
      const newMap = new Map(prev);
      if (newMap.get(photoUrl) === ratio) {
        newMap.delete(photoUrl);
      } else {
        newMap.set(photoUrl, ratio);
      }
      return newMap;
    });
  };

  const selectAllWithRatio = (ratio: 'three-quarter' | 'half' | 'full') => {
    if (!selectedFolder) return;
    const allPhotos = selectedFolder.rawUrls || [];
    const newMap = new Map<string, 'three-quarter' | 'half' | 'full'>();
    allPhotos.forEach((url: string) => newMap.set(url, ratio));
    setSelectedPhotos(newMap);
  };

  const clearSelections = () => {
    setSelectedPhotos(new Map());
  };

  const sendToEditing = async () => {
    if (!selectedFolder || selectedPhotos.size === 0) {
      showToast({ type: 'warning', title: 'No Photo Selected', description: 'Please select at least one photo' });
      return;
    }

    setIsSending(true);
    try {
      const selectedAssets: Record<string, 'three-quarter' | 'half' | 'full'> = {};
      selectedPhotos.forEach((ratio, url) => {
        selectedAssets[url] = ratio;
      });
      
      const result = await submitSelection(selectedFolder.id, selectedAssets);
      if (result?.success) {
        setSelectedPhotos(new Map());
        setSelectedFolder(null);
        setFileManagerBreadcrumb([]);
        showToast({ type: 'success', title: 'Sent Successfully!', description: 'Photos sent to Editor' });
      } else if (result) {
        showToast({ type: 'error', title: 'Send Failed', description: result.error });
      }
    } catch (error: any) {
      showToast({ type: 'error', title: 'System Error', description: error.message });
    } finally {
      setIsSending(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (activeTab === "directions") return p.status === "Pending Direction";
    if (activeTab === "shooting") return p.status === "Pending Shoot";
    if (activeTab === "selections") return p.status === "Pending Selection";
    if (activeTab === "editing") return p.status === "Pending Edit";
    if (activeTab === "reviews") return p.status === "Pending Review";
    if (activeTab === "completed") return p.status === "Completed";
    if (activeTab === "all") return true;
    return true;
  }).filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q);
  });

  const tabConfig: Record<string, { label: string, color: string, glow: string, icon: any }> = {
    directions: { label: "To Direct", color: "#818cf8", glow: "rgba(99,102,241,0.35)", icon: <Film size={14} /> },
    shooting: { label: "Shooting", color: "#f59e0b", glow: "rgba(245,158,11,0.35)", icon: <Camera size={14} /> },
    selections: { label: "To Select", color: "#fbbf24", glow: "rgba(245,158,11,0.35)", icon: <Target size={14} /> },
    editing: { label: "Editing", color: "#06b6d4", glow: "rgba(6,182,212,0.35)", icon: <Activity size={14} /> },
    reviews: { label: "Review", color: "#34d399", glow: "rgba(16,185,129,0.35)", icon: <Star size={14} /> },
    completed: { label: "Completed", color: "#10b981", glow: "rgba(16,185,129,0.35)", icon: <CheckCircle2 size={14} /> },
    all: { label: "All", color: "#94a3b8", glow: "rgba(148,163,184,0.35)", icon: <Layers size={14} /> },
  };

  return (
    <RoleGuard allowedRoles={["director"]}>
      <DashboardLayout>
        <div className="dc-root">
          {/* Ambient Background */}
          <div className="dc-ambient" aria-hidden="true">
            <div className="amb-orb amb-orb-1" />
            <div className="amb-orb amb-orb-2" />
            <div className="amb-orb amb-orb-3" />
            <div className="dc-grid-lines" />
          </div>

          {/* ── Page Header ── */}
          <header className="dc-header">
            <div className="dc-header-left">
              <div className="dc-badge">
                <Zap size={11} />
                <span>Live Production</span>
              </div>
              <h1 className="dc-title">
                <span className="dc-title-accent">Director</span> Control Center
              </h1>
              <p className="dc-subtitle">Manage production flow · Deliver precise directions · Approve final output</p>
            </div>

            {/* Tab Switcher */}
            <div className="dc-tabs">
              {Object.entries(tabConfig).map(([key, cfg]) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    className={`dc-tab ${isActive ? "dc-tab-active" : ""}`}
                    style={isActive ? { "--tab-color": cfg.color, "--tab-glow": cfg.glow } as React.CSSProperties : {}}
                    onClick={() => handleTabClick(key)}
                  >
                    <span className="dc-tab-icon">{cfg.icon}</span>
                    <span>{cfg.label}</span>
                    <span className="dc-tab-count">{counts[key as keyof typeof counts] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </header>

          {/* ── KPI Strip ── */}
          <section className="dc-kpi-strip">
            {([
              { tab: "directions", label: "Pending Direction", icon: <Film size={22} />, color: "#818cf8", glow: "rgba(99,102,241,0.2)", count: counts.directions },
              { tab: "shooting",   label: "Pending Shoot",     icon: <Camera size={22} />, color: "#f59e0b", glow: "rgba(245,158,11,0.18)", count: counts.shooting },
              { tab: "selections", label: "Pending Selection",  icon: <Target size={22} />, color: "#fbbf24", glow: "rgba(245,158,11,0.18)", count: counts.selections },
              { tab: "editing",    label: "Pending Edit",       icon: <Activity size={22} />, color: "#06b6d4", glow: "rgba(6,182,212,0.18)", count: counts.editing },
              { tab: "reviews",    label: "Pending Review",     icon: <Star size={22} />,   color: "#34d399", glow: "rgba(16,185,129,0.18)", count: counts.reviews },
              { tab: "completed",  label: "Completed",          icon: <CheckCircle2 size={22} />, color: "#10b981", glow: "rgba(16,185,129,0.18)", count: counts.completed },
            ] as const).map(({ tab, label, icon, color, glow, count }) => (
              <button
                key={tab}
                className={`dc-kpi ${activeTab === tab ? "dc-kpi-active" : ""}`}
                style={{ "--kpi-color": color, "--kpi-glow": glow } as React.CSSProperties}
                onClick={() => handleTabClick(tab as any)}
              >
                <div className="dc-kpi-icon">{icon}</div>
                <div className="dc-kpi-body">
                  <span className="dc-kpi-num">{count}</span>
                  <span className="dc-kpi-label">{label}</span>
                </div>
                <div className="dc-kpi-bar">
                  <div className="dc-kpi-bar-fill" style={{ width: `${Math.min(100, count * 20)}%` }} />
                </div>
                {activeTab === tab && <div className="dc-kpi-pulse" />}
              </button>
            ))}
          </section>

          {/* ── Main Content ── */}
          <div className="dc-body">

            {/* LEFT: Product Browser */}
            <div className="dc-panel dc-panel-left">
              <div className="dc-panel-inner">

                {/* File Manager for most tabs */}
                {(activeTab === "selections" || activeTab === "directions" || activeTab === "shooting" || activeTab === "editing") ? (
                  <div className="dc-fm">
                    {/* FM Header */}
                    <div className="dc-fm-header">
                      <div className="dc-breadcrumb">
                        {selectedFolder ? (
                          <>
                            <button className="dc-back-btn" onClick={goBack}>
                              <ChevronLeft size={16} />
                            </button>
                            <span className="dc-bc-item" onClick={goBack}>Products</span>
                            <ChevronRight size={13} className="dc-bc-sep" />
                            <span className="dc-bc-item dc-bc-active">{selectedFolder.name}</span>
                          </>
                        ) : (
                          <span className="dc-bc-item dc-bc-active">
                            {activeTab === "directions" ? "Pending Direction" : "Pending Selection"}
                            <span className="dc-bc-pill">{filteredProducts.length}</span>
                          </span>
                        )}
                      </div>
                      {!selectedFolder && (
                        <div className="dc-fm-view-toggle">
                          <button className="dc-icon-btn dc-icon-btn-active"><Layers size={15} /></button>
                        </div>
                      )}
                    </div>

                    {/* FM Content */}
                    {!selectedFolder ? (
                      <div className="dc-folder-grid">
                        {filteredProducts.map((product) => {
                          const thumbnailUrl = getDisplayUrl(product.thumbnailUrl) || getDisplayUrl(product.mainDesignUrl || product.designUrl, product.mainDesignId || product.designId);
                          const photoCount = (product.rawUrls || []).length || (product.variations || []).length || 1;
                          return (
                            <div key={product.id} className="dc-folder-card" onClick={() => openFolder(product)}>
                              <div className="dc-folder-thumb">
                                {thumbnailUrl ? (
                                  <img src={thumbnailUrl} alt={product.name} />
                                ) : (
                                  <div className="dc-folder-placeholder">{product.name?.charAt(0)}</div>
                                )}
                                <div className="dc-folder-overlay">
                                  <ChevronRight size={20} />
                                </div>
                              </div>
                              <div className="dc-folder-info">
                                <h4>{product.name}</h4>
                                <div className="dc-folder-meta">
                                  <Camera size={11} />
                                  <span>{photoCount} photo{photoCount > 1 ? 's' : ''}</span>
                                  <span className="dc-dot" />
                                  <span>{product.category}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {filteredProducts.length === 0 && (
                          <div className="dc-empty">
                            <div className="dc-empty-icon"><Film size={40} /></div>
                            <p>No products {activeTab === "directions" ? "pending direction" : "pending selection"}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="dc-photo-view">
                        {/* Selection Toolbar */}
                        {activeTab === "selections" && (selectedFolder.rawUrls || []).length > 0 && (
                          <div className="dc-sel-toolbar">
                            <button className="dc-sel-btn" onClick={() => selectAllWithRatio('full')}>
                              <CheckSquare size={14} /> Select All Full
                            </button>
                            <button className="dc-sel-btn" onClick={() => selectAllWithRatio('three-quarter')}>
                              <CheckSquare size={14} /> All 3/4
                            </button>
                            {selectedPhotos.size > 0 && (
                              <button className="dc-sel-btn dc-sel-btn-danger" onClick={clearSelections}>
                                <X size={14} /> Clear ({selectedPhotos.size})
                              </button>
                            )}
                          </div>
                        )}

                        {/* Photos Grid */}
                        <div className="dc-photos-grid">
                          {(() => {
                            const imagesToShow = activeTab === "directions"
                              ? (selectedFolder.variations && selectedFolder.variations.length > 0
                                  ? selectedFolder.variations.map((v: any) => v.url || v)
                                  : [selectedFolder.mainDesignUrl || selectedFolder.designUrl].filter(Boolean))
                              : (selectedFolder.rawUrls || []);

                            return imagesToShow.map((photoUrl: string, idx: number) => {
                              const displayUrl = getDisplayUrl(photoUrl);
                              const selectedRatio = selectedPhotos.get(photoUrl);

                              return (
                                <div key={idx} className={`dc-photo-card ${activeTab === "selections" && selectedRatio ? 'dc-photo-selected' : ''}`}>
                                  {activeTab === "selections" && (
                                    <div className="dc-crop-selector" onClick={(e) => e.stopPropagation()}>
                                      {(['three-quarter', 'half', 'full'] as const).map(ratio => (
                                        <button
                                          key={ratio}
                                          className={`dc-crop-btn ${selectedRatio === ratio ? 'dc-crop-active' : ''}`}
                                          onClick={() => selectCropRatio(photoUrl, ratio)}
                                        >
                                          {ratio === 'three-quarter' ? '¾' : ratio === 'half' ? '½' : '1:1'}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {activeTab === "selections" && selectedRatio && (
                                    <div className="dc-ratio-badge">
                                      {selectedRatio === 'three-quarter' ? '3/4' : selectedRatio === 'half' ? '1/2' : 'Full'}
                                    </div>
                                  )}
                                  {displayUrl ? (
                                    <img
                                      src={displayUrl}
                                      alt={`Photo ${idx + 1}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const variations = imagesToShow.map((url: string, i: number) => ({
                                          url,
                                          id: typeof url === 'string' && url.length > 20 ? url.match(/[-\w]{25,}/)?.[0] : `photo-${i}`
                                        }));
                                        openViewer({ name: selectedFolder.name, variations }, idx);
                                      }}
                                    />
                                  ) : (
                                    <div className="dc-photo-placeholder">{idx + 1}</div>
                                  )}
                                  <div className="dc-photo-num">#{idx + 1}</div>
                                </div>
                              );
                            });
                          })()}
                          {(() => {
                            const imagesToShow = activeTab === "directions"
                              ? (selectedFolder.variations && selectedFolder.variations.length > 0
                                  ? selectedFolder.variations
                                  : [selectedFolder.mainDesignUrl || selectedFolder.designUrl].filter(Boolean))
                              : (selectedFolder.rawUrls || []);
                            return imagesToShow.length === 0 && (
                              <div className="dc-empty dc-empty-inline">
                                <Camera size={32} />
                                <p>No photos available</p>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Send / Back Bar */}
                        {activeTab === "selections" && selectedPhotos.size > 0 && (
                          <div className="dc-action-bar dc-action-bar-send">
                            <div className="dc-action-bar-info">
                              <Camera size={18} />
                              <span>Send <strong>{selectedPhotos.size}</strong> photo{selectedPhotos.size > 1 ? 's' : ''} to Editor</span>
                            </div>
                            <button className="dc-action-btn" onClick={sendToEditing} disabled={isSending}>
                              {isSending ? <Loader2 className="dc-spin" size={16} /> : <Send size={16} />}
                              <span>{isSending ? "Sending…" : "Send to Editor"}</span>
                            </button>
                          </div>
                        )}
                        {activeTab === "directions" && (
                          <div className="dc-action-bar dc-action-bar-back">
                            <div className="dc-action-bar-info">
                              <Film size={18} />
                              <span>Viewing <strong>
                                {(selectedFolder.variations && selectedFolder.variations.length > 0 ? selectedFolder.variations : [selectedFolder.mainDesignUrl || selectedFolder.designUrl].filter(Boolean)).length}
                              </strong> design{(selectedFolder.variations || [selectedFolder.mainDesignUrl]).filter(Boolean).length > 1 ? 's' : ''}</span>
                            </div>
                            <button className="dc-action-btn dc-action-btn-ghost" onClick={goBack}>
                              <ChevronLeft size={16} />
                              <span>Back to Products</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Reviews List View */
                  <div className="dc-list-view">
                    <div className="dc-list-header">
                      <div className="dc-search">
                        <Search size={15} />
                        <input type="text" placeholder="Search products…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                      </div>
                      <div className="dc-list-actions">
                        <button className={`dc-icon-btn ${selectedIds.length > 0 ? 'dc-icon-btn-active' : ''}`} onClick={selectAll}>
                          {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <button className="dc-icon-btn"><Filter size={16} /></button>
                      </div>
                    </div>

                    {selectedIds.length > 0 && (
                      <div className="dc-bulk-bar">
                        <div className="dc-bulk-info">
                          <Layers size={16} />
                          <span>Applying to <strong>{selectedIds.length}</strong> products</span>
                        </div>
                        <button className="dc-bulk-cancel" onClick={() => setSelectedIds([])}>
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    )}

                    <div className="dc-product-list">
                      {filteredProducts.map((product) => {
                        const thumbnailUrl = getDisplayUrl(product.thumbnailUrl) || getDisplayUrl(product.mainDesignUrl || product.designUrl, product.mainDesignId || product.designId);
                        const isSelected = selectedIds.includes(product.id);
                        const hasVariations = product.variations && product.variations.length > 1;

                        return (
                          <div
                            key={product.id}
                            className={`dc-product-row ${selectedProduct?.id === product.id ? 'dc-product-active' : ''} ${isSelected ? 'dc-product-marked' : ''}`}
                            onClick={() => setSelectedProduct(product)}
                          >
                            <div className="dc-product-check" onClick={(e) => toggleSelect(product.id, e)}>
                              {isSelected ? <CheckSquare size={17} className="dc-check-icon-active" /> : <Square size={17} />}
                            </div>
                            <div className="dc-product-thumbs" onClick={(e) => { e.stopPropagation(); openImageViewer(product); }}>
                              <div className="dc-product-thumb">
                                {thumbnailUrl ? (
                                  <img src={thumbnailUrl} alt={product.name} onError={(e) => {
                                    const t = e.target as HTMLImageElement;
                                    t.style.display = 'none';
                                    const ph = t.parentElement?.querySelector('.dc-thumb-ph') as HTMLElement;
                                    if (ph) ph.style.display = 'flex';
                                  }} />
                                ) : null}
                                <div className="dc-thumb-ph" style={{ display: thumbnailUrl ? 'none' : 'flex' }}>{product.name?.charAt(0)}</div>
                              </div>
                              {hasVariations && (
                                <div className="dc-var-stack">
                                  {product.variations.slice(1, 4).map((variation: any, idx: number) => {
                                    const varUrl = getDisplayUrl(variation.url, variation.id, 100);
                                    return (
                                      <div key={idx} className="dc-var-thumb" style={{ '--var-idx': idx } as React.CSSProperties}>
                                        {varUrl ? <img src={varUrl} alt={`v${idx + 2}`} /> : <span>{idx + 2}</span>}
                                      </div>
                                    );
                                  })}
                                  {product.variations.length > 4 && (
                                    <div className="dc-var-more">+{product.variations.length - 4}</div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="dc-product-info">
                              <div className="dc-product-name">
                                {product.name}
                                {hasVariations && <span className="dc-var-badge">{product.variations.length}</span>}
                              </div>
                              <div className="dc-product-meta">
                                <span>{product.category}</span>
                                <span className="dc-dot" />
                                <span>{product.createdAt?.toDate ? product.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                              </div>
                            </div>
                            <ArrowRight size={15} className="dc-row-arrow" />
                          </div>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <div className="dc-empty">
                          <div className="dc-empty-icon"><Star size={36} /></div>
                          <p>No products in this stage</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Direction Panel */}
            <aside className="dc-command-panel">
              {(selectedProduct || selectedIds.length > 0 || (selectedFolder && activeTab === "directions")) ? (
                <div className="dc-command-form">
                  {/* Command Header */}
                  <div className="dc-cmd-header">
                    {!selectedIds.length && selectedFolder && activeTab === "directions" ? (
                      <div className="dc-cmd-preview" onClick={() => {
                        const variations = (selectedFolder.rawUrls || []).map((url: string, i: number) => ({
                          url,
                          id: url.match(/[-\w]{25,}/)?.[0] || `photo-${i}`
                        }));
                        openViewer({ name: selectedFolder.name, variations });
                      }}>
                        <img
                          src={getDisplayUrl((selectedFolder.rawUrls || [])[0]) || getDisplayUrl(selectedFolder.thumbnailUrl) || getDisplayUrl(selectedFolder.mainDesignUrl || selectedFolder.designUrl, selectedFolder.mainDesignId || selectedFolder.designId) || ''}
                          alt={selectedFolder.name}
                        />
                        <div className="dc-cmd-preview-overlay"><Sparkles size={18} /></div>
                        {(selectedFolder.rawUrls || []).length > 0 && (
                          <div className="dc-preview-count-badge">
                            {(selectedFolder.rawUrls || []).length} Photo{(selectedFolder.rawUrls || []).length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    ) : !selectedIds.length && selectedProduct && (
                      <div className="dc-cmd-preview" onClick={() => openImageViewer(selectedProduct)}>
                        <img
                          src={getDisplayUrl(selectedProduct.mainDesignUrl || selectedProduct.designUrl, (selectedProduct.mainDesignId || selectedProduct.designId) as string | undefined, 400) || ''}
                          alt={selectedProduct.name}
                        />
                        <div className="dc-cmd-preview-overlay"><Sparkles size={18} /></div>
                        {selectedProduct.variations && selectedProduct.variations.length > 1 && (
                          <div className="dc-preview-count-badge">
                            {selectedProduct.variations.length} Variations
                          </div>
                        )}
                      </div>
                    )}
                    <div className="dc-cmd-title-block">
                      <h2 className="dc-cmd-title">
                        {selectedIds.length > 0
                          ? `${selectedIds.length} Products`
                          : selectedFolder && activeTab === "directions"
                            ? selectedFolder.name
                            : selectedProduct?.name}
                      </h2>
                      {selectedIds.length === 0 && (
                        <span className="dc-cmd-category">
                          {selectedFolder && activeTab === "directions"
                            ? selectedFolder.category
                            : selectedProduct?.category}
                        </span>
                      )}
                      {selectedIds.length > 0 && (
                        <span className="dc-cmd-category">Bulk operation · {selectedIds.length} items</span>
                      )}
                    </div>
                  </div>

                  <div className="dc-cmd-divider" />

                  {showDesignerRequestForm ? (
                    <div className="dc-designer-request-form">
                      <div className="dc-cmd-section-head" style={{ marginBottom: '0.8rem' }}>
                        <PenTool size={13} />
                        <span>Request Designer Action</span>
                      </div>
                      
                      <div className="dc-request-types">
                        <button
                          className={`dc-request-type-btn ${designerRequestType === 'correction' ? 'dc-request-type-active' : ''}`}
                          onClick={() => setDesignerRequestType('correction')}
                        >
                          Correction Request
                        </button>
                        <button
                          className={`dc-request-type-btn ${designerRequestType === 'color_variation' ? 'dc-request-type-active' : ''}`}
                          onClick={() => setDesignerRequestType('color_variation')}
                        >
                          Color Variation
                        </button>
                      </div>

                      <div className="dc-cmd-section" style={{ marginTop: '1rem' }}>
                        <div className="dc-cmd-section-head">
                          <span>INSTRUCTIONS</span>
                        </div>
                        <textarea
                          className="dc-cmd-textarea"
                          placeholder="Describe what needs to be changed/corrected or specify details for variations..."
                          value={designerRequestInstructions}
                          onChange={(e) => setDesignerRequestInstructions(e.target.value)}
                          style={{ minHeight: '120px' }}
                        />
                      </div>

                      <div className="dc-request-actions" style={{ marginTop: '1.25rem', display: 'flex', gap: '0.6rem' }}>
                        <button
                          className="dc-action-btn dc-submit-request-btn"
                          style={{ flex: 1 }}
                            onClick={async () => {
                                const product = selectedProduct || selectedFolder;
                                if (!product) return;
                                setIsSending(true);
                                try {
                                  const { createDesignerRequest } = await import('@/lib/actions');
                                  const thumb = getDisplayUrl(product.mainDesignUrl || product.designUrl, product.mainDesignId || product.designId, 200) || '';
                                  const result = await createDesignerRequest({
                                    productId: product.id,
                                    productName: product.name,
                                    productThumb: thumb,
                                    type: designerRequestType,
                                    instructions: designerRequestInstructions,
                                    createdBy: product.id,
                                  });
                                  if (result.success) {
                                    // Notify designer
                                    await createNotification({
                                      userId: 'role:designer',
                                      title: 'New Designer Request',
                                      message: `${designerRequestType === 'correction' ? 'Correction' : 'Color Variation'} requested for ${product.name}`,
                                      type: 'action',
                                      link: `/designer`
                                    }).catch(() => {});
                                    setDesignerRequestInstructions('');
                                    setShowDesignerRequestForm(false);
                                    showToast({ type: 'success', title: 'Request Sent', description: 'Designer has been notified' });
                                  } else {
                                    showToast({ type: 'error', title: 'Request Failed', description: result.error });
                                  }
                                } catch (e: any) {
                                  showToast({ type: 'error', title: 'System Error', description: e.message });
                                } finally {
                                  setIsSending(false);
                                }
                              }}
                          disabled={isSending || !designerRequestInstructions.trim()}
                        >
                          {isSending ? <Loader2 className="dc-spin" size={16} /> : <CheckCircle2 size={16} />}
                          <span>{isSending ? "Transmitting..." : "Submit Request"}</span>
                        </button>
                        
                        <button
                          className="dc-action-btn dc-action-btn-ghost"
                          onClick={() => {
                            setShowDesignerRequestForm(false);
                            setDesignerRequestInstructions('');
                          }}
                          disabled={isSending}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Shoot Direction */}
                      <div className="dc-cmd-section">
                        <div className="dc-cmd-section-head">
                          <Camera size={13} />
                          <span>SHOOT DIRECTION</span>
                        </div>
                        <textarea
                          className="dc-cmd-textarea"
                          placeholder="Describe the shoot: angles, lighting, mood, props…"
                          value={shootDir}
                          onChange={(e) => setShootDir(e.target.value)}
                        />
                        
                        {/* Character counter & Guide */}
                        <div className="dc-cmd-feedback">
                          <span className="dc-char-count">{shootDir.length} chars</span>
                          <span className={`dc-clarity-badge ${shootDir.length > 20 ? 'dc-clarity-good' : 'dc-clarity-low'}`}>
                            {shootDir.length === 0 ? 'Empty' : shootDir.length > 20 ? 'Clear description' : 'Add details'}
                          </span>
                        </div>

                        {/* Presets Chips */}
                        {presets.length > 0 && (
                          <div className="dc-cmd-chips">
                            <span className="dc-chips-title">Presets:</span>
                            {presets.map((text, i) => {
                              const isApplied = shootDir.toLowerCase().includes(text.toLowerCase());
                              return (
                                <button
                                  key={i}
                                  className={`dc-chip ${isApplied ? 'dc-chip-active' : ''}`}
                                  onClick={() => applyPreset(text, 'shoot')}
                                >
                                  <Zap size={10} style={{ marginRight: '2px', display: 'inline-block', verticalAlign: 'middle' }} />
                                  {text}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Edit Direction */}
                      <div className="dc-cmd-section">
                        <div className="dc-cmd-section-head">
                          <PenTool size={13} />
                          <span>EDIT DIRECTION</span>
                        </div>
                        <textarea
                          className="dc-cmd-textarea"
                          placeholder="Post-processing: color grade, retouch, crop, output format…"
                          value={editDir}
                          onChange={(e) => setEditDir(e.target.value)}
                        />

                        {/* Character counter & Guide */}
                        <div className="dc-cmd-feedback">
                          <span className="dc-char-count">{editDir.length} chars</span>
                          <span className={`dc-clarity-badge ${editDir.length > 20 ? 'dc-clarity-good' : 'dc-clarity-low'}`}>
                            {editDir.length === 0 ? 'Empty' : editDir.length > 20 ? 'Clear description' : 'Add details'}
                          </span>
                        </div>

                        {/* Presets Chips */}
                        {presets.length > 0 && (
                          <div className="dc-cmd-chips">
                            <span className="dc-chips-title">Presets:</span>
                            {presets.map((text, i) => {
                              const isApplied = editDir.toLowerCase().includes(text.toLowerCase());
                              return (
                                <button
                                  key={i}
                                  className={`dc-chip ${isApplied ? 'dc-chip-active' : ''}`}
                                  onClick={() => applyPreset(text, 'edit')}
                                >
                                  <Zap size={10} style={{ marginRight: '2px', display: 'inline-block', verticalAlign: 'middle' }} />
                                  {text}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="dc-cmd-divider" />

                      {/* Primary CTA */}
                      <button className="dc-send-btn" onClick={handleSendDirection} disabled={isSending}>
                        <div className="dc-send-btn-bg" />
                        {isSending ? (
                          <>
                            <Loader2 className="dc-spin" size={18} />
                            <span>Transmitting…</span>
                          </>
                        ) : (
                          <>
                            <Send size={17} />
                            <span>
                              {selectedIds.length > 0
                                ? `Send to ${selectedIds.length} Products`
                                : activeTab === "directions" ? "Send to Shooter"
                                : activeTab === "selections" ? "Send to Editor"
                                : "Approve & Complete"}
                            </span>
                            <ArrowRight size={15} className="dc-send-arrow" />
                          </>
                        )}
                      </button>

                      {/* Request Designer */}
                      {(selectedProduct || selectedFolder || selectedIds.length > 0) && activeTab !== "selections" && (
                        <button className="dc-designer-btn" onClick={() => setShowDesignerRequestForm(true)}>
                          <PenTool size={14} />
                          <span>Request Designer</span>
                        </button>
                      )}

                      {/* Secondary Actions Row */}
                      <div className="dc-secondary-row">
                        {/* History */}
                        <button className="dc-secondary-btn" onClick={() => setShowHistory(!showHistory)}>
                          <RotateCcw size={13} />
                          <span>{showHistory ? "Hide History" : `History (${productHistory.length})`}</span>
                        </button>
                        {/* Designer Requests */}
                        <button className="dc-secondary-btn" onClick={() => setShowRequests(!showRequests)}>
                          <PenTool size={13} />
                          <span>{showRequests ? "Hide Requests" : `Requests (${designerRequests.filter(r => r.productId === selectedProduct?.id).length})`}</span>
                        </button>
                        {/* Templates */}
                        {templates.length > 0 && (
                          <button className="dc-secondary-btn" onClick={() => setShowTemplatePicker(!showTemplatePicker)}>
                            <Layers size={13} />
                            <span>{showTemplatePicker ? "Close Templates" : "Templates"}</span>
                          </button>
                        )}
                      </div>

                      {/* Product History Panel */}
                      {showHistory && productHistory.length > 0 && (
                        <div className="dc-history-panel">
                          <div className="dc-history-title">Change History</div>
                          {productHistory.map((h: any, i: number) => (
                            <div key={h.id || i} className="dc-history-item">
                              <div className="dc-history-dot" />
                              <div className="dc-history-content">
                                <div className="dc-history-field">
                                  {h.field} <span className="dc-history-arrow">→</span> {h.newValue}
                                </div>
                                <div className="dc-history-meta">
                                  {h.changedBy} · {h.timestamp?.toDate?.()?.toLocaleString() || 'Just now'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {showHistory && productHistory.length === 0 && (
                        <div className="dc-history-empty">No history recorded yet</div>
                      )}

                      {/* Designer Requests Panel */}
                      {showRequests && (
                        <div className="dc-history-panel">
                          <div className="dc-history-title">Designer Requests</div>
                          {designerRequests.filter(r => r.productId === selectedProduct?.id).length === 0 && (
                            <div className="dc-history-empty">No requests for this product</div>
                          )}
                          {designerRequests.filter(r => r.productId === selectedProduct?.id).map((r: any, i: number) => (
                            <div key={r.id || i} className="dc-history-item">
                              <div className={`dc-request-status-dot ${r.status}`} />
                              <div className="dc-history-content">
                                <div className="dc-history-field">
                                  {r.type === 'correction' ? 'Correction' : 'Color Variation'}
                                  <span className={`dc-request-badge ${r.status}`}>{r.status}</span>
                                </div>
                                <div className="dc-history-meta">{r.instructions?.substring(0, 60)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Template Picker */}
                      {showTemplatePicker && templates.length > 0 && (
                        <div className="dc-history-panel">
                          <div className="dc-history-title">Apply Master Template</div>
                          {templates.map((t: any, i: number) => (
                            <button key={i} className="dc-template-btn" onClick={() => {
                              if (t.shootDirection) setShootDir(t.shootDirection);
                              if (t.editDirection) setEditDir(t.editDirection);
                              setShowTemplatePicker(false);
                            }}>
                              <Layers size={14} />
                              <span>{t.name || `Template ${i + 1}`}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                </div>
              ) : (
                <div className="dc-panel-idle">
                  <div className="dc-idle-ring">
                    <div className="dc-idle-ring-inner">
                      <Film size={32} />
                    </div>
                  </div>
                  <p className="dc-idle-title">Command Ready</p>
                  <p className="dc-idle-sub">Select a product or open a folder to issue directions</p>
                </div>
              )}
            </aside>
          </div>
        </div>

        <style jsx>{`
          /* ─────────────────────────────────────────────── */
          /* ROOT                                           */
          /* ─────────────────────────────────────────────── */
          .dc-root {
            padding: 2rem 2rem 3rem;
            max-width: 1700px;
            margin: 0 auto;
            position: relative;
            min-height: 100vh;
            font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
            color: var(--text-main);
            background-color: transparent;
          }

          /* ─────────────────────────────────────────────── */
          /* AMBIENT BACKGROUND                             */
          /* ─────────────────────────────────────────────── */
          .dc-ambient {
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
          .dc-grid-lines {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(99,102,241,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.02) 1px, transparent 1px);
            background-size: 48px 48px;
          }

          /* ─────────────────────────────────────────────── */
          /* HEADER                                         */
          /* ─────────────────────────────────────────────── */
          .dc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 2.2rem;
            position: relative;
            z-index: 2;
            gap: 2rem;
            flex-wrap: wrap;
          }
          .dc-badge {
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
          .dc-badge svg { animation: pulse-dot 2s ease-in-out infinite; }
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          .dc-title {
            font-size: clamp(1.8rem, 3vw, 2.5rem);
            font-weight: 900;
            letter-spacing: -0.04em;
            line-height: 1.1;
            margin: 0 0 0.4rem 0;
            color: var(--text-main);
          }
          .dc-title-accent {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .dc-subtitle {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin: 0;
            font-weight: 400;
            letter-spacing: 0.01em;
          }

          /* Tabs */
          .dc-tabs {
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
          .dc-tabs::-webkit-scrollbar { height: 2px; }
          .dc-tabs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
          .dc-tab {
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
          .dc-tab:hover { color: var(--text-main); background: var(--bg-hover); }
          .dc-tab-active {
            background: var(--bg-hover);
            color: var(--tab-color, var(--primary)) !important;
            box-shadow: 0 0 0 1px var(--border) inset,
                        0 4px 12px rgba(0, 0, 0, 0.1),
                        0 0 20px var(--tab-glow, var(--primary-glow));
          }
          .dc-tab-icon { display: flex; align-items: center; opacity: 0.7; }
          .dc-tab-active .dc-tab-icon { opacity: 1; }
          .dc-tab-count {
            background: var(--border);
            color: var(--text-muted);
            border-radius: 100px;
            padding: 0.1rem 0.5rem;
            font-size: 0.72rem;
            font-weight: 800;
            min-width: 24px;
            text-align: center;
            transition: all var(--transition-fast);
          }
          .dc-tab-active .dc-tab-count {
            background: var(--tab-color, var(--primary));
            color: #fff !important;
          }

          /* ─────────────────────────────────────────────── */
          /* KPI STRIP                                      */
          /* ─────────────────────────────────────────────── */
          .dc-kpi-strip {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 0.85rem;
            margin-bottom: 2rem;
            position: relative;
            z-index: 2;
          }
          @media (max-width: 1400px) {
            .dc-kpi-strip { grid-template-columns: repeat(3, 1fr); }
          }
          @media (max-width: 768px) {
            .dc-kpi-strip { grid-template-columns: repeat(2, 1fr); }
          }
          .dc-kpi {
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
          .dc-kpi::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at 15% 50%, var(--kpi-glow, transparent) 0%, transparent 60%);
            opacity: 0;
            transition: opacity var(--transition-base);
          }
          .dc-kpi:hover::before, .dc-kpi-active::before { opacity: 1; }
          .dc-kpi:hover {
            transform: translateY(-4px);
            border-color: var(--kpi-color, var(--primary));
            box-shadow: var(--shadow-lg), 0 0 15px var(--kpi-glow);
          }
          .dc-kpi-active {
            border-color: var(--kpi-color, var(--primary));
            background: var(--bg-hover);
            box-shadow: var(--shadow-lg), 0 0 20px var(--kpi-glow), inset 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          }
          .dc-kpi-icon {
            width: 48px; height: 48px;
            border-radius: var(--radius-md);
            background: var(--border);
            border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center;
            color: var(--kpi-color, var(--primary));
            flex-shrink: 0;
            position: relative;
            z-index: 1;
            transition: all var(--transition-base);
          }
          .dc-kpi:hover .dc-kpi-icon, .dc-kpi-active .dc-kpi-icon {
            background: var(--kpi-color, var(--primary));
            color: #fff !important;
            box-shadow: 0 0 16px var(--kpi-glow);
            transform: scale(1.05);
          }
          .dc-kpi-body {
            display: flex; flex-direction: column; gap: 0.15rem;
            position: relative; z-index: 1; flex: 1;
          }
          .dc-kpi-num {
            font-size: 2.2rem;
            font-weight: 900;
            letter-spacing: -0.04em;
            line-height: 1;
            color: var(--text-main);
            display: block;
          }
          .dc-kpi-label {
            font-size: 0.72rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .dc-kpi:hover .dc-kpi-label, .dc-kpi-active .dc-kpi-label {
            color: var(--text-main);
          }
          .dc-kpi-bar {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 3px;
            background: var(--border-light);
          }
          .dc-kpi-bar-fill {
            height: 100%;
            background: var(--kpi-color, var(--primary));
            opacity: 0.4;
            border-radius: 2px;
            transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .dc-kpi:hover .dc-kpi-bar-fill, .dc-kpi-active .dc-kpi-bar-fill { opacity: 1; }
          .dc-kpi-pulse {
            position: absolute;
            top: 1.25rem; right: 1.25rem;
            width: 8px; height: 8px;
            border-radius: 50%;
            background: var(--kpi-color, var(--primary));
            animation: kpi-pulse 2s ease-in-out infinite;
          }
          @keyframes kpi-pulse {
            0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 var(--kpi-glow, transparent); }
            50% { transform: scale(1.25); opacity: 0.5; box-shadow: 0 0 0 6px transparent; }
          }

          /* ─────────────────────────────────────────────── */
          /* BODY LAYOUT                                    */
          /* ─────────────────────────────────────────────── */
          .dc-body {
            display: grid;
            grid-template-columns: 1fr 440px;
            gap: 1.6rem;
            align-items: start;
            position: relative;
            z-index: 2;
          }
          @media (max-width: 1280px) {
            .dc-body { grid-template-columns: 1fr 380px; }
          }
          @media (max-width: 1024px) {
            .dc-body { grid-template-columns: 1fr; }
            .dc-command-panel { position: static !important; max-height: none !important; }
          }

          /* ─────────────────────────────────────────────── */
          /* LEFT PANEL                                     */
          /* ─────────────────────────────────────────────── */
          .dc-panel {
            border-radius: var(--radius-xl);
            background: var(--bg-card);
            border: 1px solid var(--border);
            backdrop-filter: var(--glass);
            box-shadow: var(--shadow-xl);
            overflow: hidden;
          }
          .dc-panel-inner {
            padding: 1.75rem;
            min-height: 640px;
          }

          /* ─────────────────────────────────────────────── */
          /* FILE MANAGER                                   */
          /* ─────────────────────────────────────────────── */
          .dc-fm { display: flex; flex-direction: column; }
          .dc-fm-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 1.1rem;
            margin-bottom: 1.25rem;
            border-bottom: 1px solid var(--border);
          }
          .dc-breadcrumb { display: flex; align-items: center; gap: 0.5rem; }
          .dc-bc-item {
            font-size: 0.88rem;
            font-weight: 600;
            color: var(--text-muted);
            cursor: pointer;
            transition: color var(--transition-fast);
            display: flex; align-items: center; gap: 0.4rem;
          }
          .dc-bc-item:hover { color: var(--text-main); }
          .dc-bc-active { color: var(--text-main); cursor: default; }
          .dc-bc-pill {
            background: var(--primary-glow);
            border: 1px solid var(--border);
            color: var(--primary);
            font-size: 0.68rem;
            padding: 0.1rem 0.5rem;
            border-radius: 100px;
            font-weight: 800;
          }
          .dc-bc-sep { color: var(--text-dim); }
          .dc-back-btn {
            width: 32px; height: 32px;
            border-radius: var(--radius-sm);
            background: var(--primary-glow);
            border: 1px solid var(--border);
            color: var(--primary);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all var(--transition-fast); flex-shrink: 0;
          }
          .dc-back-btn:hover {
            background: var(--primary);
            color: #fff !important;
            transform: translateX(-3px);
            box-shadow: 0 0 10px var(--primary-glow);
          }
          .dc-fm-view-toggle { display: flex; }
          .dc-icon-btn {
            width: 34px; height: 34px;
            border-radius: var(--radius-sm);
            background: var(--bg-hover);
            border: 1px solid var(--border);
            color: var(--text-muted);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all var(--transition-fast);
          }
          .dc-icon-btn:hover { background: var(--bg-input); color: var(--text-main); }
          .dc-icon-btn-active {
            background: var(--primary-glow);
            border-color: var(--primary);
            color: var(--primary);
          }

          /* Folder Grid */
          .dc-folder-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
            gap: 1.2rem;
          }
          .dc-folder-card {
            border-radius: var(--radius-lg);
            background: var(--bg-input);
            border: 1px solid var(--border);
            overflow: hidden;
            cursor: pointer;
            transition: all var(--transition-slow);
          }
          .dc-folder-card:hover {
            transform: translateY(-6px) scale(1.02);
            border-color: var(--primary);
            box-shadow: var(--shadow-lg), 0 0 20px var(--primary-glow);
          }
          .dc-folder-thumb {
            width: 100%;
            aspect-ratio: 4/3;
            position: relative;
            overflow: hidden;
            background-color: var(--bg-deep);
            display: flex; align-items: center; justify-content: center;
          }
          .dc-folder-thumb img {
            width: 100%; height: 100%;
            object-fit: cover;
            transition: transform var(--transition-slow);
          }
          .dc-folder-card:hover .dc-folder-thumb img { transform: scale(1.1); }
          .dc-folder-placeholder {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            font-size: 2.2rem;
            font-weight: 900;
            color: #fff !important;
          }
          .dc-folder-overlay {
            position: absolute; inset: 0;
            background: linear-gradient(135deg, var(--primary-glow), var(--secondary-glow));
            backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            color: #fff !important;
            opacity: 0; transition: opacity var(--transition-base);
          }
          .dc-folder-card:hover .dc-folder-overlay { opacity: 1; }
          .dc-folder-info {
            padding: 0.85rem 1rem;
            border-top: 1px solid var(--border);
          }
          .dc-folder-info h4 {
            font-size: 0.88rem;
            font-weight: 700;
            color: var(--text-main);
            margin: 0 0 0.35rem 0;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          }
          .dc-folder-meta {
            display: flex; align-items: center; gap: 0.4rem;
            font-size: 0.72rem; color: var(--text-muted);
          }

          /* Photo View */
          .dc-photo-view { display: flex; flex-direction: column; }
          .dc-sel-toolbar {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding-bottom: 0.9rem;
            margin-bottom: 1rem;
            border-bottom: 1px solid var(--border);
            flex-wrap: wrap;
          }
          .dc-sel-btn {
            display: flex; align-items: center; gap: 0.4rem;
            padding: 0.45rem 0.95rem;
            border-radius: var(--radius-sm);
            font-weight: 600; font-size: 0.78rem;
            cursor: pointer; transition: all var(--transition-fast);
            background: var(--bg-hover);
            border: 1px solid var(--border);
            color: var(--text-muted);
          }
          .dc-sel-btn:hover {
            background: var(--primary-glow);
            border-color: var(--primary);
            color: var(--text-main);
            transform: translateY(-1px);
          }
          .dc-sel-btn-danger { color: var(--danger); border-color: rgba(239, 68, 68, 0.2); }
          .dc-sel-btn-danger:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: var(--danger);
            color: #fff !important;
            box-shadow: 0 0 10px var(--danger-glow);
          }

          .dc-photos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 0.8rem;
            overflow-y: auto;
            max-height: 540px;
            padding: 0.4rem;
            border-radius: var(--radius-md);
            border: 1px dashed var(--border);
            background: rgba(0, 0, 0, 0.1);
          }
          .dc-photos-grid::-webkit-scrollbar { width: 4px; }
          .dc-photos-grid::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
          
          .dc-photo-card {
            aspect-ratio: 1;
            border-radius: var(--radius-md);
            overflow: hidden;
            position: relative;
            cursor: pointer;
            border: 2px solid transparent;
            background: var(--bg-deep);
            transition: all var(--transition-base);
          }
          .dc-photo-card:hover { transform: translateY(-2px); border-color: var(--primary-glow); box-shadow: var(--shadow-md); }
          .dc-photo-selected { border-color: var(--primary) !important; box-shadow: 0 0 0 3px var(--primary-glow), var(--shadow-lg); }
          
          .dc-photo-card img {
            width: 100%; height: 100%; object-fit: contain;
            background-image:
              linear-gradient(135deg, var(--bg-hover) 25%, transparent 25%),
              linear-gradient(225deg, var(--bg-hover) 25%, transparent 25%),
              linear-gradient(315deg, var(--bg-hover) 25%, transparent 25%),
              linear-gradient(45deg, var(--bg-hover) 25%, transparent 25%);
            background-size: 16px 16px; background-color: var(--bg-deep);
            transition: transform var(--transition-slow);
          }
          .dc-photo-card:hover img { transform: scale(1.05); }
          .dc-photo-placeholder {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            background: var(--bg-hover);
            color: var(--text-dim); font-size: 1.5rem; font-weight: 800;
          }
          .dc-photo-num {
            position: absolute; bottom: 8px; left: 8px;
            font-size: 0.65rem; font-weight: 800;
            color: #fff; background: rgba(0,0,0,0.6);
            padding: 0.15rem 0.35rem; border-radius: 4px;
            opacity: 0.7; transition: opacity var(--transition-fast);
          }
          .dc-photo-card:hover .dc-photo-num { opacity: 1; }

          /* Crop Selector */
          .dc-crop-selector {
            position: absolute; top: 8px; right: 8px; z-index: 10;
            display: flex; gap: 3px;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(12px);
            padding: 4px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--border);
            opacity: 0; transform: translateY(-6px) scale(0.9);
            transition: all var(--transition-base);
          }
          .dc-photo-card:hover .dc-crop-selector,
          .dc-photo-selected .dc-crop-selector { opacity: 1; transform: translateY(0) scale(1); }
          .dc-crop-btn {
            padding: 3px 8px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-light);
            color: var(--text-muted);
            font-size: 0.65rem; font-weight: 800;
            cursor: pointer; transition: all var(--transition-fast);
          }
          .dc-crop-btn:hover { background: var(--primary-glow); color: var(--text-main); border-color: var(--primary); }
          .dc-crop-active { background: var(--primary) !important; border-color: var(--primary) !important; color: #fff !important; box-shadow: 0 2px 6px var(--primary-glow); }

          /* Ratio Badge */
          .dc-ratio-badge {
            position: absolute; bottom: 8px; right: 8px; z-index: 5;
            padding: 3px 8px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 5px;
            color: #fff !important; font-size: 0.65rem; font-weight: 800;
            box-shadow: 0 4px 12px var(--primary-glow);
            animation: ratio-pop var(--transition-bounce);
          }
          @keyframes ratio-pop {
            from { opacity: 0; transform: scale(0.8) translateY(4px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }

          /* Action Bar */
          .dc-action-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            margin: 1.25rem -1.75rem -1.75rem;
            padding: 1.1rem 1.75rem;
            border-top: 1px solid var(--border);
            backdrop-filter: var(--glass);
            background: rgba(15, 23, 42, 0.6);
            border-radius: 0 0 var(--radius-xl) var(--radius-xl);
          }
          .dc-action-bar-info {
            display: flex; align-items: center; gap: 0.6rem;
            color: var(--text-main); font-weight: 600; font-size: 0.85rem;
          }
          .dc-action-btn {
            display: flex; align-items: center; gap: 0.5rem;
            padding: 0.65rem 1.4rem;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border: none; border-radius: var(--radius-md);
            color: #fff !important; font-weight: 700; font-size: 0.85rem;
            cursor: pointer; transition: all var(--transition-base);
            box-shadow: 0 4px 14px var(--primary-glow);
            flex-shrink: 0;
          }
          .dc-action-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px var(--primary-glow); filter: brightness(1.1); }
          .dc-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
          .dc-action-btn-ghost {
            background: var(--bg-hover);
            border: 1px solid var(--border);
            box-shadow: none;
            color: var(--text-muted);
          }
          .dc-action-btn-ghost:hover:not(:disabled) { background: var(--bg-input); color: var(--text-main); }

          /* ─────────────────────────────────────────────── */
          /* LIST VIEW (Reviews)                            */
          /* ─────────────────────────────────────────────── */
          .dc-list-view { display: flex; flex-direction: column; }
          .dc-list-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.8rem;
            margin-bottom: 1.25rem;
          }
          .dc-search {
            flex: 1; display: flex; align-items: center;
            gap: 0.7rem;
            padding: 0.65rem 1.1rem;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            transition: all var(--transition-base);
          }
          .dc-search:focus-within {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-glow);
            background: var(--bg-hover);
          }
          .dc-search svg { color: var(--text-dim); flex-shrink: 0; }
          .dc-search input {
            background: none; border: none; outline: none;
            color: var(--text-main); font-size: 0.88rem; flex: 1;
          }
          .dc-search input::placeholder { color: var(--text-dim); }
          .dc-list-actions { display: flex; gap: 0.4rem; }

          /* Bulk Bar */
          .dc-bulk-bar {
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.8rem 1.3rem;
            background: var(--primary-glow);
            border: 1px solid var(--border-glow);
            border-radius: var(--radius-md);
            margin-bottom: 1.1rem;
            animation: slide-in-down 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            backdrop-filter: var(--glass);
          }
          .dc-bulk-info { display: flex; align-items: center; gap: 0.6rem; color: var(--text-main); font-weight: 600; font-size: 0.85rem; }
          .dc-bulk-cancel {
            display: flex; align-items: center; gap: 0.35rem;
            font-size: 0.75rem; font-weight: 700;
            color: var(--danger);
            padding: 0.35rem 0.8rem;
            border-radius: var(--radius-sm);
            border: 1px solid rgba(239, 68, 68, 0.2);
            background: rgba(239, 68, 68, 0.05);
            cursor: pointer; transition: all var(--transition-fast);
          }
          .dc-bulk-cancel:hover { background: rgba(239, 68, 68, 0.1); border-color: var(--danger); }

          /* Product List */
          .dc-product-list { display: flex; flex-direction: column; gap: 0.6rem; }
          .dc-product-row {
            display: flex; align-items: center; gap: 1.1rem;
            padding: 0.95rem 1.25rem;
            border-radius: var(--radius-lg);
            cursor: pointer;
            border: 1px solid var(--border);
            background: var(--bg-card);
            transition: all var(--transition-base);
          }
          .dc-product-row:hover {
            background: var(--bg-hover);
            transform: translateX(6px);
            border-color: var(--primary-glow);
            box-shadow: var(--shadow-md);
          }
          .dc-product-active {
            background: var(--primary-glow) !important;
            border-color: var(--primary) !important;
            box-shadow: 0 0 15px var(--primary-glow);
          }
          .dc-product-marked {
            border-color: var(--primary-glow) !important;
            background: rgba(99, 102, 241, 0.08) !important;
          }
          .dc-product-check {
            color: var(--text-dim);
            transition: all var(--transition-fast); flex-shrink: 0;
            display: flex; align-items: center;
          }
          .dc-product-check:hover { transform: scale(1.2); color: var(--primary); }
          .dc-check-icon-active { color: var(--primary); filter: drop-shadow(0 0 4px var(--primary-glow)); }
          .dc-product-thumbs { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
          .dc-product-thumb {
            width: 68px; height: 68px;
            border-radius: var(--radius-md);
            overflow: hidden;
            border: 1.5px solid var(--border);
            background-color: var(--bg-deep);
            display: flex; align-items: center; justify-content: center;
            transition: all var(--transition-base);
            position: relative;
          }
          .dc-product-row:hover .dc-product-thumb { transform: scale(1.04); border-color: var(--primary); }
          .dc-product-thumb img { width: 100%; height: 100%; object-fit: cover; }
          .dc-thumb-ph {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: #fff !important; font-weight: 900; font-size: 1.25rem;
          }
          .dc-var-stack { display: flex; align-items: center; gap: 0.25rem; }
          .dc-var-thumb {
            width: 26px; height: 26px;
            border-radius: 6px;
            overflow: hidden;
            border: 1.5px solid var(--border);
            background: var(--bg-deep);
            display: flex; align-items: center; justify-content: center;
            transform: translateY(calc((var(--var-idx, 0) - 1) * 4px));
            transition: all var(--transition-base);
          }
          .dc-product-row:hover .dc-var-thumb { transform: translateY(calc((var(--var-idx, 0) - 1) * 6px)) scale(1.05); }
          .dc-var-thumb img { width: 100%; height: 100%; object-fit: cover; }
          .dc-var-thumb span { color: var(--text-dim); font-size: 0.6rem; font-weight: 700; }
          .dc-var-more {
            width: 26px; height: 26px;
            border-radius: 6px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            display: flex; align-items: center; justify-content: center;
            color: #fff !important; font-size: 0.6rem; font-weight: 800;
            transform: translateY(4px);
            transition: all var(--transition-base);
          }
          .dc-product-row:hover .dc-var-more { transform: translateY(6px) scale(1.05); }
          .dc-product-info { flex: 1; min-width: 0; }
          .dc-product-name {
            display: flex; align-items: center; gap: 0.4rem;
            font-size: 0.98rem; font-weight: 700;
            color: var(--text-main);
            margin-bottom: 0.2rem;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          }
          .dc-var-badge {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: #fff !important; font-size: 0.6rem; font-weight: 800;
            padding: 0.1rem 0.45rem; border-radius: 6px;
            flex-shrink: 0;
          }
          .dc-product-meta {
            display: flex; align-items: center; gap: 0.5rem;
            color: var(--text-muted); font-size: 0.78rem;
          }
          .dc-row-arrow { color: var(--text-dim); transition: all var(--transition-base); flex-shrink: 0; }
          .dc-product-row:hover .dc-row-arrow { color: var(--primary); transform: translateX(4px); }

          /* ─────────────────────────────────────────────── */
          /* COMMAND PANEL (RIGHT)                          */
          /* ─────────────────────────────────────────────── */
          .dc-command-panel {
            border-radius: var(--radius-xl);
            background: var(--bg-card);
            border: 1px solid var(--border);
            backdrop-filter: var(--glass);
            box-shadow: var(--shadow-xl);
            position: sticky;
            top: 2.5rem;
            max-height: calc(100vh - 6rem);
            overflow-y: auto;
          }
          .dc-command-panel::-webkit-scrollbar { width: 4px; }
          .dc-command-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

          .dc-command-form { padding: 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; }

          /* Command Header */
          .dc-cmd-header { display: flex; gap: 1.1rem; align-items: center; }
          .dc-cmd-preview {
            width: 84px; height: 84px;
            border-radius: var(--radius-md);
            overflow: hidden;
            flex-shrink: 0;
            cursor: pointer;
            border: 1.5px solid var(--border);
            position: relative;
            transition: all var(--transition-base);
            background-color: var(--bg-deep);
          }
          .dc-cmd-preview:hover { transform: scale(1.05); border-color: var(--primary); box-shadow: 0 4px 14px var(--primary-glow); }
          .dc-cmd-preview img { width: 100%; height: 100%; object-fit: cover; }
          .dc-cmd-preview-overlay {
            position: absolute; inset: 0;
            background: var(--primary-glow);
            backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            color: #fff !important; opacity: 0; transition: opacity var(--transition-base);
          }
          .dc-cmd-preview:hover .dc-cmd-preview-overlay { opacity: 1; }
          .dc-cmd-title-block { flex: 1; min-width: 0; }
          .dc-cmd-title {
            font-size: 1.15rem;
            font-weight: 800;
            color: var(--text-main);
            margin: 0 0 0.35rem 0;
            line-height: 1.25;
            letter-spacing: -0.02em;
            word-break: break-word;
          }
          .dc-cmd-category {
            font-size: 0.78rem;
            color: var(--text-muted);
            font-weight: 600;
            display: block;
          }

          .dc-cmd-divider {
            height: 1px;
            background: linear-gradient(90deg, var(--border) 0%, transparent 80%);
            margin: 0.2rem 0;
          }

          /* Command Sections */
          .dc-cmd-section { display: flex; flex-direction: column; gap: 0.6rem; }
          .dc-cmd-section-head {
            display: flex; align-items: center; gap: 0.5rem;
            font-size: 0.68rem;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .dc-cmd-textarea {
            width: 100%;
            min-height: 100px;
            padding: 0.85rem 1.1rem;
            border-radius: var(--radius-md);
            background: var(--bg-input);
            border: 1px solid var(--border);
            color: var(--text-main);
            font-size: 0.88rem;
            line-height: 1.5;
            resize: vertical;
            transition: all var(--transition-base);
            font-family: inherit;
          }
          .dc-cmd-textarea:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-glow);
            outline: none;
            background: var(--bg-hover);
          }

          /* New Interactive Command Panel Elements */
          .dc-preview-count-badge {
            position: absolute;
            bottom: 6px;
            right: 6px;
            background: rgba(15, 23, 42, 0.85);
            padding: 2px 7px;
            border-radius: 6px;
            font-size: 0.62rem;
            font-weight: 800;
            color: #fff !important;
            border: 1px solid var(--border);
            backdrop-filter: blur(4px);
            box-shadow: var(--shadow-sm);
            z-index: 5;
          }

          .dc-cmd-feedback {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.7rem;
            color: var(--text-muted);
            margin-top: 0.1rem;
          }
          .dc-char-count {
            font-weight: 600;
          }
          .dc-clarity-badge {
            font-weight: 700;
            padding: 1.5px 6px;
            border-radius: 4px;
            font-size: 0.62rem;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .dc-clarity-good {
            background: rgba(16, 185, 129, 0.1);
            color: var(--accent) !important;
          }
          .dc-clarity-low {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning) !important;
          }

          .dc-cmd-chips {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.35rem;
            margin-top: 0.4rem;
            padding: 0.45rem;
            border-radius: var(--radius-md);
            background: rgba(0, 0, 0, 0.15);
            border: 1px solid var(--border-light);
          }
          .dc-chips-title {
            font-size: 0.65rem;
            font-weight: 800;
            color: var(--text-dim);
            margin-right: 0.2rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .dc-chip {
            padding: 3px 8px;
            border-radius: 8px;
            background: var(--bg-hover);
            border: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.65rem;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .dc-chip:hover {
            background: var(--bg-input);
            color: var(--text-main);
            transform: translateY(-1px);
          }
          .dc-chip-active {
            background: var(--primary) !important;
            border-color: var(--primary) !important;
            color: #fff !important;
            box-shadow: 0 2px 6px var(--primary-glow);
          }
          .dc-preset-active {
            background: var(--primary-glow) !important;
            border-color: var(--primary) !important;
            color: var(--text-main) !important;
            box-shadow: 0 0 10px var(--primary-glow);
            transform: translateY(-2px) scale(1.04);
          }

          .dc-cmd-textarea::placeholder { color: var(--text-dim); }

          /* Presets */
          .dc-presets { display: flex; flex-wrap: wrap; gap: 0.35rem; }
          .dc-preset {
            display: inline-flex; align-items: center; gap: 0.35rem;
            padding: 0.3rem 0.75rem;
            border-radius: 100px;
            background: var(--bg-hover);
            border: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.68rem; font-weight: 700;
            cursor: pointer;
            transition: all var(--transition-base);
            max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .dc-preset:hover {
            background: var(--primary-glow);
            border-color: var(--primary);
            color: var(--text-main);
            transform: translateY(-1px);
          }
          .dc-preset:active { transform: scale(0.95); }

          /* Secondary Actions Row */
          .dc-secondary-row {
            display: flex;
            gap: 0.4rem;
            flex-wrap: wrap;
          }
          .dc-secondary-btn {
            display: flex; align-items: center; gap: 0.35rem;
            padding: 0.4rem 0.75rem;
            border-radius: var(--radius-sm);
            background: var(--bg-hover);
            border: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.7rem;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .dc-secondary-btn:hover {
            background: var(--bg-input);
            color: var(--text-main);
            border-color: var(--primary);
          }

          /* History Panel */
          .dc-history-panel {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.85rem;
            border-radius: var(--radius-md);
            background: var(--bg-input);
            border: 1px solid var(--border);
            max-height: 240px;
            overflow-y: auto;
            animation: slide-in-down 0.3s ease-out;
          }
          .dc-history-panel::-webkit-scrollbar { width: 3px; }
          .dc-history-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
          .dc-history-title {
            font-size: 0.68rem;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 0.2rem;
          }
          .dc-history-item {
            display: flex;
            gap: 0.6rem;
            align-items: flex-start;
            padding: 0.4rem 0;
            border-bottom: 1px solid var(--border-light);
          }
          .dc-history-item:last-child { border-bottom: none; }
          .dc-history-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: var(--primary);
            margin-top: 5px;
            flex-shrink: 0;
          }
          .dc-history-content { flex: 1; min-width: 0; }
          .dc-history-field {
            font-size: 0.78rem;
            font-weight: 600;
            color: var(--text-main);
          }
          .dc-history-arrow { color: var(--primary); margin: 0 0.3rem; }
          .dc-history-meta {
            font-size: 0.65rem;
            color: var(--text-dim);
            margin-top: 0.15rem;
          }
          .dc-history-empty {
            text-align: center;
            padding: 1rem;
            font-size: 0.78rem;
            color: var(--text-dim);
          }
          .dc-request-status-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            margin-top: 5px;
            flex-shrink: 0;
          }
          .dc-request-status-dot.pending { background: var(--warning); }
          .dc-request-status-dot.accepted { background: var(--primary); }
          .dc-request-status-dot.completed { background: var(--accent); }
          .dc-request-status-dot.rejected { background: var(--danger); }
          .dc-request-badge {
            display: inline-block;
            margin-left: 0.4rem;
            padding: 0.05rem 0.4rem;
            border-radius: 4px;
            font-size: 0.6rem;
            font-weight: 700;
          }
          .dc-request-badge.pending { background: rgba(245,158,11,0.15); color: var(--warning); }
          .dc-request-badge.accepted { background: rgba(99,102,241,0.15); color: var(--primary); }
          .dc-request-badge.completed { background: rgba(16,185,129,0.15); color: var(--accent); }
          .dc-request-badge.rejected { background: rgba(239,68,68,0.15); color: var(--danger); }

          /* Template Button */
          .dc-template-btn {
            display: flex; align-items: center; gap: 0.5rem;
            padding: 0.55rem 0.85rem;
            border-radius: var(--radius-sm);
            background: var(--bg-hover);
            border: 1px solid var(--border);
            color: var(--text-main);
            font-size: 0.78rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
            width: 100%;
          }
          .dc-template-btn:hover {
            background: var(--primary-glow);
            border-color: var(--primary);
            color: var(--text-main);
          }

          /* Send Button */
          .dc-send-btn {
            width: 100%;
            padding: 1rem;
            border-radius: var(--radius-md);
            background: transparent;
            border: none;
            color: #fff !important;
            font-weight: 800;
            font-size: 0.95rem;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            display: flex; align-items: center; justify-content: center; gap: 0.6rem;
            transition: all var(--transition-base);
            letter-spacing: 0.02em;
          }
          .dc-send-btn-bg {
            position: absolute; inset: 0;
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            border-radius: var(--radius-md);
            transition: all var(--transition-base);
          }
          .dc-send-btn::before {
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.15) 50%, transparent 70%);
            background-size: 200% 200%;
            animation: shimmer 4s ease-in-out infinite;
            border-radius: var(--radius-md);
          }
          @keyframes shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          .dc-send-btn > * { position: relative; z-index: 1; }
          .dc-send-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px var(--primary-glow); }
          .dc-send-btn:hover:not(:disabled) .dc-send-btn-bg { filter: brightness(1.15); }
          .dc-send-btn:active:not(:disabled) { transform: translateY(0) scale(0.97); }
          .dc-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
          .dc-send-arrow { opacity: 0.8; transition: transform var(--transition-fast); }
          .dc-send-btn:hover .dc-send-arrow { transform: translateX(4px); opacity: 1; }

          /* Designer Button */
          .dc-designer-btn {
            width: 100%;
            padding: 0.75rem;
            border-radius: var(--radius-md);
            background: rgba(168, 85, 247, 0.05);
            border: 1px solid rgba(168, 85, 247, 0.15);
            color: var(--secondary);
            font-weight: 700; font-size: 0.82rem;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            transition: all var(--transition-base);
          }
          .dc-designer-btn:hover {
            transform: translateY(-1px);
            background: var(--secondary-glow);
            border-color: var(--secondary);
            color: #fff !important;
            box-shadow: 0 4px 12px var(--secondary-glow);
          }

          /* Designer Request Form */
          .dc-designer-request-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            animation: success-pop var(--transition-bounce);
          }
          .dc-request-types {
            display: flex;
            background: var(--bg-hover);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 0.25rem;
            gap: 0.2rem;
          }
          .dc-request-type-btn {
            flex: 1;
            padding: 0.5rem;
            border-radius: var(--radius-sm);
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 0.78rem;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .dc-request-type-btn:hover {
            color: var(--text-main);
          }
          .dc-request-type-active {
            background: var(--primary) !important;
            color: #fff !important;
            box-shadow: 0 2px 8px var(--primary-glow);
          }
          .dc-submit-request-btn {
            background: linear-gradient(135deg, var(--secondary), var(--primary)) !important;
            box-shadow: 0 4px 12px var(--secondary-glow);
          }
          .dc-request-actions {
            display: flex;
            gap: 0.6rem;
          }

          @keyframes success-pop { from { opacity: 0; transform: scale(0.9) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }

          /* Idle State */
          .dc-panel-idle {
            padding: 4rem 2rem;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 1.25rem; min-height: 480px; text-align: center;
          }
          .dc-idle-ring {
            width: 96px; height: 96px;
            border-radius: 50%;
            border: 1.5px solid var(--primary-glow);
            display: flex; align-items: center; justify-content: center;
            animation: idle-spin 15s linear infinite;
            position: relative;
          }
          .dc-idle-ring::before {
            content: '';
            position: absolute; inset: -8px;
            border-radius: 50%;
            border: 1px dashed var(--border);
            animation: idle-spin 30s linear infinite reverse;
          }
          .dc-idle-ring-inner {
            width: 64px; height: 64px;
            border-radius: 50%;
            background: var(--primary-glow);
            border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center;
            color: var(--primary);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          @keyframes idle-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .dc-idle-title {
            font-size: 1.15rem; font-weight: 700;
            color: var(--text-main);
            margin: 0;
          }
          .dc-idle-sub {
            font-size: 0.82rem;
            color: var(--text-muted);
            margin: 0; line-height: 1.6;
            max-width: 220px;
          }

          /* Empty State */
          .dc-empty {
            grid-column: 1 / -1;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 0.9rem; padding: 4rem 2rem;
            color: var(--text-muted);
            text-align: center;
          }
          .dc-empty-icon {
            width: 76px; height: 76px;
            border-radius: var(--radius-lg);
            background: var(--bg-hover);
            border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center;
            color: var(--text-dim);
            box-shadow: var(--shadow-sm);
          }
          .dc-empty p { font-size: 0.88rem; margin: 0; font-weight: 600; }
          .dc-empty-inline { grid-column: 1 / -1; padding: 3rem; }

          /* Spinner */
          .dc-spin { animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}
