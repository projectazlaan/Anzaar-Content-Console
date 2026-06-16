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
  removeInstructionPreset,
  getMasterTemplates,
  addMasterTemplate,
  removeMasterTemplate,
  submitBulkDirections,
  submitSelection,
  approveProduct,
  submitBulkStatusUpdate
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
  Settings,
  X,
  ChevronLeft,
  CheckSquare,
  Square,
  Copy,
  Layers,
  Loader2,
  Camera,
  PenTool
} from "lucide-react";

export default function DirectorPage() {
  const [activeTab, setActiveTab] = useState("directions");
  const [viewingImage, setViewingImage] = useState<any>(null);
  const [activeVariationIndex, setActiveVariationIndex] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [presets, setPresets] = useState<{id: string, text: string}[]>([]);
  const [masterTemplates, setMasterTemplates] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [showMasterManager, setShowMasterManager] = useState(false);
  const [newPreset, setNewPreset] = useState("");
  const [newMasterName, setNewMasterName] = useState("");

  const [shootDir, setShootDir] = useState("");
  const [editDir, setEditDir] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetText, setEditingPresetText] = useState("");
  const [showShootPresetList, setShowShootPresetList] = useState(false);
  const [showEditPresetList, setShowEditPresetList] = useState(false);
  
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

  // Helper to get direct image URL
  const getDisplayUrl = (url: string | null, id?: string | null, size = 400) => {
    if (id) return `/api/image?id=${id}`;
    if (!url) return null;
    const match = url.match(/[-\w]{25,}/);
    if (match) return `/api/image?id=${match[0]}`;
    return url;
  };

  const openImageViewer = (product: any, index = 0) => {
    setViewingImage(product);
    setActiveVariationIndex(index);
  };

  // Real-time products listener
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Fetch Presets and Templates
  useEffect(() => {
    getInstructionPresets().then(setPresets);
    getMasterTemplates().then(setMasterTemplates);
  }, []);

  // Keyboard Shortcuts for Viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewingImage) return;
      if (e.key === "Escape") setViewingImage(null);
      if (e.key === "ArrowLeft" && viewingImage.variations?.length > 1) {
        setActiveVariationIndex(prev => prev === 0 ? viewingImage.variations.length - 1 : prev - 1);
      }
      if (e.key === "ArrowRight" && viewingImage.variations?.length > 1) {
        setActiveVariationIndex(prev => prev === viewingImage.variations.length - 1 ? 0 : prev + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingImage]);

  const handleAddPreset = async () => {
    if (!newPreset) return;
    const result = await addInstructionPreset(newPreset);
    setPresets([...presets, result]);
    setNewPreset("");
  };

  const handleQuickSavePreset = async (type: 'shoot' | 'edit') => {
    const text = type === 'shoot' ? shootDir : editDir;
    if (!text.trim()) {
      alert('Please enter some instructions first!');
      return;
    }
    
    const presetName = prompt(`Save this ${type === 'shoot' ? 'shoot' : 'edit'} instruction as preset:\n\n"${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"\n\nEnter preset name (or leave blank to use the text itself):`);
    
    if (presetName === null) return; // User cancelled
    
    try {
      const result = await addInstructionPreset(text.trim());
      setPresets([...presets, result]);
      alert(`${type === 'shoot' ? 'Shoot' : 'Edit'} instruction saved as preset successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to save preset');
    }
  };

  const handleRemovePreset = async (id: string) => {
    await removeInstructionPreset(id);
    setPresets(presets.filter(p => p.id !== id));
  };

  const handleEditPreset = (preset: {id: string, text: string}) => {
    setEditingPresetId(preset.id);
    setEditingPresetText(preset.text);
  };

  const handleUpdatePreset = async () => {
    if (!editingPresetId || !editingPresetText.trim()) return;
    // For now, we'll remove the old one and add a new one with updated text
    await removeInstructionPreset(editingPresetId);
    const result = await addInstructionPreset(editingPresetText.trim());
    setPresets(presets.map(p => p.id === editingPresetId ? result : p));
    setEditingPresetId(null);
    setEditingPresetText("");
  };

  const handleAddPresetFromTextarea = async (type: 'shoot' | 'edit') => {
    const text = type === 'shoot' ? shootDir : editDir;
    if (!text.trim()) {
      alert('Please enter some instructions first!');
      return;
    }
    
    try {
      const result = await addInstructionPreset(text.trim());
      setPresets(prev => [...prev, result]);
      alert(`${type === 'shoot' ? 'Shoot' : 'Edit'} preset added successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to add preset');
    }
  };

  const handleAddMaster = async () => {
    if (!newMasterName || !shootDir || !editDir) return;
    const result = await addMasterTemplate(newMasterName, shootDir, editDir);
    setMasterTemplates([...masterTemplates, result]);
    setNewMasterName("");
    setShowMasterManager(false);
  };

  const handleRemoveMaster = async (id: string) => {
    await removeMasterTemplate(id);
    setMasterTemplates(masterTemplates.filter(m => m.id !== id));
  };

  const applyMaster = (template: any) => {
    setShootDir(template.shoot);
    setEditDir(template.edit);
  };

  const handleSendDirection = async () => {
    setIsSending(true);
    try {
      let result;
      
      if (selectedIds.length > 0) {
        if (activeTab === "directions") {
          if (!shootDir || !editDir) {
            alert("Please fill in both Shoot and Edit directions");
            setIsSending(false);
            return;
          }
          result = await submitBulkDirections(selectedIds, shootDir, editDir);
        } else if (activeTab === "selections") {
          result = await submitBulkStatusUpdate(selectedIds, "Pending Edit");
        } else if (activeTab === "reviews") {
          result = await submitBulkStatusUpdate(selectedIds, "Completed");
        }
      } else if (selectedProduct) {
        if (activeTab === "directions") {
          if (!shootDir || !editDir) {
            alert("Please fill in both Shoot and Edit directions");
            setIsSending(false);
            return;
          }
          result = await submitDirection(selectedProduct.id, shootDir, editDir);
        } else if (activeTab === "selections") {
          // For single selection, we might want to allow picking specific assets
          // but for now we move all to Pending Edit
          result = await submitSelection(selectedProduct.id, selectedProduct.rawUrls || []);
        } else if (activeTab === "reviews") {
          result = await approveProduct(selectedProduct.id);
        }
      }

      if (result?.success) {
        setSelectedIds([]);
        setSelectedProduct(null);
        setShootDir("");
        setEditDir("");
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
      } else if (result) {
        alert("Error: " + result.error);
      }
    } catch (error: any) {
      alert("System Error: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  // Per-product read tracking for notification dots
  const [readProductIds, setReadProductIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('directorReadProducts');
    if (saved) {
      try {
        setReadProductIds(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  const markProductAsRead = (id: string) => {
    if (!readProductIds.includes(id)) {
      const newReadIds = [...readProductIds, id];
      setReadProductIds(newReadIds);
      localStorage.setItem('directorReadProducts', JSON.stringify(newReadIds));
    }
  };

  const hasUnread = (status: string) => {
    const tabProducts = products.filter(p => p.status === status);
    return tabProducts.some(p => !readProductIds.includes(p.id));
  };

  const counts = {
    directions: products.filter(p => p.status === 'Pending Direction').length,
    selections: products.filter(p => p.status === 'Pending Selection').length,
    reviews: products.filter(p => p.status === 'Pending Review').length
  };

  const handleTabClick = (tab: "directions" | "selections" | "reviews") => {
    setActiveTab(tab);
    setSelectedIds([]);
    // Reset file manager when switching tabs
    if (tab === "selections") {
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
        // Deselect if same ratio clicked
        newMap.delete(photoUrl);
      } else {
        // Set or update ratio
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
      alert("Please select at least one photo");
      return;
    }

    setIsSending(true);
    try {
      // Convert Map to Record for server action
      const selectedAssets: Record<string, 'three-quarter' | 'half' | 'full'> = {};
      selectedPhotos.forEach((ratio, url) => {
        selectedAssets[url] = ratio;
      });
      
      const result = await submitSelection(selectedFolder.id, selectedAssets);
      if (result?.success) {
        setSelectedPhotos(new Map());
        setSelectedFolder(null);
        setFileManagerBreadcrumb([]);
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
      } else if (result) {
        alert("Error: " + result.error);
      }
    } catch (error: any) {
      alert("System Error: " + error.message);
    } finally {
      setIsSending(false);
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
            <div className="header-info">
              <h1 className="text-gradient">Director Control Center</h1>
              <p>Manage the production flow and provide critical directions.</p>
            </div>

            <div className="header-actions">
              <div className="tab-switcher glass">
                {(["directions", "selections", "reviews"] as const).map(tab => (
                  <button 
                    key={tab}
                    className={activeTab === tab ? "active" : ""} 
                    onClick={() => handleTabClick(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <section className="stats-row grid-dashboard">
            <div className={`stat-card glass border-indigo ${activeTab === 'directions' ? 'active-card' : ''}`} onClick={() => handleTabClick('directions')}>
              {hasUnread('Pending Direction') && <div className="unread-dot"></div>}
              <Clock size={20} className="stat-icon" />
              <div className="stat-info">
                <span>{counts.directions}</span>
                <p>Pending Direction</p>
              </div>
            </div>
            <div className={`stat-card glass border-yellow ${activeTab === 'selections' ? 'active-card' : ''}`} onClick={() => handleTabClick('selections')}>
              {hasUnread('Pending Selection') && <div className="unread-dot"></div>}
              <AlertCircle size={20} className="stat-icon" />
              <div className="stat-info">
                <span>{counts.selections}</span>
                <p>Pending Selection</p>
              </div>
            </div>
            <div className={`stat-card glass border-green ${activeTab === 'reviews' ? 'active-card' : ''}`} onClick={() => handleTabClick('reviews')}>
              {hasUnread('Pending Review') && <div className="unread-dot"></div>}
              <CheckCircle2 size={20} className="stat-icon" />
              <div className="stat-info">
                <span>{counts.reviews}</span>
                <p>Pending Review</p>
              </div>
            </div>
          </section>

          <div className="content-grid">
            <div className="list-container glass">
              {/* File Manager View for Selections and Directions Tab */}
              {(activeTab === "selections" || activeTab === "directions") ? (
                <div className="file-manager">
                  {/* File Manager Header */}
                  <div className="file-manager-header">
                    <div className="breadcrumb-nav">
                      {selectedFolder ? (
                        <>
                          <button className="back-btn" onClick={goBack}>
                            <ChevronLeft size={20} />
                          </button>
                          <span className="breadcrumb-item" onClick={goBack}>Products</span>
                          <ChevronRight size={16} className="breadcrumb-separator" />
                          <span className="breadcrumb-item active">{selectedFolder.name}</span>
                        </>
                      ) : (
                        <span className="breadcrumb-item active">Products - {activeTab === "directions" ? "Pending Direction" : "Pending Selection"}</span>
                      )}
                    </div>
                    
                    {!selectedFolder && (
                      <div className="view-toggles">
                        <button 
                          className={`view-toggle-btn ${fileManagerView === 'grid' ? 'active' : ''}`}
                          onClick={() => setFileManagerView('grid')}
                        >
                          <Layers size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* File Manager Content */}
                  {!selectedFolder ? (
                    // Product Folders Grid
                    <div className="file-grid">
                      {filteredProducts.map((product) => {
                        const thumbnailUrl = getDisplayUrl(product.thumbnailUrl) || getDisplayUrl(product.mainDesignUrl || product.designUrl, product.mainDesignId || product.designId);
                        const photoCount = (product.rawUrls || []).length || (product.variations || []).length || 1;
                        
                        return (
                          <div 
                            key={product.id} 
                            className="file-folder-item"
                            onClick={() => openFolder(product)}
                          >
                            <div className="folder-icon-wrapper">
                              <div className="folder-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
                                </svg>
                              </div>
                              {thumbnailUrl && (
                                <div className="folder-preview">
                                  <img src={thumbnailUrl} alt={product.name} />
                                </div>
                              )}
                            </div>
                            <div className="folder-info">
                              <h4>{product.name}</h4>
                              <p className="folder-meta">
                                <span>{photoCount} photo{photoCount > 1 ? 's' : ''}</span>
                                <span className="dot">•</span>
                                <span>{product.category}</span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <div className="empty-state-list">No products {activeTab === "directions" ? "pending direction" : "pending selection"}.</div>
                      )}
                    </div>
                  ) : (
                    // Photos Inside Folder
                    <div className="photo-grid-view">
                      {/* Selection Bar - Only for Selections Tab */}
                      {activeTab === "selections" && (selectedFolder.rawUrls || []).length > 0 && (
                        <div className="selection-toolbar">
                          <button className="select-all-btn" onClick={() => selectAllWithRatio('full')}>
                            <span>Select All Full</span>
                          </button>
                          {selectedPhotos.size > 0 && (
                            <button className="clear-selections-btn" onClick={clearSelections}>
                              <span>Clear All ({selectedPhotos.size})</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Photos Grid */}
                      <div className="photos-grid">
                        {(() => {
                          // For Pending Direction: use variations or design images
                          // For Pending Selection: use rawUrls
                          const imagesToShow = activeTab === "directions" 
                            ? (selectedFolder.variations && selectedFolder.variations.length > 0 
                                ? selectedFolder.variations.map((v: any) => v.url || v)
                                : [selectedFolder.mainDesignUrl || selectedFolder.designUrl].filter(Boolean))
                            : (selectedFolder.rawUrls || []);
                          
                          return imagesToShow.map((photoUrl: string, idx: number) => {
                            const displayUrl = getDisplayUrl(photoUrl, typeof photoUrl === 'string' && photoUrl.length > 20 ? photoUrl : undefined);
                            const selectedRatio = selectedPhotos.get(photoUrl);
                            
                            return (
                              <div 
                                key={idx} 
                                className={`photo-card ${activeTab === "selections" && selectedRatio ? 'selected' : ''}`}
                              >
                                {/* Crop Ratio Selector Overlay - Only for Selections Tab */}
                                {activeTab === "selections" && (
                                  <div className="crop-ratio-selector" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                      className={`crop-btn ${selectedRatio === 'three-quarter' ? 'active' : ''}`}
                                      onClick={() => selectCropRatio(photoUrl, 'three-quarter')}
                                      title="Three Quarter"
                                    >
                                      <span>3/4</span>
                                    </button>
                                    <button 
                                      className={`crop-btn ${selectedRatio === 'half' ? 'active' : ''}`}
                                      onClick={() => selectCropRatio(photoUrl, 'half')}
                                      title="Half"
                                    >
                                      <span>1/2</span>
                                    </button>
                                    <button 
                                      className={`crop-btn ${selectedRatio === 'full' ? 'active' : ''}`}
                                      onClick={() => selectCropRatio(photoUrl, 'full')}
                                      title="Full"
                                    >
                                      <span>Full</span>
                                    </button>
                                  </div>
                                )}

                                {/* Watermark Display - Only for Selections Tab */}
                                {activeTab === "selections" && selectedRatio && (
                                  <div className={`crop-watermark ${selectedRatio}`}>
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
                                      setViewingImage({ 
                                        name: selectedFolder.name,
                                        variations: variations
                                      });
                                      setActiveVariationIndex(idx);
                                    }}
                                  />
                                ) : (
                                  <div className="photo-placeholder">{idx + 1}</div>
                                )}
                                <div className="photo-overlay">
                                  <span className="photo-number">{idx + 1}</span>
                                </div>
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
                            <div className="empty-state-list">No photos available for this product.</div>
                          );
                        })()}
                      </div>

                      {/* Send Button */}
                      {(activeTab === "selections" && selectedPhotos.size > 0) && (
                        <div className="send-selection-bar animate-scale glass">
                          <div className="send-info">
                            <Camera size={20} />
                            <span>Send <strong>{selectedPhotos.size}</strong> photo{selectedPhotos.size > 1 ? 's' : ''} to Editor</span>
                          </div>
                          <button className="send-btn" onClick={sendToEditing} disabled={isSending}>
                            {isSending ? (
                              <>
                                <Loader2 className="spinner" size={18} />
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <Send size={18} />
                                <span>Send to Editor</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      
                      {/* View Photos Bar for Directions Tab */}
                      {activeTab === "directions" && (() => {
                        const imagesToShow = (selectedFolder.variations && selectedFolder.variations.length > 0 
                          ? selectedFolder.variations 
                          : [selectedFolder.mainDesignUrl || selectedFolder.designUrl].filter(Boolean));
                        return (
                          <div className="send-selection-bar animate-scale glass">
                            <div className="send-info">
                              <Camera size={20} />
                              <span>Viewing <strong>{imagesToShow.length}</strong> photo{imagesToShow.length > 1 ? 's' : ''}</span>
                            </div>
                            <button className="send-btn" onClick={() => goBack()}>
                              <ChevronLeft size={18} />
                              <span>Back to Products</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="list-header">
                    <div className="search-bar">
                      <Search size={18} />
                      <input type="text" placeholder="Search products..." />
                    </div>
                    <div className="list-actions">
                      <button className={`bulk-select-btn ${selectedIds.length > 0 ? 'active' : ''}`} onClick={selectAll}>
                        {selectedIds.length === filteredProducts.length ? <CheckSquare size={18} /> : <Square size={18} />}
                        <span>{selectedIds.length > 0 ? `Selected (${selectedIds.length})` : 'Select All'}</span>
                      </button>
                      <button className="filter-btn"><Filter size={18} /></button>
                    </div>
                  </div>

                  {selectedIds.length > 0 && (
                    <div className="bulk-bar animate-scale glass">
                      <div className="bulk-info">
                        <Layers size={20} />
                        <span>Applying directions to <strong>{selectedIds.length}</strong> products</span>
                      </div>
                      <div className="bulk-controls">
                        <button className="cancel-bulk" onClick={() => setSelectedIds([])}>Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="product-list">
                {filteredProducts.map((product) => {
                  const thumbnailUrl = getDisplayUrl(product.thumbnailUrl) || getDisplayUrl(product.mainDesignUrl || product.designUrl, product.mainDesignId || product.designId);
                  const isSelected = selectedIds.includes(product.id);
                  const isUnread = !readProductIds.includes(product.id);
                  const hasVariations = product.variations && product.variations.length > 1;
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`product-item ${selectedProduct?.id === product.id ? 'active' : ''} ${isSelected ? 'marked' : ''}`}
                      onClick={() => {
                        setSelectedProduct(product);
                        markProductAsRead(product.id);
                      }}
                    >
                      <div className="product-main">
                        <div className="product-checkbox" onClick={(e) => toggleSelect(product.id, e)}>
                          {isSelected ? <CheckSquare size={20} className="text-primary" /> : <Square size={20} />}
                        </div>
                        <div className="product-thumb-group" onClick={(e) => { e.stopPropagation(); openImageViewer(product); }}>
                          {/* Main Thumbnail */}
                          <div className="product-thumb">
                            {thumbnailUrl ? (
                              <img 
                                src={thumbnailUrl} 
                                alt={product.name} 
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const placeholder = target.parentElement?.querySelector('.thumb-placeholder') as HTMLElement;
                                  if (placeholder) placeholder.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className="thumb-placeholder" style={{ display: thumbnailUrl ? 'none' : 'flex' }}>{product.name?.charAt(0)}</div>
                          </div>
                          
                          {/* Additional Variation Thumbnails */}
                          {hasVariations && (
                            <div className="variation-thumbs">
                              {product.variations.slice(1, 4).map((variation: any, idx: number) => {
                                const varUrl = getDisplayUrl(variation.url, variation.id, 100);
                                return (
                                  <div key={idx} className="variation-thumb">
                                    {varUrl ? (
                                      <img src={varUrl} alt={`Variation ${idx + 2}`} />
                                    ) : (
                                      <span>{idx + 2}</span>
                                    )}
                                  </div>
                                );
                              })}
                              {product.variations.length > 4 && (
                                <div className="variation-count">
                                  +{product.variations.length - 4}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="product-details">
                          <div className="product-title-row">
                            <h4>{product.name}</h4>
                            {isUnread && <span className="item-unread-dot"></span>}
                            {hasVariations && (
                              <span className="variation-badge">
                                {product.variations.length}
                              </span>
                            )}
                          </div>
                          <div className="product-meta">
                            <span>{product.category}</span>
                            <span className="dot">•</span>
                            <span>{product.createdAt?.toDate ? product.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="product-actions">
                        <ChevronRight size={18} className="arrow-icon" />
                      </div>
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && <div className="empty-state-list">No products found in this stage.</div>}
                  </div>
                </div>
              )}
            </div>

            <aside className="direction-panel">
              {(selectedProduct || selectedIds.length > 0 || (selectedFolder && activeTab === "directions")) ? (
                <div className="direction-form">
                  {/* Product Header */}
                  <div className="panel-product-header">
                    {!selectedIds.length && selectedFolder && activeTab === "directions" ? (
                      <div 
                        className="panel-product-image"
                        onClick={() => {
                          const variations = (selectedFolder.rawUrls || []).map((url: string, i: number) => ({
                            url,
                            id: url.match(/[-\w]{25,}/)?.[0] || `photo-${i}`
                          }));
                          setViewingImage({ 
                            name: selectedFolder.name,
                            variations: variations
                          });
                          setActiveVariationIndex(0);
                        }}
                      >
                        <img 
                          src={getDisplayUrl((selectedFolder.rawUrls || [])[0]) || getDisplayUrl(selectedFolder.thumbnailUrl) || getDisplayUrl(selectedFolder.mainDesignUrl || selectedFolder.designUrl, selectedFolder.mainDesignId || selectedFolder.designId) || ''} 
                          alt={selectedFolder.name} 
                        />
                      </div>
                    ) : !selectedIds.length && (
                      <div 
                        className="panel-product-image"
                        onClick={() => openImageViewer(selectedProduct)}
                      >
                        <img 
                          src={getDisplayUrl(selectedProduct.mainDesignUrl || selectedProduct.designUrl, (selectedProduct.mainDesignId || selectedProduct.designId) as string | undefined, 400) || ''} 
                          alt={selectedProduct.name} 
                        />
                      </div>
                    )}
                    <div className="panel-product-info">
                      <h2>
                        {selectedIds.length > 0 
                          ? `${selectedIds.length} Products Selected` 
                          : selectedFolder && activeTab === "directions" 
                            ? selectedFolder.name 
                            : selectedProduct.name}
                      </h2>
                      {selectedIds.length === 0 && (
                        <p className="product-category">
                          {selectedFolder && activeTab === "directions" 
                            ? selectedFolder.category 
                            : selectedProduct.category}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="panel-divider" />

                  {/* Shoot Direction */}
                  <div className="panel-section">
                    <label className="section-label">SHOOT DIRECTION</label>
                    <div className="textarea-with-save">
                      <textarea 
                        className="panel-textarea" 
                        placeholder="Enter shoot instructions..." 
                        value={shootDir} 
                        onChange={(e) => setShootDir(e.target.value)}
                      />
                      <button 
                        className="btn-add-preset-inline" 
                        onClick={() => handleAddPresetFromTextarea('shoot')}
                        title="Save as preset"
                      >
                        +
                      </button>
                    </div>
                    <div className="preset-dropdown-wrapper">
                      <div className="preset-dropdown-row">
                        <select 
                          className="panel-preset-select" 
                          onChange={(e) => { 
                            if(e.target.value) { 
                              setShootDir(prev => prev ? `${prev}\n${e.target.value}` : e.target.value); 
                              e.target.value=""; 
                            } 
                          }}
                        >
                          <option value="">Quick add preset...</option>
                          {presets.map(p => <option key={p.id} value={p.text}>{p.text}</option>)}
                        </select>
                        <button 
                          className="btn-toggle-preset-list" 
                          onClick={() => setShowShootPresetList(!showShootPresetList)}
                          title="Manage presets"
                        >
                          <Layers size={16} />
                        </button>
                        <button 
                          className="btn-add-new-preset" 
                          onClick={async () => {
                            const newPresetText = prompt('Enter new shoot direction preset:');
                            if(newPresetText && newPresetText.trim()) {
                              const result = await addInstructionPreset(newPresetText.trim());
                              setPresets(prev => [...prev, result]);
                            }
                          }}
                          title="Add new preset"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      
                      {/* Preset List Dropdown */}
                      {showShootPresetList && presets.length > 0 && (
                        <div className="preset-dropdown-list animate-scale">
                          {presets.map(p => (
                            <div key={p.id} className="preset-dropdown-item">
                              {editingPresetId === p.id ? (
                                <input
                                  type="text"
                                  className="preset-edit-input"
                                  value={editingPresetText}
                                  onChange={(e) => setEditingPresetText(e.target.value)}
                                  onBlur={handleUpdatePreset}
                                  onKeyDown={(e) => {
                                    if(e.key === 'Enter') handleUpdatePreset();
                                    if(e.key === 'Escape') {
                                      setEditingPresetId(null);
                                      setEditingPresetText("");
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span className="preset-dropdown-text">{p.text}</span>
                              )}
                              <div className="preset-item-actions">
                                <button 
                                  className="btn-preset-edit"
                                  onClick={() => handleEditPreset(p)}
                                  title="Edit preset"
                                >
                                  <PenTool size={14} />
                                </button>
                                <button 
                                  className="btn-preset-delete"
                                  onClick={() => handleRemovePreset(p.id)}
                                  title="Delete preset"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit Direction */}
                  <div className="panel-section">
                    <label className="section-label">EDIT DIRECTION</label>
                    <div className="textarea-with-save">
                      <textarea 
                        className="panel-textarea" 
                        placeholder="Enter edit instructions..." 
                        value={editDir} 
                        onChange={(e) => setEditDir(e.target.value)}
                      />
                      <button 
                        className="btn-add-preset-inline" 
                        onClick={() => handleAddPresetFromTextarea('edit')}
                        title="Save as preset"
                      >
                        +
                      </button>
                    </div>
                    <div className="preset-dropdown-wrapper">
                      <div className="preset-dropdown-row">
                        <select 
                          className="panel-preset-select" 
                          onChange={(e) => { 
                            if(e.target.value) { 
                              setEditDir(prev => prev ? `${prev}\n${e.target.value}` : e.target.value); 
                              e.target.value=""; 
                            } 
                          }}
                        >
                          <option value="">Quick add preset...</option>
                          {presets.map(p => <option key={p.id} value={p.text}>{p.text}</option>)}
                        </select>
                        <button 
                          className="btn-toggle-preset-list" 
                          onClick={() => setShowEditPresetList(!showEditPresetList)}
                          title="Manage presets"
                        >
                          <Layers size={16} />
                        </button>
                        <button 
                          className="btn-add-new-preset" 
                          onClick={async () => {
                            const newPresetText = prompt('Enter new edit direction preset:');
                            if(newPresetText && newPresetText.trim()) {
                              const result = await addInstructionPreset(newPresetText.trim());
                              setPresets(prev => [...prev, result]);
                            }
                          }}
                          title="Add new preset"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      
                      {/* Preset List Dropdown */}
                      {showEditPresetList && presets.length > 0 && (
                        <div className="preset-dropdown-list animate-scale">
                          {presets.map(p => (
                            <div key={p.id} className="preset-dropdown-item">
                              {editingPresetId === p.id ? (
                                <input
                                  type="text"
                                  className="preset-edit-input"
                                  value={editingPresetText}
                                  onChange={(e) => setEditingPresetText(e.target.value)}
                                  onBlur={handleUpdatePreset}
                                  onKeyDown={(e) => {
                                    if(e.key === 'Enter') handleUpdatePreset();
                                    if(e.key === 'Escape') {
                                      setEditingPresetId(null);
                                      setEditingPresetText("");
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span className="preset-dropdown-text">{p.text}</span>
                              )}
                              <div className="preset-item-actions">
                                <button 
                                  className="btn-preset-edit"
                                  onClick={() => handleEditPreset(p)}
                                  title="Edit preset"
                                >
                                  <PenTool size={14} />
                                </button>
                                <button 
                                  className="btn-preset-delete"
                                  onClick={() => handleRemovePreset(p.id)}
                                  title="Delete preset"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="panel-divider" />

                  {/* Master Template */}
                  <div className="panel-section">
                    <div className="template-row">
                      <span className="template-label">🎨 Master Template</span>
                      <div className="template-controls">
                        <select className="panel-template-select" onChange={(e) => {
                          const t = masterTemplates.find(m => m.id === e.target.value);
                          if (t) applyMaster(t);
                        }}>
                          <option value="">Apply ▼</option>
                          {masterTemplates.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <button className="btn-save-template" onClick={() => setShowMasterManager(true)}>
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Send Button */}
                  <button 
                    className="panel-send-btn" 
                    onClick={handleSendDirection} 
                    disabled={isSending}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="spinner" size={20} />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>
                        {selectedIds.length > 0 
                          ? `Send to ${selectedIds.length} Products` 
                          : activeTab === "directions" ? "Send to Shooter" 
                          : activeTab === "selections" ? "Send to Editor" 
                          : "Approve & Complete"}
                      </span>
                    )}
                  </button>

                  {sendSuccess && (
                    <div className="panel-success-msg">
                      ✓ Successfully sent!
                    </div>
                  )}
                </div>
              ) : (
                <div className="panel-empty"><Send size={48} /><p>Select products to provide directions</p></div>
              )}
            </aside>
          </div>
        </div>

        {/* Master Template Manager Modal */}
        {showMasterManager && (
          <div className="modal-overlay" onClick={() => setShowMasterManager(false)}>
            <div className="modal-content glass animate-scale" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3>Save as Master Template</h3><button onClick={() => setShowMasterManager(false)}><X size={20} /></button></div>
              <div className="preset-input">
                <input type="text" placeholder="Template Name (e.g. Standard Apparel)" value={newMasterName} onChange={e => setNewMasterName(e.target.value)} />
                <button onClick={handleAddMaster} className="bg-gradient"><Plus size={18} /></button>
              </div>
              <div className="preset-list">
                {masterTemplates.map(m => (
                  <div key={m.id} className="preset-item">
                    <span>{m.name}</span>
                    <button onClick={() => handleRemoveMaster(m.id)} className="delete-btn"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Global Modals Portal Area */}
        <div className="modals-portal">
          {showPresetManager && (
            <div className="modal-overlay" onClick={() => setShowPresetManager(false)}>
              <div className="modal-content glass animate-scale" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h3>Manage Instruction Presets</h3><button onClick={() => setShowPresetManager(false)}><X size={20} /></button></div>
                <div className="preset-input">
                  <input type="text" placeholder="New preset..." value={newPreset} onChange={e => setNewPreset(e.target.value)} />
                  <button onClick={handleAddPreset} className="bg-gradient"><Plus size={18} /></button>
                </div>
                <div className="preset-list">
                  {presets.map(p => (
                    <div key={p.id} className="preset-item"><span>{p.text}</span><button onClick={() => handleRemovePreset(p.id)} className="delete-btn"><Trash2 size={16} /></button></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewingImage && (
            <div className="dynamic-viewer-overlay" onClick={() => setViewingImage(null)}>
              <div className="viewer-floating-header" onClick={e => e.stopPropagation()}>
                <div className="v-info"><h2>{viewingImage.name}</h2>{viewingImage.variations?.length > 0 && <p>Variation {activeVariationIndex + 1} of {viewingImage.variations.length}</p>}</div>
                <button className="v-close" onClick={() => setViewingImage(null)}><X size={24} /></button>
              </div>
              <div className="viewer-main-stage">
                {viewingImage.variations?.length > 1 && <button className="v-nav-btn prev" onClick={(e) => { e.stopPropagation(); setActiveVariationIndex(prev => prev === 0 ? viewingImage.variations.length - 1 : prev - 1); }}><ChevronLeft size={32} /></button>}
                <div className="v-image-wrapper animate-zoom" onClick={e => e.stopPropagation()}>
                  <img src={viewingImage.variations?.length > 0 ? getDisplayUrl(viewingImage.variations[activeVariationIndex].url, viewingImage.variations[activeVariationIndex].id as string | undefined, 1200) || '' : getDisplayUrl(viewingImage.mainDesignUrl || viewingImage.designUrl, (viewingImage.mainDesignId || viewingImage.designId) as string | undefined, 1200) || ''} alt="Preview" />
                </div>
                {viewingImage.variations?.length > 1 && <button className="v-nav-btn next" onClick={(e) => { e.stopPropagation(); setActiveVariationIndex(prev => prev === viewingImage.variations.length - 1 ? 0 : prev + 1); }}><ChevronRight size={32} /></button>}
              </div>
              {viewingImage.variations?.length > 1 && (
                <div className="viewer-bottom-bar" onClick={e => e.stopPropagation()}>
                  <div className="v-thumb-list">
                    {viewingImage.variations.map((v: any, idx: number) => {
                      const photoUrl = v.url;
                      const selectedRatio = selectedFolder && selectedPhotos.get(photoUrl);
                      
                      return (
                        <div key={idx} className={`v-mini-thumb ${activeVariationIndex === idx ? 'active' : ''} ${selectedRatio ? 'has-selection' : ''}`}>
                          <img 
                            src={getDisplayUrl(v.url, v.id as string | undefined, 100) || ''} 
                            alt={`thumb ${idx + 1}`}
                            onClick={() => setActiveVariationIndex(idx)}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          {/* Crop Ratio Buttons on Thumbnail */}
                          <div className="v-thumb-crop-selector" onClick={(e) => e.stopPropagation()}>
                            <button 
                              className={`v-crop-btn ${selectedRatio === 'three-quarter' ? 'active' : ''}`}
                              onClick={() => selectedFolder && selectCropRatio(photoUrl, 'three-quarter')}
                              title="Three Quarter"
                            >
                              3/4
                            </button>
                            <button 
                              className={`v-crop-btn ${selectedRatio === 'half' ? 'active' : ''}`}
                              onClick={() => selectedFolder && selectCropRatio(photoUrl, 'half')}
                              title="Half"
                            >
                              1/2
                            </button>
                            <button 
                              className={`v-crop-btn ${selectedRatio === 'full' ? 'active' : ''}`}
                              onClick={() => selectedFolder && selectCropRatio(photoUrl, 'full')}
                              title="Full"
                            >
                              Full
                            </button>
                          </div>
                          {/* Watermark */}
                          {selectedRatio && (
                            <div className={`v-thumb-watermark ${selectedRatio}`}>
                              {selectedRatio === 'three-quarter' ? '3/4' : selectedRatio === 'half' ? '1/2' : 'Full'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <style jsx>{`
          .director-page { padding: 2rem; max-width: 1600px; margin: 0 auto; }
          .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
          .text-gradient { background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          
          .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); margin-bottom: 2rem; gap: 1.5rem; }
          .stat-card { padding: 1.5rem; border-radius: 24px; display: flex; align-items: center; gap: 1.2rem; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; border: 1px solid transparent; }
          .stat-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.05); }
          .stat-card.active-card { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.3); box-shadow: 0 10px 30px rgba(99, 102, 241, 0.15); }
          .stat-card.active-card .stat-icon { color: #6366f1; }
          
          .unread-dot { position: absolute; top: 1.2rem; right: 1.2rem; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); animation: pulseDot 2s infinite; }
          @keyframes pulseDot { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }

          .stat-icon { color: rgba(255,255,255,0.5); transition: 0.3s; }
          .stat-info span { font-size: 1.8rem; font-weight: 800; line-height: 1; display: block; }
          .stat-info p { font-size: 0.75rem; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-top: 0.3rem; }

          .content-grid { display: grid; grid-template-columns: 1fr 450px; gap: 2rem; align-items: start; }
          .list-container { border-radius: 28px; padding: 2rem; min-height: 700px; position: relative; }
          .list-header { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 2rem; }
          .search-bar { flex: 1; position: relative; }
          .search-bar input { width: 100%; padding: 0.9rem 1rem 0.9rem 3rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; color: white; outline: none; }
          .search-bar svg { position: absolute; left: 1.2rem; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); }

          .list-actions { display: flex; gap: 1rem; }
          .bulk-select-btn { display: flex; align-items: center; gap: 0.6rem; padding: 0 1.5rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; color: rgba(255,255,255,0.5); font-size: 0.85rem; font-weight: 600; transition: 0.3s; }
          .bulk-select-btn.active { background: rgba(99, 102, 241, 0.12); border-color: rgba(99, 102, 241, 0.3); color: #6366f1; }

          .bulk-bar { position: absolute; top: 2rem; left: 2rem; right: 2rem; height: 60px; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 18px; backdrop-filter: blur(25px); z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; box-shadow: 0 15px 40px rgba(0,0,0,0.4); }
          .bulk-info { display: flex; align-items: center; gap: 1rem; color: white; font-weight: 600; }
          .cancel-bulk { font-size: 0.8rem; font-weight: 800; color: #f87171; text-transform: uppercase; letter-spacing: 0.05em; }

          .product-list { display: flex; flex-direction: column; gap: 1rem; }
          .product-item { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem; background: rgba(255, 255, 255, 0.02); border-radius: 22px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; }
          .product-item:hover { background: rgba(255, 255, 255, 0.04); transform: translateX(5px); }
          .product-item.active { background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.25); }
          .product-item.marked { border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.05); }

          .product-main { display: flex; align-items: center; gap: 1.5rem; }
          .product-checkbox { color: rgba(255,255,255,0.15); transition: 0.2s; }
          .product-checkbox:hover { transform: scale(1.1); color: #6366f1; }
          .product-checkbox .text-primary { color: #6366f1; }

          .product-thumb-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            position: relative;
          }

          .product-thumb { width: 80px; height: 80px; background: linear-gradient(135deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(225deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(315deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, #1e293b 25%, transparent 25%); background-size: 20px 20px; background-color: #0f172a; border-radius: 16px; overflow: hidden; position: relative; border: 2px solid rgba(255,255,255,0.08); transition: 0.3s; box-shadow: 0 5px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; }
          .product-item:hover .product-thumb { transform: scale(1.05); border-color: #6366f1; }
          .product-thumb img { width: 100%; height: 100%; object-fit: contain; display: block; }
          .thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; font-weight: 800; font-size: 1.5rem; }

          .variation-thumbs {
            display: flex;
            align-items: center;
            gap: 0.375rem;
          }

          .variation-thumb {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid rgba(255,255,255,0.1);
            background: linear-gradient(135deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(225deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(315deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, #1e293b 25%, transparent 25%);
            background-size: 12px 12px;
            background-color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            position: relative;
          }

          .variation-thumb:nth-child(1) {
            transform: translateY(-8px);
          }

          .variation-thumb:nth-child(2) {
            transform: translateY(0);
          }

          .variation-thumb:nth-child(3) {
            transform: translateY(8px);
          }

          .product-item:hover .variation-thumb:nth-child(1) {
            transform: translateY(-12px) scale(1.1);
          }

          .product-item:hover .variation-thumb:nth-child(2) {
            transform: translateY(0) scale(1.1);
          }

          .product-item:hover .variation-thumb:nth-child(3) {
            transform: translateY(12px) scale(1.1);
          }

          .variation-thumb img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .variation-thumb span {
            color: rgba(255,255,255,0.5);
            font-size: 0.7rem;
            font-weight: 700;
          }

          .variation-count {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            border: 2px solid rgba(99, 102, 241, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.7rem;
            font-weight: 800;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
            transform: translateY(8px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .product-item:hover .variation-count {
            transform: translateY(12px) scale(1.1);
          }

          .variation-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.2rem 0.5rem;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            font-size: 0.7rem;
            font-weight: 800;
            border-radius: 12px;
            margin-left: 0.5rem;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          }
          
          .product-title-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
          .product-details h4 { font-size: 1.1rem; letter-spacing: -0.01em; margin: 0; }
          .item-unread-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6); animation: pulseDot 2s infinite; display: inline-block; }
          
          .product-meta { display: flex; align-items: center; gap: 0.7rem; color: rgba(255,255,255,0.35); font-size: 0.85rem; }
          .arrow-icon { color: rgba(255,255,255,0.05); }

          .direction-panel { 
            padding: 0;
            border-radius: 20px; 
            position: sticky; 
            top: 2rem; 
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            max-height: calc(100vh - 4rem);
            overflow-y: auto;
          }

          .direction-form {
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          /* Product Header */
          .panel-product-header {
            display: flex;
            gap: 1.5rem;
            align-items: flex-start;
          }

          .panel-product-image {
            width: 100px;
            height: 100px;
            border-radius: 12px;
            overflow: hidden;
            flex-shrink: 0;
            cursor: pointer;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.03);
          }

          .panel-product-image img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .panel-product-info h2 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 0.5rem 0;
            line-height: 1.3;
          }

          .product-category {
            font-size: 0.875rem;
            color: rgba(255,255,255,0.5);
            margin: 0;
          }

          .panel-divider {
            height: 1px;
            background: rgba(255,255,255,0.08);
            margin: 0.5rem 0;
          }

          /* Sections */
          .panel-section {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .section-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: rgba(255,255,255,0.6);
            letter-spacing: 0.05em;
            margin: 0;
          }

          .panel-textarea {
            width: 100%;
            min-height: 120px;
            padding: 1rem;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            font-size: 0.95rem;
            line-height: 1.6;
            color: #ffffff;
            background: rgba(0,0,0,0.2);
            outline: none;
            resize: vertical;
            font-family: inherit;
          }

          .panel-textarea:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
          }

          .panel-textarea::placeholder {
            color: rgba(255,255,255,0.3);
          }

          .textarea-with-save {
            position: relative;
          }

          .btn-add-preset-inline {
            position: absolute;
            bottom: 12px;
            right: 12px;
            width: 32px;
            height: 32px;
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 8px;
            color: #10b981;
            font-size: 1.25rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .btn-add-preset-inline:hover {
            background: rgba(16, 185, 129, 0.25);
            border-color: #10b981;
            transform: scale(1.05);
          }

          .preset-dropdown-row {
            display: flex;
            gap: 0.5rem;
            align-items: center;
          }

          .preset-dropdown-wrapper {
            position: relative;
          }

          .btn-toggle-preset-list {
            width: 38px;
            height: 38px;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 8px;
            color: #6366f1;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .btn-toggle-preset-list:hover {
            background: rgba(99, 102, 241, 0.2);
            border-color: #6366f1;
            transform: scale(1.05);
          }

          .btn-toggle-preset-list.active {
            background: rgba(99, 102, 241, 0.25);
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }

          .preset-dropdown-list {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 12px;
            box-shadow: 
              0 10px 25px rgba(0, 0, 0, 0.1),
              0 4px 10px rgba(0, 0, 0, 0.05);
            max-height: 300px;
            overflow-y: auto;
            z-index: 100;
            padding: 0.5rem;
          }

          .preset-dropdown-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 0.875rem;
            background: rgba(248, 250, 252, 0.6);
            border-radius: 8px;
            border: 1px solid transparent;
            transition: all 0.2s;
            margin-bottom: 0.375rem;
          }

          .preset-dropdown-item:last-child {
            margin-bottom: 0;
          }

          .preset-dropdown-item:hover {
            background: #ffffff;
            border-color: rgba(99, 102, 241, 0.2);
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
          }

          .preset-dropdown-text {
            flex: 1;
            font-size: 0.85rem;
            color: #0f172a;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-right: 0.5rem;
          }

          .btn-add-new-preset {
            width: 38px;
            height: 38px;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 8px;
            color: #6366f1;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .btn-add-new-preset:hover {
            background: rgba(99, 102, 241, 0.2);
            border-color: #6366f1;
            transform: scale(1.05);
          }

          .preset-list-compact {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            max-height: 200px;
            overflow-y: auto;
            padding-right: 0.5rem;
          }

          .preset-item-compact {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.6rem 0.8rem;
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.05);
            transition: all 0.2s;
          }

          .preset-item-compact:hover {
            background: rgba(255,255,255,0.05);
            border-color: rgba(255,255,255,0.1);
          }

          .preset-text {
            flex: 1;
            font-size: 0.85rem;
            color: rgba(255,255,255,0.7);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-right: 0.5rem;
          }

          .preset-edit-input {
            flex: 1;
            padding: 0.4rem 0.6rem;
            background: rgba(0,0,0,0.3);
            border: 1px solid #6366f1;
            border-radius: 6px;
            color: white;
            font-size: 0.85rem;
            outline: none;
            margin-right: 0.5rem;
          }

          .preset-item-actions {
            display: flex;
            gap: 0.4rem;
          }

          .btn-preset-edit {
            width: 28px;
            height: 28px;
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 6px;
            color: #ffc107;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .btn-preset-edit:hover {
            background: rgba(255, 193, 7, 0.2);
            border-color: #ffc107;
            transform: scale(1.1);
          }

          .btn-preset-delete {
            width: 28px;
            height: 28px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 6px;
            color: #ef4444;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .btn-preset-delete:hover {
            background: rgba(239, 68, 68, 0.2);
            border-color: #ef4444;
            transform: scale(1.1);
          }

          .panel-preset-select {
            width: 100%;
            padding: 0.6rem 0.9rem;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            color: rgba(255,255,255,0.6);
            font-size: 0.875rem;
            background: rgba(255,255,255,0.03);
            outline: none;
          }

          .panel-preset-select:focus {
            border-color: #6366f1;
            background: rgba(255,255,255,0.05);
          }

          /* Template Row */
          .template-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .template-label {
            font-size: 0.875rem;
            font-weight: 600;
            color: rgba(255,255,255,0.7);
          }

          .template-controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
          }

          .panel-template-select {
            padding: 0.6rem 1rem;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            color: rgba(255,255,255,0.7);
            font-size: 0.875rem;
            background: rgba(255,255,255,0.03);
            outline: none;
            cursor: pointer;
          }

          .panel-template-select:focus {
            border-color: #6366f1;
          }

          .btn-save-template {
            width: 36px;
            height: 36px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            color: rgba(255,255,255,0.6);
            font-size: 1.25rem;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .btn-save-template:hover {
            background: rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.15);
          }

          /* Send Button */
          .panel-send-btn {
            width: 100%;
            padding: 1rem;
            border-radius: 10px;
            background: #6366f1;
            color: #ffffff;
            font-weight: 700;
            font-size: 1rem;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          }

          .panel-send-btn:hover:not(:disabled) {
            background: #4f46e5;
          }

          .panel-send-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .panel-success-msg {
            padding: 0.75rem;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 8px;
            color: #10b981;
            font-weight: 600;
            text-align: center;
          }
          .spinner { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

          .tab-switcher { display: flex; padding: 0.4rem; background: rgba(255,255,255,0.03); border-radius: 14px; border: 1px solid rgba(255,255,255,0.05); }
          .tab-switcher button { padding: 0.7rem 1.5rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.4); transition: 0.3s; }
          .tab-switcher button.active { background: rgba(255,255,255,0.1); color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }

          .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.92); backdrop-filter: blur(20px); z-index: 9999; display: flex; align-items: center; justify-content: center; }
          .modal-content { width: 550px; background: #0f172a; border-radius: 32px; padding: 2.5rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 30px 100px rgba(0,0,0,0.8); }
          .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
          .preset-input { display: flex; gap: 1rem; margin: 2rem 0; }
          .preset-input input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1rem 1.2rem; color: white; font-size: 1rem; outline: none; }
          .preset-list { display: flex; flex-direction: column; gap: 1rem; max-height: 350px; overflow-y: auto; padding-right: 0.5rem; }
          .preset-item { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); transition: 0.2s; }
          .preset-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }

          .dynamic-viewer-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(25px); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 0; }
          .viewer-main-stage { width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; position: relative; min-height: 0; padding: 1rem 0; }
          .v-image-wrapper img { max-width: 90vw; max-height: 70vh; object-fit: contain; border-radius: 16px; box-shadow: 0 50px 150px rgba(0,0,0,0.9); }
          .v-nav-btn { width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 1px solid rgba(255,255,255,0.1); margin: 0 3rem; transition: 0.4s; }
          .v-nav-btn:hover { background: #6366f1; transform: scale(1.15) rotate(5deg); }

          .viewer-bottom-bar { padding: 1.2rem 2.5rem; background: rgba(255,255,255,0.05); backdrop-filter: blur(30px); border-radius: 100px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 20px 50px rgba(0,0,0,0.5); margin-top: 1.5rem; }
          .v-thumb-list { display: flex; gap: 1.5rem; }
          .v-mini-thumb { width: 55px; height: 55px; border-radius: 50%; overflow: hidden; cursor: pointer; border: 3px solid transparent; opacity: 0.4; transition: 0.4s; position: relative; background: rgba(255, 255, 255, 0.1); }
          .v-mini-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .v-mini-thumb.active { border-color: #6366f1; opacity: 1; transform: scale(1.3) translateY(-5px); }
          .v-mini-thumb.has-selection { border-color: #6366f1; opacity: 1; }
          
          /* Viewer Thumbnail Crop Selector */
          .v-thumb-crop-selector { position: absolute; top: -35px; left: 50%; transform: translateX(-50%); display: flex; gap: 2px; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px); padding: 3px; border-radius: 6px; opacity: 0; transition: all 0.3s; pointer-events: none; }
          .v-mini-thumb:hover .v-thumb-crop-selector, .v-mini-thumb.has-selection .v-thumb-crop-selector { opacity: 1; pointer-events: all; }
          .v-crop-btn { padding: 2px 6px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; color: white; font-size: 0.6rem; font-weight: 700; cursor: pointer; transition: all 0.2s; line-height: 1; }
          .v-crop-btn:hover { background: rgba(99, 102, 241, 0.3); border-color: #6366f1; }
          .v-crop-btn.active { background: #6366f1; border-color: #6366f1; box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4); }
          
          /* Viewer Thumbnail Watermark */
          .v-thumb-watermark { position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); padding: 2px 8px; background: rgba(99, 102, 241, 0.9); backdrop-filter: blur(10px); border-radius: 6px; color: white; font-size: 0.65rem; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3); animation: watermarkFloat 0.4s ease-out; }

          @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          .animate-zoom { animation: zoomIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade { animation: fadeIn 0.6s ease-out forwards; }
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          .animate-scale { animation: scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

          /* File Manager Styles */
          .file-manager { display: flex; flex-direction: column; height: 100%; }
          .file-manager-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
          .breadcrumb-nav { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; }
          .breadcrumb-item { color: rgba(255,255,255,0.5); cursor: pointer; transition: color 0.2s; }
          .breadcrumb-item:hover { color: #6366f1; }
          .breadcrumb-item.active { color: white; font-weight: 600; cursor: default; }
          .breadcrumb-separator { color: rgba(255,255,255,0.3); }
          .back-btn { width: 36px; height: 36px; border-radius: 8px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); color: #6366f1; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
          .back-btn:hover { background: rgba(99, 102, 241, 0.2); transform: translateX(-2px); }
          .view-toggles { display: flex; gap: 0.5rem; }
          .view-toggle-btn { width: 40px; height: 40px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
          .view-toggle-btn.active { background: rgba(99, 102, 241, 0.15); border-color: #6366f1; color: #6366f1; }
          .file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; padding: 2rem; overflow-y: auto; flex: 1; }
          .file-folder-item { background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; align-items: center; text-align: center; }
          .file-folder-item:hover { transform: translateY(-4px); border-color: #6366f1; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15); background: rgba(99, 102, 241, 0.05); }
          .folder-icon-wrapper { position: relative; width: 80px; height: 80px; margin-bottom: 1rem; }
          .folder-icon { width: 100%; height: 100%; color: #f59e0b; filter: drop-shadow(0 4px 12px rgba(245, 158, 11, 0.3)); }
          .folder-preview { position: absolute; inset: 8px; border-radius: 8px; overflow: hidden; background: rgba(0, 0, 0, 0.3); }
          .folder-preview img { width: 100%; height: 100%; object-fit: contain; }
          .folder-info h4 { font-size: 1rem; font-weight: 600; color: white; margin: 0 0 0.5rem 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
          .folder-meta { font-size: 0.85rem; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 0.5rem; margin: 0; }
          .photo-grid-view { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
          .selection-toolbar { padding: 1rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 1rem; }
          .select-all-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: white; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
          .select-all-btn:hover { background: rgba(99, 102, 241, 0.1); border-color: #6366f1; }
          .clear-selections-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; color: #ef4444; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
          .clear-selections-btn:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }
          .photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; padding: 2rem; overflow-y: auto; flex: 1; }
          .photo-card { aspect-ratio: 1; border-radius: 12px; overflow: hidden; position: relative; cursor: pointer; border: 2px solid transparent; transition: all 0.3s; background: rgba(15, 23, 42, 0.6); }
          .photo-card:hover { transform: scale(1.02); border-color: #6366f1; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2); }
          .photo-card.selected { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2); }
          .photo-checkbox { position: absolute; top: 8px; left: 8px; z-index: 10; color: rgba(255, 255, 255, 0.5); transition: all 0.2s; }
          .photo-card:hover .photo-checkbox, .photo-card.selected .photo-checkbox { color: white; }
          .photo-card.selected .photo-checkbox .text-primary { color: #6366f1; }
          .photo-card img { width: 100%; height: 100%; object-fit: contain; background: linear-gradient(135deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(225deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(315deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, #1e293b 25%, transparent 25%); background-size: 20px 20px; background-color: #0f172a; }
          .photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; font-weight: 800; font-size: 2rem; }
          
          /* Crop Ratio Selector */
          .crop-ratio-selector { position: absolute; top: 8px; right: 8px; z-index: 10; display: flex; gap: 4px; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(10px); padding: 4px; border-radius: 8px; opacity: 0; transition: all 0.3s; }
          .photo-card:hover .crop-ratio-selector, .photo-card.selected .crop-ratio-selector { opacity: 1; }
          .crop-btn { padding: 4px 8px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; color: white; font-size: 0.7rem; font-weight: 700; cursor: pointer; transition: all 0.2s; min-width: 32px; }
          .crop-btn:hover { background: rgba(99, 102, 241, 0.3); border-color: #6366f1; }
          .crop-btn.active { background: #6366f1; border-color: #6366f1; color: white; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); }
          .crop-btn span { display: block; line-height: 1; }
          
          /* Watermark Overlay */
          .crop-watermark { position: absolute; bottom: 12px; right: 12px; z-index: 5; padding: 6px 12px; background: rgba(99, 102, 241, 0.85); backdrop-filter: blur(10px); border-radius: 8px; color: white; font-size: 0.85rem; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); animation: watermarkFloat 0.4s ease-out; }
          @keyframes watermarkFloat { from { opacity: 0; transform: translateY(10px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
          
          .photo-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 0.5rem; background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent); opacity: 0; transition: opacity 0.2s; }
          .photo-card:hover .photo-overlay { opacity: 1; }
          .photo-number { color: white; font-size: 0.85rem; font-weight: 600; }
          .send-selection-bar { position: sticky; bottom: 0; padding: 1.5rem 2rem; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; gap: 2rem; z-index: 100; }
          .send-info { display: flex; align-items: center; gap: 1rem; color: white; font-weight: 600; }
          .send-btn { padding: 0.8rem 2rem; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); border: none; border-radius: 12px; color: white; font-weight: 700; font-size: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.3s; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3); }
          .send-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4); }
          .send-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}
