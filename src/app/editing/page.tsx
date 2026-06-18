"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadEditedAsset, getInstructionPresets } from "@/lib/actions";
import { useImageViewer } from "@/components/ImageViewerProvider";
import { getDisplayUrl, getDownloadUrl } from "@/lib/utils";
import {
  PenTool,
  Layers,
  CheckCircle2,
  Clock,
  ChevronRight,
  Upload,
  Loader2,
  AlertCircle,
  FileText,
  Search,
  Film,
  Activity,
  Star,
  ChevronLeft,
  Image,
  Download,
  ExternalLink,
  Check,
  Zap,
} from "lucide-react";

const tabConfig: Record<string, { label: string; color: string; glow: string }> = {
  pending: { label: "Pending Edit", color: "#06b6d4", glow: "rgba(6,182,212,0.35)" },
  inprogress: { label: "In Progress", color: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
  review: { label: "Pending Review", color: "#818cf8", glow: "rgba(99,102,241,0.35)" },
  completed: { label: "Completed", color: "#10b981", glow: "rgba(16,185,129,0.35)" },
};

export default function EditingPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [presets, setPresets] = useState<string[]>([]);
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());
  const [loadedThumbs, setLoadedThumbs] = useState<Set<string>>(new Set());
  const [selectedAssets, setSelectedAssets] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [assetPopupOpen, setAssetPopupOpen] = useState(false);
  const { openViewer } = useImageViewer();

  const getThumbUrl = (task: any) =>
    getDisplayUrl(task.thumbnailUrl) ||
    getDisplayUrl(task.mainDesignUrl || task.designUrl, task.mainDesignId || task.designId);

  const buildAssetList = (task: any): { id: number; label: string; thumb: string | null; dl: string | null; type: string; fileId: string }[] => {
    const list: any[] = [];
    let idx = 0;

    // Design file
    const dt = getThumbUrl(task);
    const dd = getDownloadUrl(task.designUrl, task.designId, task.name);
    if (dd) list.push({ id: idx++, label: 'Design Original', thumb: dt, dl: dd, type: 'design', fileId: task.designId || '' });

    // Variations
    if (task.variations?.length) {
      task.variations.forEach((v: any, i: number) => {
        const vt = getDisplayUrl(v.thumbnailUrl) || getDisplayUrl(v.url, v.id);
        const vd = getDownloadUrl(v.url, v.id, `${task.name}-variation-${i + 1}`);
        if (vd) list.push({ id: idx++, label: v.label || `Variation ${i + 1}`, thumb: vt, dl: vd, type: 'variation', fileId: v.id || '' });
      });
    }

    // Raw assets
    if (task.rawUrls?.length) {
      task.rawUrls.forEach((u: string, i: number) => {
        const rd = getDownloadUrl(u, task.rawIds?.[i], `${task.name}-raw-${i + 1}`);
        const rt = getDisplayUrl(u, task.rawIds?.[i]);
        if (rd) list.push({ id: idx++, label: `Raw Asset ${i + 1}`, thumb: rt, dl: rd, type: 'raw', fileId: task.rawIds?.[i] || '' });
      });
    }

    // Edited file
    const ed = task.editedUrl ? getDownloadUrl(task.editedUrl, null, `${task.name}-edited`) : null;
    if (ed) list.push({ id: idx++, label: 'Edited Final', thumb: getDisplayUrl(task.editedUrl), dl: ed, type: 'edited', fileId: '' });

    return list;
  };

  const getAssetsForSelected = () => {
    if (!selectedTask) return [];
    return buildAssetList(selectedTask);
  };

  const toggleAsset = (id: number) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectAll(false);
  };

  const toggleSelectAll = () => {
    const assets = getAssetsForSelected();
    if (selectAll) {
      setSelectedAssets(new Set());
      setSelectAll(false);
    } else {
      setSelectedAssets(new Set(assets.map(a => a.id)));
      setSelectAll(true);
    }
  };

  const downloadSingle = (dl: string) => {
    window.open(dl, '_blank');
  };

  const downloadSelected = () => {
    const assets = getAssetsForSelected().filter(a => selectedAssets.has(a.id));
    assets.forEach(a => { if (a.dl) window.open(a.dl, '_blank'); });
  };

  const downloadAll = () => {
    const assets = getAssetsForSelected();
    assets.forEach(a => { if (a.dl) window.open(a.dl, '_blank'); });
  };

  const closePopup = () => {
    setAssetPopupOpen(false);
    setSelectedAssets(new Set());
    setSelectAll(false);
  };

  const openAssetPopup = () => {
    if (!selectedTask) return;
    setSelectedAssets(new Set());
    setSelectAll(false);
    setAssetPopupOpen(true);
  };

  const handleThumbError = (taskId: string) => {
    setFailedThumbs(prev => new Set(prev).add(taskId));
  };

  const handleThumbLoad = (taskId: string) => {
    setLoadedThumbs(prev => new Set(prev).add(taskId));
  };

  useEffect(() => {
    const q = query(collection(db, "products"), where("status", "==", "Pending Edit"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getInstructionPresets().then(data => setPresets(data.map((p: any) => p.text))).catch(() => {});
  }, []);

  const filteredTasks = tasks.filter(t =>
    !searchQuery || t.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const counts = {
    pending: tasks.filter(t => t.status === "Pending Edit").length,
    inprogress: tasks.filter(t => t.status === "In Progress" || (t.selectedTask && t.editedUrl)).length,
    review: tasks.filter(t => t.status === "Pending Review" && t.editedUrl).length,
    completed: tasks.filter(t => t.status === "Completed").length,
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = (document.getElementById('finalEdit') as HTMLInputElement).files?.[0];
    if (!selectedTask || !file) return;

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadEditedAsset(selectedTask.id, formData);

    setIsUploading(false);
    if (result.success) {
      setUploadSuccess(true);
      setSelectedTask((prev: any) => prev ? { ...prev, editedUrl: result.url, status: "Pending Review" } : null);
      setTimeout(() => setUploadSuccess(false), 5000);
    } else {
      setError(result.error || "Upload failed");
    }
  };

  const applyPreset = (text: string) => {
    if (!selectedTask) return;
    const textarea = document.getElementById('editInstructions') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const newValue = current.substring(0, start) + text + current.substring(end);
    textarea.value = newValue;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const formatDate = (d: any) => {
    if (!d) return "Just now";
    if (d.toDate) return d.toDate().toLocaleDateString();
    return new Date(d).toLocaleDateString();
  };

  return (
    <RoleGuard allowedRoles={["editor"]}>
      <DashboardLayout>
        <div className="eh-root">
          {/* Ambient Background */}
          <div className="eh-ambient" aria-hidden="true">
            <div className="amb-orb amb-orb-1" />
            <div className="amb-orb amb-orb-2" />
            <div className="amb-orb amb-orb-3" />
            <div className="eh-grid-lines" />
          </div>

          {/* ── Page Header ── */}
          <header className="eh-header">
            <div className="eh-header-left">
              <div className="eh-badge">
                <Zap size={11} />
                <span>Editing Queue</span>
              </div>
              <h1 className="eh-title">
                <span className="eh-title-accent">Editing</span> Studio
              </h1>
              <p className="eh-subtitle">Finalize assets · Apply edits · Deliver polished content for review</p>
            </div>

            {/* Tab Switcher */}
            <div className="eh-tabs">
              {Object.entries(tabConfig).map(([key, cfg]) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    className={`eh-tab ${isActive ? "eh-tab-active" : ""}`}
                    style={isActive ? { "--tab-color": cfg.color, "--tab-glow": cfg.glow } as React.CSSProperties : {}}
                    onClick={() => setActiveTab(key)}
                  >
                    <span className="eh-tab-icon">{key === "pending" ? <Clock size={13} /> : key === "inprogress" ? <Activity size={13} /> : key === "review" ? <Star size={13} /> : <CheckCircle2 size={13} />}</span>
                    <span>{cfg.label}</span>
                    <span className="eh-tab-count">{counts[key as keyof typeof counts] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </header>

          {/* ── KPI Strip ── */}
          <section className="eh-kpi-strip">
            {([
              { key: "pending", label: "Pending Edit", icon: <Clock size={20} />, color: "#06b6d4", glow: "rgba(6,182,212,0.18)", count: counts.pending },
              { key: "inprogress", label: "In Progress", icon: <Activity size={20} />, color: "#f59e0b", glow: "rgba(245,158,11,0.18)", count: counts.inprogress },
              { key: "review", label: "Pending Review", icon: <Star size={20} />, color: "#818cf8", glow: "rgba(99,102,241,0.18)", count: counts.review },
              { key: "completed", label: "Completed", icon: <CheckCircle2 size={20} />, color: "#10b981", glow: "rgba(16,185,129,0.18)", count: counts.completed },
            ] as const).map(({ key, label, icon, color, glow, count }) => (
              <button
                key={key}
                className={`eh-kpi ${activeTab === key ? "eh-kpi-active" : ""}`}
                style={{ "--kpi-color": color, "--kpi-glow": glow } as React.CSSProperties}
                onClick={() => setActiveTab(key)}
              >
                <div className="eh-kpi-icon">{icon}</div>
                <div className="eh-kpi-body">
                  <span className="eh-kpi-num">{count}</span>
                  <span className="eh-kpi-label">{label}</span>
                </div>
                <div className="eh-kpi-bar">
                  <div className="eh-kpi-bar-fill" style={{ width: `${Math.min(100, count * 25)}%` }} />
                </div>
                {activeTab === key && <div className="eh-kpi-pulse" />}
              </button>
            ))}
          </section>

          {/* ── Main Content ── */}
          <div className="eh-body">
            {/* LEFT: Task List */}
            <div className="eh-panel">
              <div className="eh-panel-inner">
                {/* Search */}
                <div className="eh-list-header">
                  <div className="eh-search">
                    <Search size={16} />
                    <input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Task Items */}
                <div className="eh-task-list">
                  {filteredTasks.filter(t => {
                    if (activeTab === "pending") return t.status === "Pending Edit" && !t.editedUrl;
                    if (activeTab === "inprogress") return t.editedUrl && t.status !== "Completed" && t.status !== "Pending Review";
                    if (activeTab === "review") return t.status === "Pending Review" || (t.editedUrl && t.status === "Pending Review");
                    if (activeTab === "completed") return t.status === "Completed";
                    return true;
                  }).map((task) => {
                    const thumbUrl = getThumbUrl(task);
                    const isActive = selectedTask?.id === task.id;
                    const thumbFailed = failedThumbs.has(task.id);
                    const thumbLoaded = loadedThumbs.has(task.id);
                    return (
                      <div
                        key={task.id}
                        className={`eh-task-item ${isActive ? "eh-task-active" : ""}`}
                        onClick={() => setSelectedTask(task)}
                        onDoubleClick={() => { setSelectedTask(task); setAssetPopupOpen(true); }}
                      >
                        <div className="eh-task-thumb" onClick={(e) => { e.stopPropagation(); openViewer(task); }}>
                          {(() => {
                            const variants = task.variations;
                            if (variants?.length > 1) {
                              return (
                                <div className="eh-thumb-strip">
                                  {variants.slice(0, 4).map((v: any, i: number) => {
                                    const vUrl = getDisplayUrl(v.thumbnailUrl) || getDisplayUrl(v.url, v.id);
                                    if (!vUrl) return null;
                                    return <img key={i} src={vUrl} alt="" className="eh-thumb-strip-img" />;
                                  })}
                                </div>
                              );
                            }
                            if (thumbUrl && !thumbFailed) {
                              return (
                                <>
                                  {!thumbLoaded && <div className="eh-thumb-load" />}
                                  <img
                                    src={thumbUrl}
                                    alt={task.name}
                                    onLoad={() => handleThumbLoad(task.id)}
                                    onError={() => handleThumbError(task.id)}
                                    style={{ display: thumbLoaded ? 'block' : 'none' }}
                                  />
                                </>
                              );
                            }
                            return <div className="eh-thumb-ph"><Image size={20} /></div>;
                          })()}
                        </div>
                        <div className="eh-task-info">
                          <div className="eh-task-name">
                            <span>{task.name}</span>
                            {task.variationCount > 1 && (
                              <span className="eh-var-badge">+{task.variationCount}</span>
                            )}
                          </div>
                          <div className="eh-task-meta">
                            <Clock size={12} />
                            <span>{formatDate(task.updatedAt)}</span>
                            {task.category && (
                              <>
                                <span className="eh-dot" />
                                <span>{task.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="eh-row-arrow" />
                      </div>
                    );
                  })}
                  {filteredTasks.length === 0 && (
                    <div className="eh-empty">
                      <div className="eh-empty-icon"><Film size={36} /></div>
                      <p>No {tabConfig[activeTab]?.label || "tasks"} at this moment</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Editor Panel */}
            <div className="eh-editor-panel">
              {selectedTask ? (
                <div className="eh-editor-form">
                  <div className="eh-editor-header">
                    <div className="eh-editor-preview" onClick={() => openViewer(selectedTask)} style={{ cursor: 'pointer' }}>
                      {(() => {
                        const tu = getThumbUrl(selectedTask);
                        const tf = failedThumbs.has(selectedTask.id);
                        const tl = loadedThumbs.has(selectedTask.id);
                        if (tu && !tf) {
                          return (
                            <>
                              {!tl && <div className="eh-preview-load" />}
                              <img
                                src={tu}
                                alt={selectedTask.name}
                                onLoad={() => handleThumbLoad(selectedTask.id)}
                                onError={() => handleThumbError(selectedTask.id)}
                                style={{ display: tl ? 'block' : 'none' }}
                              />
                            </>
                          );
                        }
                        return <div className="eh-preview-ph"><Image size={24} /></div>;
                      })()}
                      <div className="eh-preview-overlay">
                        <div className="eh-preview-zoom-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                        </div>
                      </div>
                    </div>
                    <div className="eh-editor-title-block">
                      <h3 className="eh-editor-title">{selectedTask.name}</h3>
                      <div className="eh-editor-meta">
                        <span className={`eh-status-badge eh-status-${selectedTask.status?.toLowerCase().replace(/\s+/g, '-') || 'pending'}`}>
                          {selectedTask.status || "Pending Edit"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Instructions - Highlighted */}
                  <div className="eh-section eh-instruct-section">
                    <div className="eh-section-head">
                      <FileText size={16} />
                      <span>EDITING INSTRUCTIONS</span>
                    </div>
                    <div className="eh-instructions">
                      <p>{selectedTask.directions?.edit || "No specific edit instructions provided."}</p>
                    </div>
                  </div>

                  {/* Open Asset Manager */}
                  {(() => {
                    const assets = buildAssetList(selectedTask);
                    if (assets.length === 0) return null;
                    return (
                      <button className="eh-open-popup-btn" onClick={openAssetPopup}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="3"/><line x1="2" y1="8" x2="22" y2="8"/><rect x="6" y="12" width="4" height="8"/><rect x="14" y="10" width="4" height="10"/></svg>
                        <span>Open Asset Manager</span>
                        <span className="eh-om-badge">{assets.length} files</span>
                      </button>
                    );
                  })()}

                  {/* Upload Form */}
                  <form onSubmit={handleFileUpload} className="eh-upload-section">
                    <div className="eh-section-head"><Upload size={14} /><span>DELIVER FINAL EDIT</span></div>
                    <div className="eh-file-box">
                      <input type="file" id="finalEdit" required hidden onChange={() => setError("")} />
                      <label htmlFor="finalEdit" className="eh-file-label"><Upload size={22} /><span>Choose file to upload</span></label>
                    </div>
                    {error && <div className="eh-error"><AlertCircle size={14} /><span>{error}</span></div>}
                    <button type="submit" className="eh-submit-btn" disabled={isUploading || uploadSuccess}>
                      <div className="eh-submit-btn-bg" />
                      {isUploading ? <><Loader2 className="eh-spin" size={18} /><span>Uploading...</span></>
                      : uploadSuccess ? <><Check size={18} /><span>Delivered!</span></>
                      : <><Upload size={18} /><span>Finalize & Submit</span></>}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="eh-idle">
                  <div className="eh-idle-ring">
                    <div className="eh-idle-ring-inner"><PenTool size={28} /></div>
                  </div>
                  <h3 className="eh-idle-title">Select a task</h3>
                  <p className="eh-idle-sub">Pick an assignment from the queue to start editing and deliver the final output.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ASSET MANAGER POPUP ── */}
        {assetPopupOpen && selectedTask && (() => {
          const assets = buildAssetList(selectedTask);
          const selCount = selectedAssets.size;
          return (
            <div className="eh-popup-overlay" onClick={e => { if (e.target === e.currentTarget) closePopup(); }}>
              <div className="eh-popup">
                {/* Popup Header */}
                <div className="eh-popup-header">
                  <div className="eh-popup-h-left">
                    <button className="eh-popup-back" onClick={closePopup}>
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h2 className="eh-popup-title">{selectedTask.name}</h2>
                      <div className="eh-popup-meta">
                        <span className={`eh-status-badge eh-status-${selectedTask.status?.toLowerCase().replace(/\s+/g, '-') || 'pending'}`}>{selectedTask.status || "Pending Edit"}</span>
                        <span className="eh-popup-count">{assets.length} assets</span>
                      </div>
                    </div>
                  </div>
                  <div className="eh-popup-h-right">
                    <button className={`eh-popup-btn ${selectAll ? 'eh-popup-btn-active' : ''}`} onClick={toggleSelectAll}>
                      {selectAll ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 12 9 17 20 6"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>}
                      <span>{selectAll ? 'Deselect All' : 'Select All'}</span>
                    </button>
                    <button className="eh-popup-dl-btn" onClick={downloadAll} title="Download All">
                      <Download size={14} /><span>Download All</span>
                    </button>
                    {selCount > 0 && (
                      <button className="eh-popup-dl-btn eh-popup-dl-btn-sel" onClick={downloadSelected}>
                        <Download size={14} /><span>Download Selected ({selCount})</span>
                      </button>
                    )}
                    <button className="eh-popup-close" onClick={closePopup}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>

                {/* Instructions Bar */}
                {selectedTask.directions?.edit && (
                  <div className="eh-popup-instruct">
                    <FileText size={14} />
                    <span>{selectedTask.directions.edit.length > 120 ? selectedTask.directions.edit.slice(0, 120) + '...' : selectedTask.directions.edit}</span>
                  </div>
                )}

                {/* Asset Grid */}
                <div className="eh-popup-body">
                  <div className="eh-popup-grid">
                    {assets.map((asset) => {
                      const isSel = selectedAssets.has(asset.id);
                      return (
                        <div key={asset.id} className={`eh-popup-card ${isSel ? 'eh-popup-card-sel' : ''}`}>
                          {/* Thumbnail */}
                          <div className="eh-popup-card-thumb" onClick={() => downloadSingle(asset.dl || '')}>
                            {asset.thumb ? (
                              <img src={asset.thumb} alt={asset.label} />
                            ) : (
                              <div className="eh-popup-card-no-thumb">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              </div>
                            )}
                            {/* Type Badge */}
                            <span className={`eh-popup-type-badge ${asset.type}`}>{asset.type}</span>
                            {/* Checkbox */}
                            <div className="eh-popup-check" onClick={e => { e.stopPropagation(); toggleAsset(asset.id); }}>
                              <div className={`eh-popup-check-box ${isSel ? 'eh-popup-check-on' : ''}`}>
                                {isSel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="4 12 9 17 20 6"/></svg>}
                              </div>
                            </div>
                            {/* Download icon overlay */}
                            <div className="eh-popup-card-dl" onClick={(e) => { e.stopPropagation(); downloadSingle(asset.dl || ''); }}>
                              <Download size={16} />
                            </div>
                          </div>
                          {/* Label */}
                          <div className="eh-popup-card-label">{asset.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="eh-popup-footer">
                  <div className="eh-popup-f-left">
                    <span className="eh-popup-f-stat">{selCount} of {assets.length} selected</span>
                  </div>
                  <div className="eh-popup-f-right">
                    {selCount > 0 && (
                      <button className="eh-popup-dl-btn eh-popup-dl-btn-sel" onClick={downloadSelected}>
                        <Download size={16} /><span>Download Selected ({selCount})</span>
                      </button>
                    )}
                    <button className="eh-popup-dl-btn" onClick={downloadAll}>
                      <Download size={16} /><span>Download All ({assets.length})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </DashboardLayout>

      <style jsx>{`
        /* ── ROOT ── */
        .eh-root {
          position: relative;
          padding: 2rem 2rem 3rem;
          min-height: calc(100vh - 4rem);
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .eh-root { padding: 1rem 1rem 1.5rem; padding-top: 0; }
        }

        /* ── AMBIENT ── */
        .eh-ambient { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .eh-grid-lines {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse at 50% 0%, black 30%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at 50% 0%, black 30%, transparent 70%);
        }

        /* ── HEADER ── */
        .eh-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 1.5rem; margin-bottom: 1.75rem; position: relative; z-index: 2;
          flex-wrap: wrap;
        }
        .eh-header-left { display: flex; flex-direction: column; gap: 0.5rem; }
        .eh-badge {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
          background: rgba(6, 182, 212, 0.08);
          border: 1px solid rgba(6, 182, 212, 0.15);
          color: #06b6d4;
          font-size: 0.68rem; font-weight: 700;
          width: fit-content;
        }
        .eh-title { font-size: 2.4rem; font-weight: 900; margin: 0; color: var(--text-main); letter-spacing: -0.03em; }
        .eh-title-accent {
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .eh-subtitle { margin: 0; color: var(--text-muted); font-size: 0.88rem; }

        /* ── TABS ── */
        .eh-tabs {
          display: flex;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 0.35rem;
          gap: 0.2rem;
          flex-shrink: 0;
        }
        .eh-tab {
          display: flex; align-items: center; gap: 0.45rem;
          padding: 0.55rem 1rem;
          border-radius: var(--radius-lg);
          background: transparent; border: none;
          color: var(--text-muted);
          font-size: 0.78rem; font-weight: 700;
          cursor: pointer; transition: all var(--transition-base);
          white-space: nowrap;
        }
        .eh-tab:hover { color: var(--text-main); background: var(--bg-hover); }
        .eh-tab-active {
          background: var(--tab-color, var(--primary)) !important;
          color: #fff !important;
          box-shadow: 0 0 20px var(--tab-glow, var(--primary-glow));
        }
        .eh-tab-icon { display: flex; align-items: center; opacity: 0.7; }
        .eh-tab-active .eh-tab-icon { opacity: 1; }
        .eh-tab-count {
          background: var(--border);
          color: var(--text-muted);
          border-radius: 100px;
          padding: 0.1rem 0.5rem;
          font-size: 0.72rem; font-weight: 800;
          min-width: 24px; text-align: center;
          transition: all var(--transition-fast);
        }
        .eh-tab-active .eh-tab-count {
          background: rgba(255,255,255,0.2);
          color: #fff !important;
        }

        /* ── KPI STRIP ── */
        .eh-kpi-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.85rem;
          margin-bottom: 2rem;
          position: relative; z-index: 2;
        }
        @media (max-width: 1200px) {
          .eh-kpi-strip { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .eh-kpi-strip { grid-template-columns: repeat(2, 1fr); }
        }
        .eh-kpi {
          position: relative;
          display: flex; align-items: center; gap: 0.85rem;
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
        .eh-kpi::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 15% 50%, var(--kpi-glow, transparent) 0%, transparent 60%);
          opacity: 0; transition: opacity var(--transition-base);
        }
        .eh-kpi:hover::before, .eh-kpi-active::before { opacity: 1; }
        .eh-kpi:hover {
          transform: translateY(-4px);
          border-color: var(--kpi-color, var(--primary));
          box-shadow: var(--shadow-lg), 0 0 15px var(--kpi-glow);
        }
        .eh-kpi-active {
          border-color: var(--kpi-color, var(--primary));
          background: var(--bg-hover);
          box-shadow: var(--shadow-lg), 0 0 20px var(--kpi-glow);
        }
        .eh-kpi-icon {
          width: 48px; height: 48px;
          border-radius: var(--radius-md);
          background: var(--border);
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--kpi-color, var(--primary));
          flex-shrink: 0; position: relative; z-index: 1;
          transition: all var(--transition-base);
        }
        .eh-kpi:hover .eh-kpi-icon, .eh-kpi-active .eh-kpi-icon {
          background: var(--kpi-color, var(--primary));
          color: #fff !important;
          box-shadow: 0 0 16px var(--kpi-glow);
          transform: scale(1.05);
        }
        .eh-kpi-body { display: flex; flex-direction: column; gap: 0.15rem; position: relative; z-index: 1; flex: 1; }
        .eh-kpi-num { font-size: 2.2rem; font-weight: 900; letter-spacing: -0.04em; line-height: 1; color: var(--text-main); display: block; }
        .eh-kpi-label { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
        .eh-kpi:hover .eh-kpi-label, .eh-kpi-active .eh-kpi-label { color: var(--text-main); }
        .eh-kpi-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: var(--border-light); }
        .eh-kpi-bar-fill { height: 100%; background: var(--kpi-color, var(--primary)); opacity: 0.4; border-radius: 2px; transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .eh-kpi:hover .eh-kpi-bar-fill, .eh-kpi-active .eh-kpi-bar-fill { opacity: 1; }
        .eh-kpi-pulse {
          position: absolute; top: 1.25rem; right: 1.25rem;
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--kpi-color, var(--primary));
          animation: kpi-pulse 2s ease-in-out infinite;
        }
        @keyframes kpi-pulse {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 var(--kpi-glow, transparent); }
          50% { transform: scale(1.25); opacity: 0.5; box-shadow: 0 0 0 6px transparent; }
        }

        /* ── BODY LAYOUT ── */
        .eh-body {
          display: grid;
          grid-template-columns: 1fr 440px;
          gap: 1.6rem;
          align-items: start;
          position: relative; z-index: 2;
        }
        @media (max-width: 1200px) {
          .eh-body { grid-template-columns: 1fr 360px; }
        }
        @media (max-width: 1024px) {
          .eh-body { grid-template-columns: 1fr; }
        }

        /* ── LEFT PANEL ── */
        .eh-panel {
          border-radius: var(--radius-xl);
          background: var(--bg-card);
          border: 1px solid var(--border);
          backdrop-filter: var(--glass);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
        }
        .eh-panel-inner { padding: 1.75rem; min-height: 480px; }

        /* ── SEARCH ── */
        .eh-list-header {
          display: flex; align-items: center; gap: 0.8rem;
          margin-bottom: 1.25rem;
        }
        .eh-search {
          flex: 1; display: flex; align-items: center; gap: 0.7rem;
          padding: 0.65rem 1.1rem;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: all var(--transition-base);
        }
        .eh-search:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-glow);
          background: var(--bg-hover);
        }
        .eh-search svg { color: var(--text-dim); flex-shrink: 0; }
        .eh-search input {
          background: none; border: none; outline: none;
          color: var(--text-main); font-size: 0.88rem; flex: 1;
        }
        .eh-search input::placeholder { color: var(--text-dim); }

        /* ── TASK LIST ── */
        .eh-task-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .eh-task-item {
          display: flex; align-items: center; gap: 1rem;
          padding: 0.85rem 1.1rem;
          border-radius: var(--radius-lg);
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--bg-input);
          transition: all var(--transition-base);
        }
        .eh-task-item:hover {
          background: var(--bg-hover);
          transform: translateX(4px);
          border-color: var(--primary-glow);
          box-shadow: var(--shadow-md);
        }
        .eh-task-active {
          background: rgba(6, 182, 212, 0.08) !important;
          border-color: #06b6d4 !important;
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.15);
        }
        .eh-task-thumb {
          width: 52px; height: 52px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1.5px solid var(--border);
          background: var(--bg-deep);
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all var(--transition-base);
        }
        .eh-task-item:hover .eh-task-thumb { transform: scale(1.05); border-color: var(--primary); }
        .eh-task-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .eh-thumb-load { width:100%;height:100%;background:linear-gradient(90deg,var(--bg-deep),var(--bg-card),var(--bg-deep));background-size:200% 100%;animation:eh-shimmer 1.5s infinite; }
        .eh-thumb-ph { color: var(--text-dim); }
        .eh-thumb-strip { display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;width:100%;height:100%;gap:1px; }
        .eh-thumb-strip-img { width:100%;height:100%;object-fit:cover; }
        .eh-task-info { flex: 1; min-width: 0; }
        .eh-task-name {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.92rem; font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.2rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .eh-var-badge {
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          color: #fff !important; font-size: 0.55rem; font-weight: 800;
          padding: 0.1rem 0.4rem; border-radius: 6px;
          flex-shrink: 0;
        }
        .eh-task-meta {
          display: flex; align-items: center; gap: 0.5rem;
          color: var(--text-muted); font-size: 0.75rem;
        }
        .eh-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--text-dim); }
        .eh-row-arrow { color: var(--text-dim); transition: all var(--transition-base); flex-shrink: 0; }
        .eh-task-item:hover .eh-row-arrow { color: #06b6d4; transform: translateX(4px); }

        /* ── RIGHT EDITOR PANEL ── */
        .eh-editor-panel {
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
        .eh-editor-panel::-webkit-scrollbar { width: 4px; }
        .eh-editor-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .eh-editor-form { padding: 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; }

        /* Editor Header */
        .eh-editor-header { display: flex; gap: 1.1rem; align-items: center; }
        .eh-editor-preview {
          width: 72px; height: 72px;
          border-radius: var(--radius-md);
          overflow: hidden;
          flex-shrink: 0;
          border: 1.5px solid var(--border);
          background: var(--bg-deep);
          display: flex; align-items: center; justify-content: center;
          transition: all var(--transition-base);
          position: relative;
        }
        .eh-editor-preview img { width: 100%; height: 100%; object-fit: cover; }
        .eh-preview-load { position:absolute;inset:0;background:linear-gradient(90deg,var(--bg-deep),var(--bg-card),var(--bg-deep));background-size:200% 100%;animation:eh-shimmer 1.5s infinite; }
        .eh-preview-overlay { position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s; }
        .eh-editor-preview:hover .eh-preview-overlay { opacity:1; }
        .eh-preview-zoom-icon { width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;color:#fff; }
        .eh-preview-ph { color: var(--text-dim); }
        .eh-editor-title-block { flex: 1; min-width: 0; }
        .eh-editor-title { font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.3rem; }
        .eh-editor-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap:wrap; }
        .eh-dl-btn {
          display:inline-flex;align-items:center;gap:0.3rem;
          padding:0.25rem 0.6rem;border-radius:6px;
          background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);
          color:var(--primary);font-size:0.65rem;font-weight:700;
          text-decoration:none;transition:all var(--transition-fast);
          cursor:pointer;
        }
        .eh-dl-btn:hover { background:var(--primary);color:#fff;border-color:var(--primary);transform:translateY(-1px); }
        .eh-dl-link { border-color:var(--accent)!important;color:var(--accent)!important; }
        .eh-dl-link:hover { background:var(--accent)!important;color:#fff!important;border-color:var(--accent)!important; }
        .eh-status-badge {
          padding: 0.15rem 0.55rem;
          border-radius: 100px;
          font-size: 0.65rem; font-weight: 700;
        }
        .eh-status-pending-edit, .eh-status-pending { background: rgba(6,182,212,0.1); color: #06b6d4; }
        .eh-status-pending-review { background: rgba(99,102,241,0.1); color: var(--primary); }
        .eh-status-completed { background: rgba(16,185,129,0.1); color: var(--accent); }

        /* Sections */
        .eh-section { display: flex; flex-direction: column; gap: 0.6rem; }
        .eh-section-head {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.7rem; font-weight: 800;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .eh-instruct-section {
          background:rgba(6,182,212,0.03);
          border-radius:var(--radius-lg);
          padding:0.85rem;
          border:1px solid rgba(6,182,212,0.1);
          box-shadow:inset 0 0 30px rgba(6,182,212,0.03);
        }
        .eh-instruct-section .eh-section-head { color:#06b6d4; }
        .eh-instruct-section .eh-section-head svg { color:#06b6d4!important; }

        .eh-instructions {
          padding: 1rem;
          background: rgba(6, 182, 212, 0.04);
          border-radius: var(--radius-md);
          border: 1px solid rgba(6, 182, 212, 0.08);
        }
        .eh-instructions p { margin: 0; font-size: 0.85rem; line-height: 1.7; color: var(--text-main); }

        /* Presets */
        .eh-cmd-chips {
          display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem;
          padding: 0.45rem;
          border-radius: var(--radius-md);
          background: rgba(0,0,0,0.15);
          border: 1px solid var(--border-light);
        }
        .eh-chips-title { font-size: 0.65rem; font-weight: 800; color: var(--text-dim); margin-right: 0.2rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .eh-chip {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 3px 8px;
          border-radius: 8px;
          background: var(--bg-hover);
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 0.65rem; font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .eh-chip:hover {
          background: var(--bg-input);
          color: var(--text-main);
          transform: translateY(-1px);
        }

        /* Raw Assets */
        .eh-raw-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .eh-raw-link {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-sm);
          background: var(--bg-hover);
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 0.75rem; font-weight: 700;
          text-decoration: none;
          transition: all var(--transition-fast);
        }
        .eh-raw-link:hover {
          background: var(--primary-glow);
          border-color: var(--primary);
          color: var(--text-main);
        }
        .eh-raw-more { font-size:0.72rem;color:var(--text-dim);font-weight:700;display:flex;align-items:center;padding:0 0.4rem; }
        .eh-om-badge {
          display:inline-flex;align-items:center;justify-content:center;
          min-width:20px;height:18px;padding:0 5px;border-radius:6px;
          background:rgba(255,255,255,0.15);font-size:0.6rem;font-weight:800;margin-left:0.25rem;
        }

        /* Upload Section */
        .eh-upload-section { display: flex; flex-direction: column; gap: 0.8rem; }
        .eh-file-box { }
        .eh-file-label {
          display: flex; align-items: center; justify-content: center; gap: 0.8rem;
          padding: 1.25rem;
          background: rgba(255,255,255,0.02);
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-base);
          color: var(--text-muted);
          font-size: 0.85rem; font-weight: 600;
        }
        .eh-file-label:hover { background: var(--bg-hover); border-color: #06b6d4; color: var(--text-main); }
        .eh-file-label svg { color: var(--primary); }

        .eh-error {
          display: flex; align-items: center; gap: 0.5rem;
          color: #ef4444; font-size: 0.82rem; font-weight: 600;
        }

        .eh-submit-btn {
          width: 100%;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: transparent;
          border: none;
          color: #fff !important;
          font-weight: 800;
          font-size: 0.92rem;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center; gap: 0.6rem;
          transition: all var(--transition-base);
          letter-spacing: 0.02em;
        }
        .eh-submit-btn-bg {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          border-radius: var(--radius-md);
          transition: all var(--transition-base);
        }
        .eh-submit-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%);
          background-size: 200% 200%;
          animation: eh-shimmer 4s ease-in-out infinite;
          border-radius: var(--radius-md);
        }
        @keyframes eh-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .eh-submit-btn > * { position: relative; z-index: 1; }
        .eh-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(6,182,212,0.3); }
        .eh-submit-btn:hover:not(:disabled) .eh-submit-btn-bg { filter: brightness(1.15); }
        .eh-submit-btn:active:not(:disabled) { transform: translateY(0) scale(0.97); }
        .eh-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Idle State */
        .eh-idle {
          padding: 4rem 2rem;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 1.25rem; min-height: 480px; text-align: center;
        }
        .eh-idle-ring {
          width: 96px; height: 96px;
          border-radius: 50%;
          border: 1.5px solid rgba(6,182,212,0.2);
          display: flex; align-items: center; justify-content: center;
          animation: eh-idle-spin 15s linear infinite;
          position: relative;
        }
        .eh-idle-ring::before {
          content: '';
          position: absolute; inset: -8px;
          border-radius: 50%;
          border: 1px dashed var(--border);
          animation: eh-idle-spin 30s linear infinite reverse;
        }
        .eh-idle-ring-inner {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: rgba(6,182,212,0.08);
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: #06b6d4;
        }
        @keyframes eh-idle-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .eh-idle-title { font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin: 0; }
        .eh-idle-sub { font-size: 0.82rem; color: var(--text-muted); margin: 0; line-height: 1.6; max-width: 220px; }

        /* Empty State */
        .eh-empty {
          grid-column: 1 / -1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.9rem; padding: 4rem 2rem;
          color: var(--text-muted); text-align: center;
        }
        .eh-empty-icon {
          width: 76px; height: 76px;
          border-radius: var(--radius-lg);
          background: var(--bg-hover);
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-dim);
        }
        .eh-empty p { font-size: 0.88rem; margin: 0; font-weight: 600; }

        /* ── OPEN POPUP BUTTON ── */
        .eh-open-popup-btn {
          width:100%;display:flex;align-items:center;justify-content:center;gap:0.5rem;
          padding:0.7rem;border-radius:var(--radius-md);
          background:linear-gradient(135deg,rgba(99,102,241,0.08),rgba(168,85,247,0.08));
          border:1px solid rgba(99,102,241,0.2);
          color:var(--primary);font-size:0.8rem;font-weight:700;
          cursor:pointer;transition:all var(--transition-fast);
        }
        .eh-open-popup-btn:hover { background:var(--primary);color:#fff;border-color:var(--primary);transform:translateY(-2px);box-shadow:0 4px 16px rgba(99,102,241,0.2); }

        /* ── ASSET MANAGER POPUP ── */
        .eh-popup-overlay {
          position:fixed;inset:0;z-index:2000;
          background:rgba(2,6,23,0.85);
          backdrop-filter:blur(12px);
          -webkit-backdrop-filter:blur(12px);
          display:flex;align-items:center;justify-content:center;
          padding:1.5rem;
          animation:eh-popup-fade 0.2s ease;
        }
        @keyframes eh-popup-fade { from{opacity:0}to{opacity:1} }
        [data-theme="light"] .eh-popup-overlay { background:rgba(241,245,249,0.85); }

        .eh-popup {
          width:100%;max-width:1000px;max-height:90vh;
          background:var(--bg-card);
          border:1px solid var(--border);
          border-radius:var(--radius-xl);
          backdrop-filter:var(--glass);
          box-shadow:0 24px 80px rgba(0,0,0,0.5),0 0 40px rgba(99,102,241,0.08);
          display:flex;flex-direction:column;
          overflow:hidden;
          animation:eh-popup-slide 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes eh-popup-slide { from{transform:translateY(20px) scale(0.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1} }
        [data-theme="light"] .eh-popup { box-shadow:0 24px 80px rgba(0,0,0,0.12); }

        /* Popup Header */
        .eh-popup-header {
          display:flex;justify-content:space-between;align-items:center;
          padding:1rem 1.25rem;
          border-bottom:1px solid var(--border);
          flex-shrink:0;gap:0.75rem;
        }
        .eh-popup-h-left { display:flex;align-items:center;gap:0.75rem; }
        .eh-popup-back {
          width:36px;height:36px;border-radius:10px;
          background:var(--bg-hover);border:1px solid var(--border);
          color:var(--text-muted);cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          transition:all var(--transition-fast);flex-shrink:0;
        }
        .eh-popup-back:hover { background:var(--bg-input);color:var(--text-main);border-color:var(--primary); }
        .eh-popup-title { font-size:1.15rem;font-weight:800;color:var(--text-main);margin:0; }
        .eh-popup-meta { display:flex;align-items:center;gap:0.5rem;margin-top:0.2rem; }
        .eh-popup-count { font-size:0.7rem;color:var(--text-dim);font-weight:600; }
        .eh-popup-h-right { display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap; }
        .eh-popup-btn {
          display:inline-flex;align-items:center;gap:0.35rem;
          padding:0.4rem 0.75rem;border-radius:8px;
          background:var(--bg-hover);border:1px solid var(--border);
          color:var(--text-muted);font-size:0.72rem;font-weight:700;
          cursor:pointer;transition:all var(--transition-fast);
          white-space:nowrap;
        }
        .eh-popup-btn:hover { background:var(--bg-input);color:var(--text-main);border-color:var(--primary); }
        .eh-popup-btn-active { background:rgba(99,102,241,0.1);color:var(--primary);border-color:var(--primary); }
        .eh-popup-dl-btn {
          display:inline-flex;align-items:center;gap:0.35rem;
          padding:0.4rem 0.75rem;border-radius:8px;
          background:linear-gradient(135deg,#6366f1,#a855f7);
          border:none;color:#fff;font-size:0.72rem;font-weight:700;
          cursor:pointer;transition:all var(--transition-fast);
          white-space:nowrap;box-shadow:0 2px 8px rgba(99,102,241,0.25);
        }
        .eh-popup-dl-btn:hover { transform:translateY(-1px);box-shadow:0 4px 16px rgba(99,102,241,0.35); }
        .eh-popup-dl-btn-sel { background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 2px 8px rgba(16,185,129,0.25); }
        .eh-popup-dl-btn-sel:hover { box-shadow:0 4px 16px rgba(16,185,129,0.35); }
        .eh-popup-close {
          width:36px;height:36px;border-radius:10px;
          background:var(--bg-hover);border:1px solid var(--border);
          color:var(--text-muted);cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          transition:all var(--transition-fast);margin-left:0.25rem;
        }
        .eh-popup-close:hover { background:rgba(239,68,68,0.1);color:#ef4444;border-color:#ef4444; }

        /* Instructions Bar */
        .eh-popup-instruct {
          display:flex;align-items:center;gap:0.5rem;
          padding:0.6rem 1.25rem;
          background:rgba(6,182,212,0.04);
          border-bottom:1px solid rgba(6,182,212,0.08);
          font-size:0.78rem;color:var(--text-muted);font-weight:600;
          flex-shrink:0;
        }
        .eh-popup-instruct svg { color:#06b6d4;flex-shrink:0; }

        /* Asset Grid Body */
        .eh-popup-body {
          flex:1;overflow-y:auto;
          padding:1.25rem;
          min-height:200px;
        }
        .eh-popup-body::-webkit-scrollbar { width:4px; }
        .eh-popup-body::-webkit-scrollbar-thumb { background:var(--border);border-radius:4px; }

        .eh-popup-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(160px,1fr));
          gap:0.85rem;
        }

        /* Asset Card */
        .eh-popup-card {
          border-radius:var(--radius-lg);
          background:var(--bg-input);
          border:1.5px solid var(--border);
          overflow:hidden;
          transition:all var(--transition-base);
          cursor:default;
        }
        .eh-popup-card:hover { background:var(--bg-hover);border-color:var(--primary-glow);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.15); }
        .eh-popup-card-sel { border-color:var(--primary)!important;background:rgba(99,102,241,0.06)!important;box-shadow:0 0 0 1px rgba(99,102,241,0.3); }

        .eh-popup-card-thumb {
          position:relative;width:100%;aspect-ratio:1;
          overflow:hidden;background:var(--bg-deep);
          cursor:pointer;
        }
        .eh-popup-card-thumb img { width:100%;height:100%;object-fit:cover; }
        .eh-popup-card-no-thumb {
          width:100%;height:100%;display:flex;align-items:center;justify-content:center;
          color:var(--text-dim);
        }

        .eh-popup-type-badge {
          position:absolute;top:6px;left:6px;
          padding:2px 6px;border-radius:4px;
          font-size:0.55rem;font-weight:800;text-transform:uppercase;
          letter-spacing:0.05em;
        }
        .eh-popup-type-badge.design { background:rgba(99,102,241,0.2);color:#818cf8; }
        .eh-popup-type-badge.variation { background:rgba(16,185,129,0.2);color:#34d399; }
        .eh-popup-type-badge.raw { background:rgba(245,158,11,0.2);color:#fbbf24; }
        .eh-popup-type-badge.edited { background:rgba(168,85,247,0.2);color:#c084fc; }

        .eh-popup-check {
          position:absolute;top:6px;right:6px;
          width:24px;height:24px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;z-index:2;
        }
        .eh-popup-check-box {
          width:18px;height:18px;border-radius:4px;
          border:2px solid rgba(255,255,255,0.5);
          background:rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          transition:all var(--transition-fast);
        }
        .eh-popup-card:hover .eh-popup-check-box { border-color:rgba(255,255,255,0.8);background:rgba(0,0,0,0.5); }
        .eh-popup-check-on { background:var(--primary)!important;border-color:var(--primary)!important; }

        .eh-popup-card-dl {
          position:absolute;bottom:6px;right:6px;
          width:30px;height:30px;border-radius:8px;
          background:rgba(0,0,0,0.5);
          backdrop-filter:blur(4px);
          color:#fff;display:flex;align-items:center;justify-content:center;
          cursor:pointer;transition:all var(--transition-fast);
          opacity:0;
        }
        .eh-popup-card:hover .eh-popup-card-dl { opacity:1; }
        .eh-popup-card-dl:hover { background:var(--primary);transform:scale(1.1); }

        .eh-popup-card-label {
          padding:0.5rem 0.6rem;font-size:0.72rem;font-weight:700;
          color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        }

        /* Popup Footer */
        .eh-popup-footer {
          display:flex;justify-content:space-between;align-items:center;
          padding:0.85rem 1.25rem;
          border-top:1px solid var(--border);
          flex-shrink:0;
        }
        .eh-popup-f-left { display:flex;align-items:center;gap:0.5rem; }
        .eh-popup-f-stat { font-size:0.8rem;font-weight:700;color:var(--text-muted); }
        .eh-popup-f-right { display:flex;align-items:center;gap:0.5rem; }

        /* Spinner */
        .eh-spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .eh-root { padding:1rem; padding-top:90px; }
          .eh-header h1 { font-size:1.3rem; }
          .eh-tabs button { font-size:0.7rem; padding:0.35rem 0.7rem; }
          .eh-kpi-strip { grid-template-columns:repeat(2,1fr); gap:0.5rem; }
          .eh-kpi { padding:0.7rem; }
          .eh-kpi-value { font-size:1.1rem; }
          .eh-kpi-label { font-size:0.55rem; }
          .eh-search-box { width:100%; }
          .eh-task-item { gap:0.6rem; padding:0.7rem; }
          .eh-task-thumb { width:44px; height:44px; }
          .eh-task-name { font-size:0.8rem; }
          .eh-editor-panel { position:static; max-height:none; overflow:visible; margin-top:1rem; }
        }
        @media (max-width: 480px) {
          .eh-root { padding:0.7rem; padding-top:85px; }
          .eh-kpi-strip { grid-template-columns:1fr; }
          .eh-kpi { padding:0.5rem; }
          .eh-header { gap:0.75rem; }
          .eh-tabs button { font-size:0.6rem; padding:0.25rem 0.5rem; }
          .eh-editor-header { flex-direction:column; }
          .eh-editor-preview { width:100%; height:auto; aspect-ratio:16/9; }
          .eh-editor-title { font-size:1rem; }
          .eh-task-item { padding:0.5rem; gap:0.4rem; }
          .eh-task-thumb { width:36px; height:36px; }
          .eh-form-actions { flex-direction:column; gap:0.5rem; }
          .eh-form-actions button { width:100%; justify-content:center; }
        }
      `}</style>
    </RoleGuard>
  );
}
