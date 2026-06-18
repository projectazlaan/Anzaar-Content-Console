"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, onSnapshot, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadRawAssets, markAsShot } from "@/lib/actions";
import { getDisplayUrl } from "@/lib/utils";
import {
  Camera,
  List,
  Upload,
  CheckCircle2,
  Clock,
  ChevronRight,
  ImageIcon,
  Loader2,
  AlertCircle,
  X,
  FileCode,
  Files,
  CheckSquare,
  Square,
  Layers,
  ChevronLeft,
  Zap,
  Sparkles,
  Activity,
  Calendar,
  AlertTriangle,
  Timer,
  Target,
  FolderOpen,
  ArrowUpFromLine,
  Maximize2,
  Minimize2,
  Play,
  CheckCheck,
  Hourglass,
} from "lucide-react";
import { useImageViewer } from "@/components/ImageViewerProvider";
import { useToast } from "@/components/ToastProvider";

export default function ShootingPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "urgent" | "recent">("all");
  const [filePreviews, setFilePreviews] = useState<{ name: string; url: string; isVideo: boolean }[]>([]);
  const [uploadedPreviews, setUploadedPreviews] = useState<{ name: string; url: string; isVideo: boolean }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [galleryExpanded, setGalleryExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const { openViewer } = useImageViewer();
  const { showToast } = useToast();

  const toggleTaskSelection = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const selectAllTasks = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "products"),
      where("status", "==", "Pending Shoot")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedTasks.sort((a: any, b: any) => {
        const dateA = a.updatedAt?.toDate?.() || a.updatedAt || 0;
        const dateB = b.updatedAt?.toDate?.() || b.updatedAt || 0;
        return dateB - dateA;
      });
      setTasks(fetchedTasks);
    }, (err) => {
      console.error("Shooting query error:", err);
      setError("Failed to fetch shooting tasks. " + err.message);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      filePreviews.forEach(p => URL.revokeObjectURL(p.url));
      uploadedPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, []);

  const getTaskAge = (task: any): { label: string; color: string; pulse: boolean } => {
    const now = Date.now();
    const updated = task.updatedAt?.toDate?.()?.getTime() || task.createdAt?.toDate?.()?.getTime() || now;
    const hours = (now - updated) / (1000 * 60 * 60);
    if (hours > 48) return { label: "Overdue", color: "#ef4444", pulse: true };
    if (hours > 24) return { label: "Urgent", color: "#f59e0b", pulse: false };
    if (hours > 12) return { label: "Due Soon", color: "#06b6d4", pulse: false };
    return { label: "New", color: "#10b981", pulse: false };
  };

  const getPriorityValue = (task: any): number => {
    const now = Date.now();
    const updated = task.updatedAt?.toDate?.()?.getTime() || task.createdAt?.toDate?.()?.getTime() || now;
    return (now - updated) / (1000 * 60 * 60);
  };

  const filteredTasks = tasks.filter(t => {
    if (priorityFilter === "all") return true;
    const age = getPriorityValue(t);
    if (priorityFilter === "urgent") return age > 24;
    if (priorityFilter === "recent") return age <= 24;
    return true;
  });

  const completedToday = tasks.filter(t => {
    const today = new Date().toDateString();
    const taskDate = t.updatedAt?.toDate?.()?.toDateString() || t.createdAt?.toDate?.()?.toDateString();
    return taskDate === today;
  }).length;

  const generatePreviews = (files: FileList) => {
    return Array.from(files).map(f => ({
      name: f.name,
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith("video/")
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
      setFilePreviews(generatePreviews(e.target.files));
      setError("");
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      setDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(e.dataTransfer.files);
      setFilePreviews(generatePreviews(e.dataTransfer.files));
      setError("");
    }
  }, []);

  const clearPreviews = () => {
    filePreviews.forEach(p => URL.revokeObjectURL(p.url));
    setFilePreviews([]);
    setSelectedFiles(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !selectedFiles || selectedFiles.length === 0) {
      showToast({ type: 'error', title: 'Error', description: 'Please select files first.' });
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadProgress(`Uploading ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}...`);

    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("files", selectedFiles[i]);
      }

      const uploadResult = await uploadRawAssets(selectedTask.id, formData);
      if (!uploadResult.success) throw new Error(uploadResult.error || "Upload failed");

      const markResult = await markAsShot(selectedTask.id);
      if (!markResult.success) throw new Error(markResult.error || "Failed to update status");

      showToast({ type: 'success', title: 'Shoot Complete! 🎯', description: `"${selectedTask.name}" moved to Selection stage` });
      setUploadedPreviews(filePreviews);
      setFilePreviews([]);
      setSelectedFiles(null);
      setUploadProgress("");
    } catch (err: any) {
      showToast({ type: 'error', title: 'Upload Failed', description: err.message });
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTasks.length === 0 || !selectedFiles || selectedFiles.length === 0) {
      showToast({ type: 'error', title: 'Error', description: 'Please select products and files first.' });
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      for (let idx = 0; idx < selectedTasks.length; idx++) {
        const taskId = selectedTasks[idx];
        const task = tasks.find(t => t.id === taskId);
        setUploadProgress(`[${idx + 1}/${selectedTasks.length}] Processing "${task?.name || taskId}"...`);

        const formData = new FormData();
        for (let i = 0; i < selectedFiles.length; i++) {
          formData.append("files", selectedFiles[i]);
        }

        const uploadResult = await uploadRawAssets(taskId, formData);
        if (!uploadResult.success) throw new Error(`Upload failed for "${task?.name || taskId}"`);

        const markResult = await markAsShot(taskId);
        if (!markResult.success) throw new Error(`Status update failed for "${task?.name || taskId}"`);
      }

      showToast({ type: 'success', title: 'Bulk Complete! 🎯', description: `All ${selectedTasks.length} products moved to Selection stage` });
      setUploadedPreviews(filePreviews);
      setFilePreviews([]);
      setSelectedTasks([]);
      setSelectedFiles(null);
      setUploadProgress("");
    } catch (err: any) {
      showToast({ type: 'error', title: 'Bulk Upload Failed', description: err.message });
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const allowedRoles = ["shooter"];

  return (
    <RoleGuard allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="sx-root">
          <div className="sx-ambient" aria-hidden="true">
            <div className="sx-orb sx-orb-1" />
            <div className="sx-orb sx-orb-2" />
            <div className="sx-orb sx-orb-3" />
            <div className="sx-grid" />
          </div>

          {/* ── HEADER ── */}
          <header className="sx-header">
            <div className="sx-header-left">
              <span className="sx-badge">
                <Zap size={11} />
                <span>Studio Ops</span>
              </span>
              <h1 className="sx-title">
                <span className="sx-title-accent">Shooting</span> Queue
              </h1>
              <p className="sx-subtitle">Access your assigned shoots and upload raw assets for the Selection stage.</p>
            </div>
            <div className="sx-header-stats">
              <div className="sx-hstat"><Camera size={14} /><strong>{tasks.length}</strong><span>Active</span></div>
              <div className="sx-hstat"><CheckCircle2 size={14} /><strong>{completedToday}</strong><span>Done Today</span></div>
              <div className="sx-hstat"><Hourglass size={14} /><strong>{tasks.filter(t => getTaskAge(t).label === "Overdue").length}</strong><span>Overdue</span></div>
            </div>
          </header>

          {/* ── KPI STRIP ── */}
          <section className="sx-kpi">
            {[
              { key: "all", icon: <Activity size={18} />, label: "All Shoots", value: filteredTasks.length, color: "#818cf8", glow: "rgba(99,102,241,0.35)" },
              { key: "urgent", icon: <AlertTriangle size={18} />, label: "Urgent / Overdue", value: tasks.filter(t => getTaskAge(t).label === "Urgent" || getTaskAge(t).label === "Overdue").length, color: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
              { key: "recent", icon: <CheckCircle2 size={18} />, label: "Recent (&lt;24h)", value: tasks.filter(t => getTaskAge(t).label === "New" || getTaskAge(t).label === "Due Soon").length, color: "#10b981", glow: "rgba(16,185,129,0.35)" },
            ].map(kpi => {
              const isActive = priorityFilter === kpi.key;
              return (
                <button key={kpi.key} className={`sx-kpi-card ${isActive ? "sx-kpi-active" : ""}`} style={{ "--kpi-clr": kpi.color, "--kpi-glw": kpi.glow } as React.CSSProperties} onClick={() => setPriorityFilter(isActive ? "all" : kpi.key as any)}>
                  <div className="sx-kpi-icon">{kpi.icon}</div>
                  <div className="sx-kpi-body">
                    <span className="sx-kpi-val">{kpi.value}</span>
                    <span className="sx-kpi-lbl">{kpi.label}</span>
                  </div>
                  {isActive && <span className="sx-kpi-dot" />}
                </button>
              );
            })}
          </section>

          {/* ── BODY ── */}
          <div className="sx-body">
            {/* ── LEFT: QUEUE ── */}
            <div className="sx-queue">
              <div className="sx-queue-header">
                <div className="sx-queue-title">
                  <List size={16} />
                  <h2>Task Queue</h2>
                  <span className="sx-badge-pill">{filteredTasks.length}</span>
                </div>
                <div className="sx-queue-bulk">
                  <button className="sx-bulk-btn" onClick={selectAllTasks}>
                    {selectedTasks.length === tasks.length ? <CheckSquare size={13} /> : <Square size={13} />}
                    <span>{selectedTasks.length === tasks.length ? "Deselect" : "Select All"}</span>
                  </button>
                  {selectedTasks.length > 0 && <span className="sx-bulk-num">{selectedTasks.length} selected</span>}
                </div>
              </div>

              {error && <div className="sx-err"><AlertCircle size={14} /><span>{error}</span></div>}

              <div className="sx-queue-list">
                {filteredTasks.map(task => {
                  const age = getTaskAge(task);
                  const isActive = selectedTask?.id === task.id;
                  const isMarked = selectedTasks.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      className={`sx-task ${isActive ? "sx-task-active" : ""} ${isMarked ? "sx-task-marked" : ""}`}
                      onClick={() => { setSelectedTask(task); setSelectedFiles(null); setFilePreviews([]); setUploadedPreviews([]); setError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    >
                      <div className="sx-task-check" onClick={(e) => toggleTaskSelection(task.id, e)}>
                        {selectedTasks.includes(task.id) ? <CheckSquare size={15} className="sx-ca" /> : <Square size={15} />}
                      </div>
                      <div className="sx-task-thumb" onClick={(e) => { e.stopPropagation(); openViewer(task); }}>
                        {task.thumbnailUrl || task.mainDesignUrl || task.designUrl ? (
                          <img src={getDisplayUrl(task.thumbnailUrl) || getDisplayUrl(task.mainDesignUrl || task.designUrl, (task.mainDesignId || task.designId) as string | undefined) || ''} alt="" />
                        ) : <Camera size={16} />}
                      </div>
                      <div className="sx-task-body">
                        <div className="sx-task-top">
                          <h3 className="sx-task-name">{task.name}</h3>
                          <span className="sx-task-age" style={{ color: age.color }}>
                            {age.pulse && <span className="sx-pulse-dot" />}
                            {age.label}
                          </span>
                        </div>
                        <div className="sx-task-meta">
                          <span><Clock size={11} />{task.updatedAt?.toDate ? task.updatedAt.toDate().toLocaleDateString() : 'Just now'}</span>
                          {(task.variationCount || 1) > 1 && <span><Layers size={11} />{task.variationCount} vars</span>}
                          <span><FileCode size={11} />{task.directions?.shoot ? "Instr." : "No instr."}</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="sx-arrow" />
                    </div>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <div className="sx-empty">
                    <div className="sx-empty-icon"><CheckCircle2 size={36} /></div>
                    <h3>All Caught Up</h3>
                    <p>{priorityFilter !== "all" ? `No ${priorityFilter} shoots.` : "No pending shoots assigned."}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: STUDIO PANEL ── */}
            <aside className="sx-studio">
              {selectedTasks.length > 0 ? (
                <div className="sx-panel">
                  <div className="sx-panel-head">
                    <div className="sx-panel-head-text">
                      <h3>Bulk Upload</h3>
                      <span><strong className="sx-accent">{selectedTasks.length}</strong> products selected</span>
                    </div>
                    <button className="sx-close" onClick={() => { setSelectedTasks([]); setUploadedPreviews([]); setFilePreviews([]); setSelectedFiles(null); }}><X size={16} /></button>
                  </div>
                  <div className="sx-divider" />

                  <div className="sx-bulk-products">
                    <div className="sx-bulk-title"><Layers size={13} /> Selected</div>
                    <div className="sx-bulk-list">
                      {tasks.filter(t => selectedTasks.includes(t.id)).map(task => (
                        <div key={task.id} className="sx-bulk-item">
                          <CheckSquare size={12} className="sx-ca" />
                          <span>{task.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleBulkUpload} className="sx-form">
                    <div
                      ref={dropRef}
                      className={`sx-adv-drop ${dragActive ? "sx-adv-drop-drag" : ""} ${selectedFiles ? "sx-adv-drop-ready" : ""} ${uploadedPreviews.length > 0 ? "sx-adv-drop-done" : ""}`}
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <input type="file" ref={fileInputRef} multiple required hidden onChange={handleFileChange} accept="image/*,video/*" />

                      {isUploading ? (
                        <div className="sx-adv-drop-uploading">
                          <div className="sx-adv-pulse-ring" />
                          <Loader2 className="sx-spin" size={32} />
                          <p className="sx-adv-drop-title">{uploadProgress || "Processing..."}</p>
                          <div className="sx-adv-progress-bar">
                            <div className="sx-adv-progress-fill" />
                          </div>
                        </div>
                      ) : dragActive ? (
                        <div className="sx-adv-drop-drag-state">
                          <div className="sx-adv-drag-ring">
                            <ArrowUpFromLine size={36} />
                          </div>
                          <p className="sx-adv-drop-title">Drop to Upload</p>
                          <span className="sx-adv-drop-hint">Same files → all {selectedTasks.length} products</span>
                        </div>
                      ) : selectedFiles ? (
                        <div className="sx-adv-drop-selected">
                          <div className="sx-adv-selected-badge">
                            <CheckCircle2 size={16} />
                            <span>{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected</span>
                          </div>
                          <div className="sx-adv-selected-grid">
                            {filePreviews.slice(0, 6).map((p, i) => (
                              <div key={i} className="sx-adv-thumb-preview">
                                {p.isVideo ? (
                                  <div className="sx-adv-thumb-video">
                                    <Play size={14} />
                                  </div>
                                ) : (
                                  <img src={p.url} alt="" />
                                )}
                              </div>
                            ))}
                            {filePreviews.length > 6 && (
                              <div className="sx-adv-thumb-more">+{filePreviews.length - 6}</div>
                            )}
                          </div>
                          <button type="button" className="sx-adv-clear" onClick={(e) => { e.stopPropagation(); clearPreviews(); }}>
                            <X size={13} /> Clear
                          </button>
                        </div>
                      ) : uploadedPreviews.length > 0 ? (
                        <div className="sx-adv-drop-complete">
                          <div className="sx-adv-complete-icon">
                            <CheckCheck size={24} />
                          </div>
                          <p className="sx-adv-drop-title">Upload Complete</p>
                          <button type="button" className="sx-adv-upload-more" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                            <Upload size={12} /> Upload More
                          </button>
                        </div>
                      ) : (
                        <div className="sx-adv-drop-empty">
                          <div className="sx-adv-drop-icon">
                            <ArrowUpFromLine size={28} />
                            <div className="sx-adv-ripple" />
                          </div>
                          <p className="sx-adv-drop-title">Drop files or click to browse</p>
                          <span className="sx-adv-drop-hint">Same set uploaded to all selected products</span>
                        </div>
                      )}
                    </div>

                    {selectedFiles && !isUploading && (
                      <button type="submit" className="sx-submit" disabled={isUploading || !selectedFiles}>
                        <div className="sx-submit-bg" />
                        <Upload size={15} />
                        <span>Shoot & Send ({selectedTasks.length})</span>
                        <Sparkles size={12} />
                      </button>
                    )}

                    {/* ── THUMBNAIL GALLERY ── */}
                    {(filePreviews.length > 0 || uploadedPreviews.length > 0) && (
                      <div className="sx-gallery">
                        <div className="sx-gallery-head" onClick={() => setGalleryExpanded(prev => !prev)}>
                          <div className="sx-gallery-head-left">
                            <ImageIcon size={13} />
                            <span>Assets ({filePreviews.length || uploadedPreviews.length})</span>
                          </div>
                          <button type="button" className="sx-gallery-toggle">
                            {galleryExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                          </button>
                        </div>
                        {galleryExpanded && (
                          <div className="sx-gallery-grid">
                            {(filePreviews.length > 0 ? filePreviews : uploadedPreviews).map((p, i) => (
                              <div key={i} className="sx-gallery-item" title={p.name}>
                                {p.isVideo ? (
                                  <div className="sx-gallery-video">
                                    <Play size={12} />
                                  </div>
                                ) : (
                                  <img src={p.url} alt={p.name} />
                                )}
                                <div className="sx-gallery-item-name">{p.name}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              ) : selectedTask ? (
                <div className="sx-panel">
                  <div className="sx-panel-head">
                    <div className="sx-panel-preview" onClick={() => openViewer(selectedTask)}>
                      <img src={getDisplayUrl(selectedTask.mainDesignUrl || selectedTask.designUrl, (selectedTask.mainDesignId || selectedTask.designId) as string | undefined, 400) || ''} alt="" />
                      <div className="sx-preview-overlay"><Maximize2 size={14} /></div>
                    </div>
                    <div className="sx-panel-head-text">
                      <h3>{selectedTask.name}</h3>
                      <span className="sx-cat">{selectedTask.category}</span>
                    </div>
                    <button className="sx-close" onClick={() => { setSelectedTask(null); setUploadedPreviews([]); setFilePreviews([]); setSelectedFiles(null); }}><X size={16} /></button>
                  </div>
                  <div className="sx-divider" />

                  <div className="sx-instr">
                    <div className="sx-instr-head">
                      <FileCode size={13} /> <strong>Director's Brief</strong>
                    </div>
                    <p>{selectedTask.directions?.shoot || "No specific instructions provided."}</p>
                  </div>

                  <form onSubmit={handleFileUpload} className="sx-form">
                    <div
                      ref={dropRef}
                      className={`sx-adv-drop ${dragActive ? "sx-adv-drop-drag" : ""} ${selectedFiles ? "sx-adv-drop-ready" : ""} ${uploadedPreviews.length > 0 ? "sx-adv-drop-done" : ""}`}
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <input type="file" ref={fileInputRef} id="rawFiles" multiple hidden onChange={handleFileChange} accept="image/*,video/*" />

                      {/* Drop zone states */}
                      {isUploading ? (
                        <div className="sx-adv-drop-uploading">
                          <div className="sx-adv-pulse-ring" />
                          <Loader2 className="sx-spin" size={32} />
                          <p className="sx-adv-drop-title">{uploadProgress || "Uploading to Drive..."}</p>
                          <div className="sx-adv-progress-bar">
                            <div className="sx-adv-progress-fill" />
                          </div>
                        </div>
                      ) : dragActive ? (
                        <div className="sx-adv-drop-drag-state">
                          <div className="sx-adv-drag-ring">
                            <ArrowUpFromLine size={36} />
                          </div>
                          <p className="sx-adv-drop-title">Drop to Upload</p>
                          <span className="sx-adv-drop-hint">Release to start uploading</span>
                        </div>
                      ) : selectedFiles ? (
                        <div className="sx-adv-drop-selected">
                          <div className="sx-adv-selected-badge">
                            <CheckCircle2 size={16} />
                            <span>{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected</span>
                          </div>
                          <div className="sx-adv-selected-grid">
                            {filePreviews.slice(0, 6).map((p, i) => (
                              <div key={i} className="sx-adv-thumb-preview">
                                {p.isVideo ? (
                                  <div className="sx-adv-thumb-video">
                                    <Play size={14} />
                                  </div>
                                ) : (
                                  <img src={p.url} alt="" />
                                )}
                              </div>
                            ))}
                            {filePreviews.length > 6 && (
                              <div className="sx-adv-thumb-more">+{filePreviews.length - 6}</div>
                            )}
                          </div>
                          <button type="button" className="sx-adv-clear" onClick={(e) => { e.stopPropagation(); clearPreviews(); }}>
                            <X size={13} /> Clear
                          </button>
                        </div>
                      ) : uploadedPreviews.length > 0 ? (
                        <div className="sx-adv-drop-complete">
                          <div className="sx-adv-complete-icon">
                            <CheckCheck size={24} />
                          </div>
                          <p className="sx-adv-drop-title">Upload Complete</p>
                          <button type="button" className="sx-adv-upload-more" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                            <Upload size={12} /> Upload More
                          </button>
                        </div>
                      ) : (
                        <div className="sx-adv-drop-empty">
                          <div className="sx-adv-drop-icon">
                            <ArrowUpFromLine size={28} />
                            <div className="sx-adv-ripple" />
                          </div>
                          <p className="sx-adv-drop-title">Drop raw assets or click to browse</p>
                          <span className="sx-adv-drop-hint">RAW, JPG, MP4 — Multiple files supported</span>
                        </div>
                      )}
                    </div>

                    {/* Submit button */}
                    {selectedFiles && !isUploading && (
                      <button type="submit" className="sx-submit" disabled={isUploading || !selectedFiles}>
                        <div className="sx-submit-bg" />
                        <Target size={15} />
                        <span>Complete Shoot</span>
                        <Sparkles size={12} />
                      </button>
                    )}

                    {/* ── THUMBNAIL GALLERY ── */}
                    {(filePreviews.length > 0 || uploadedPreviews.length > 0) && (
                      <div className="sx-gallery">
                        <div className="sx-gallery-head" onClick={() => setGalleryExpanded(prev => !prev)}>
                          <div className="sx-gallery-head-left">
                            <ImageIcon size={13} />
                            <span>Assets ({filePreviews.length || uploadedPreviews.length})</span>
                          </div>
                          <button type="button" className="sx-gallery-toggle">
                            {galleryExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                          </button>
                        </div>
                        {galleryExpanded && (
                          <div className="sx-gallery-grid">
                            {(filePreviews.length > 0 ? filePreviews : uploadedPreviews).map((p, i) => (
                              <div key={i} className="sx-gallery-item" title={p.name}>
                                {p.isVideo ? (
                                  <div className="sx-gallery-video">
                                    <Play size={12} />
                                  </div>
                                ) : (
                                  <img src={p.url} alt={p.name} />
                                )}
                                <div className="sx-gallery-item-name">{p.name}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="sx-hint">This moves the product to the Selection stage.</p>
                  </form>
                </div>
              ) : (
                <div className="sx-idle">
                  <div className="sx-idle-ring">
                    <div className="sx-idle-inner"><Camera size={28} /></div>
                  </div>
                  <h3>Ready to Shoot</h3>
                  <p>Select a task from the queue to upload raw assets and complete your assignment.</p>
                </div>
              )}
            </aside>
          </div>
        </div>

        <style jsx>{`
          /* ================================================================
             ROOT
             ================================================================ */
          .sx-root { position: relative; max-width: 1700px; margin: 0 auto; padding: 1.8rem 2rem 3rem; min-height: 100vh; isolation: isolate; }

          /* ================================================================
             AMBIENT
             ================================================================ */
          .sx-ambient { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
          .sx-orb { position: absolute; border-radius: 50%; filter: blur(120px); animation: sx-drift 20s ease-in-out infinite alternate; }
          .sx-orb-1 { width: 700px; height: 700px; background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%); top: -200px; left: -100px; animation-duration: 18s; }
          .sx-orb-2 { width: 500px; height: 500px; background: radial-gradient(circle, var(--secondary-glow) 0%, transparent 70%); top: 30%; right: 5%; animation-duration: 24s; animation-delay: -8s; }
          .sx-orb-3 { width: 400px; height: 400px; background: radial-gradient(circle, var(--info-glow) 0%, transparent 70%); bottom: 5%; left: 35%; animation-duration: 30s; animation-delay: -15s; }
          @keyframes sx-drift {
            0%   { transform: translate(0, 0) scale(1); }
            50%  { transform: translate(40px, 30px) scale(1.08); }
            100% { transform: translate(-20px, 15px) scale(0.93); }
          }
          .sx-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(99,102,241,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.02) 1px, transparent 1px); background-size: 48px 48px; }

          /* ================================================================
             ANIMATIONS
             ================================================================ */
          @keyframes sx-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes sx-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes sx-scale-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
          @keyframes sx-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          @keyframes sx-spin { to { transform: rotate(360deg); } }
          .sx-spin { animation: sx-spin 0.8s linear infinite; }

          /* ================================================================
             HEADER
             ================================================================ */
          .sx-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; margin-bottom: 1.2rem; position: relative; z-index: 2; }
          .sx-header-left { flex-shrink: 0; }
          .sx-badge {
            display: inline-flex; align-items: center; gap: 0.35rem;
            padding: 0.2rem 0.65rem;
            background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
            border-radius: 100px; color: var(--primary);
            font-size: 0.6rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
            margin-bottom: 0.35rem;
          }
          .sx-badge svg { animation: sx-pulse 2s ease-in-out infinite; }
          .sx-title { font-size: 1.7rem; font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; margin: 0 0 0.2rem 0; color: var(--text-main); }
          .sx-title-accent { background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .sx-subtitle { font-size: 0.78rem; color: var(--text-dim); margin: 0; }
          .sx-header-stats { display: flex; gap: 0.5rem; }
          .sx-hstat {
            display: flex; align-items: center; gap: 0.3rem;
            padding: 0.35rem 0.75rem;
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: var(--radius-sm); backdrop-filter: var(--glass);
            font-size: 0.65rem; color: var(--text-muted); font-weight: 600;
          }
          .sx-hstat svg { color: var(--primary); }
          .sx-hstat strong { font-size: 0.85rem; color: var(--text-main); font-weight: 800; }

          /* ================================================================
             KPI STRIP
             ================================================================ */
          .sx-kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.7rem; margin-bottom: 1.5rem; position: relative; z-index: 2; }
          @media (max-width: 900px) { .sx-kpi { grid-template-columns: 1fr; } }
          .sx-kpi-card {
            position: relative; display: flex; align-items: center; gap: 0.75rem;
            padding: 0.85rem 1rem;
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: var(--radius-lg); backdrop-filter: var(--glass);
            cursor: pointer; transition: all 0.3s; box-shadow: var(--shadow-md); text-align: left;
          }
          .sx-kpi-card:hover { transform: translateY(-3px); border-color: var(--kpi-clr, var(--primary)); }
          .sx-kpi-active { border-color: var(--kpi-clr, var(--primary)); box-shadow: 0 0 20px var(--kpi-glw, transparent); }
          .sx-kpi-icon {
            width: 42px; height: 42px;
            display: flex; align-items: center; justify-content: center;
            border-radius: var(--radius-sm); background: var(--bg-hover); border: 1px solid var(--border);
            color: var(--kpi-clr, var(--text-muted)); flex-shrink: 0; transition: all 0.3s;
          }
          .sx-kpi-card:hover .sx-kpi-icon, .sx-kpi-active .sx-kpi-icon { background: var(--kpi-clr, var(--primary)); color: white; border-color: transparent; }
          .sx-kpi-body { flex: 1; }
          .sx-kpi-val { display: block; font-size: 1.6rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.03em; line-height: 1; }
          .sx-kpi-lbl { display: block; font-size: 0.62rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.1rem; }
          .sx-kpi-dot {
            position: absolute; top: 0.5rem; right: 0.5rem;
            width: 7px; height: 7px; border-radius: 50%;
            background: var(--kpi-clr, var(--primary)); animation: sx-pulse 1.5s ease-in-out infinite;
          }

          /* ================================================================
             BODY LAYOUT
             ================================================================ */
          .sx-body { display: grid; grid-template-columns: 1fr 420px; gap: 1.4rem; align-items: start; position: relative; z-index: 2; }
          @media (max-width: 1100px) { .sx-body { grid-template-columns: 1fr; } }

          /* ================================================================
             QUEUE (LEFT)
             ================================================================ */
          .sx-queue {
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: var(--radius-xl); backdrop-filter: var(--glass);
            box-shadow: var(--shadow-xl); overflow: hidden; display: flex; flex-direction: column;
            min-height: 560px;
          }
          .sx-queue-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
          }
          .sx-queue-title { display: flex; align-items: center; gap: 0.5rem; }
          .sx-queue-title h2 { font-size: 0.95rem; font-weight: 800; margin: 0; color: var(--text-main); }
          .sx-queue-title svg { color: var(--primary); }
          .sx-badge-pill {
            background: var(--primary-glow); color: var(--primary);
            font-size: 0.6rem; font-weight: 800; padding: 0.05rem 0.45rem;
            border-radius: 100px; min-width: 22px; text-align: center;
          }
          .sx-queue-bulk { display: flex; align-items: center; gap: 0.5rem; }
          .sx-bulk-btn {
            display: flex; align-items: center; gap: 0.35rem;
            padding: 0.3rem 0.65rem; border-radius: var(--radius-sm);
            background: var(--bg-hover); border: 1px solid var(--border);
            color: var(--text-muted); font-size: 0.7rem; font-weight: 600;
            cursor: pointer; transition: all 0.2s;
          }
          .sx-bulk-btn:hover { color: var(--text-main); border-color: var(--primary); }
          .sx-bulk-num { font-size: 0.7rem; font-weight: 700; color: var(--primary); }

          .sx-err {
            display: flex; align-items: center; gap: 0.5rem;
            margin: 0.75rem 1.25rem 0; padding: 0.6rem 0.85rem;
            background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15);
            border-radius: var(--radius-sm); color: var(--danger); font-size: 0.78rem; font-weight: 600;
          }

          .sx-queue-list {
            flex: 1; overflow-y: auto; padding: 0.75rem 1.25rem 1.25rem;
            display: flex; flex-direction: column; gap: 0.4rem;
          }
          .sx-queue-list::-webkit-scrollbar { width: 3px; }
          .sx-queue-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

          .sx-task {
            display: flex; align-items: center; gap: 0.7rem;
            padding: 0.6rem 0.75rem;
            border-radius: var(--radius-md);
            background: var(--bg-hover); border: 1px solid var(--border);
            cursor: pointer; transition: all 0.25s; animation: sx-slide-up 0.3s ease-out both;
          }
          .sx-task:hover { transform: translateX(5px); border-color: var(--primary-glow); }
          .sx-task-active { background: rgba(99,102,241,0.06) !important; border-color: var(--primary) !important; box-shadow: 0 0 12px rgba(99,102,241,0.08); }
          .sx-task-marked { border-color: rgba(99,102,241,0.3) !important; background: rgba(99,102,241,0.04) !important; }
          .sx-task-check { display: flex; align-items: center; color: var(--text-dim); transition: all 0.2s; flex-shrink: 0; cursor: pointer; }
          .sx-task-check:hover { transform: scale(1.15); color: var(--primary); }
          .sx-ca { color: var(--primary); filter: drop-shadow(0 0 3px rgba(99,102,241,0.3)); }

          .sx-task-thumb {
            width: 44px; height: 44px; border-radius: var(--radius-sm);
            overflow: hidden; flex-shrink: 0; border: 1px solid var(--border-light);
            background-image: linear-gradient(135deg, var(--bg-hover) 25%, transparent 25%), linear-gradient(225deg, var(--bg-hover) 25%, transparent 25%), linear-gradient(315deg, var(--bg-hover) 25%, transparent 25%), linear-gradient(45deg, var(--bg-hover) 25%, transparent 25%);
            background-size: 12px 12px; background-color: var(--bg-deep);
            display: flex; align-items: center; justify-content: center;
          }
          .sx-task-thumb img { width: 100%; height: 100%; object-fit: cover; }
          .sx-task-thumb svg { color: var(--text-dim); }

          .sx-task-body { flex: 1; min-width: 0; }
          .sx-task-top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.15rem; }
          .sx-task-name { font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .sx-task-age {
            display: inline-flex; align-items: center; gap: 0.25rem;
            font-size: 0.55rem; font-weight: 800;
            padding: 0.1rem 0.4rem; border-radius: 4px;
            background: rgba(255,255,255,0.04); text-transform: uppercase;
            letter-spacing: 0.05em; white-space: nowrap; flex-shrink: 0;
          }
          .sx-pulse-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: sx-pulse 1s ease-in-out infinite; }
          .sx-task-meta { display: flex; gap: 0.8rem; font-size: 0.62rem; color: var(--text-dim); }
          .sx-task-meta span { display: inline-flex; align-items: center; gap: 0.25rem; }
          .sx-arrow { color: var(--text-dim); transition: all 0.2s; flex-shrink: 0; }
          .sx-task:hover .sx-arrow { color: var(--primary); transform: translateX(3px); }

          .sx-empty {
            flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 0.7rem; padding: 3rem 2rem; color: var(--text-muted); text-align: center;
          }
          .sx-empty-icon {
            width: 64px; height: 64px; border-radius: var(--radius-md);
            background: var(--bg-hover); border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center;
            color: var(--accent); box-shadow: var(--shadow-sm);
          }
          .sx-empty h3 { font-size: 1rem; font-weight: 800; margin: 0; color: var(--text-main); }
          .sx-empty p { font-size: 0.78rem; margin: 0; }

          /* ================================================================
             STUDIO PANEL (RIGHT)
             ================================================================ */
          .sx-studio {
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: var(--radius-xl); backdrop-filter: var(--glass);
            box-shadow: var(--shadow-xl); position: sticky; top: 2.5rem;
            overflow-y: auto; max-height: calc(100vh - 6rem);
          }
          .sx-studio::-webkit-scrollbar { width: 3px; }
          .sx-studio::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

          .sx-panel { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.8rem; }
          .sx-panel-head { display: flex; gap: 0.75rem; align-items: flex-start; }
          .sx-panel-preview {
            width: 60px; height: 60px; border-radius: var(--radius-sm);
            overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);
            cursor: pointer; position: relative; transition: all 0.2s;
          }
          .sx-panel-preview:hover { border-color: var(--primary); transform: scale(1.05); }
          .sx-panel-preview img { width: 100%; height: 100%; object-fit: cover; }
          .sx-preview-overlay {
            position: absolute; inset: 0;
            background: var(--primary-glow); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            color: #fff; opacity: 0; transition: opacity 0.25s;
          }
          .sx-panel-preview:hover .sx-preview-overlay { opacity: 1; }
          .sx-panel-head-text { flex: 1; min-width: 0; }
          .sx-panel-head-text h3 { font-size: 1rem; font-weight: 800; margin: 0 0 0.15rem 0; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .sx-cat { font-size: 0.68rem; font-weight: 600; color: var(--text-muted); }
          .sx-accent { color: var(--primary); }
          .sx-close {
            width: 28px; height: 28px; border-radius: var(--radius-sm);
            background: var(--bg-input); border: 1px solid var(--border);
            color: var(--text-dim); display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; flex-shrink: 0;
          }
          .sx-close:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: var(--danger); }

          .sx-divider { height: 1px; background: linear-gradient(90deg, var(--border) 0%, transparent 80%); }

          /* Instructions */
          .sx-instr {
            padding: 0.8rem 1rem;
            background: rgba(99,102,241,0.04);
            border: 1px solid rgba(99,102,241,0.1);
            border-radius: var(--radius-sm);
          }
          .sx-instr-head { display: flex; align-items: center; gap: 0.4rem; color: var(--primary); margin-bottom: 0.4rem; }
          .sx-instr-head strong { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; }
          .sx-instr p { font-size: 0.8rem; line-height: 1.6; color: var(--text-muted); margin: 0; }

          /* Bulk Products */
          .sx-bulk-products {
            padding: 0.8rem 1rem;
            background: rgba(99,102,241,0.04);
            border: 1px solid rgba(99,102,241,0.1);
            border-radius: var(--radius-sm);
          }
          .sx-bulk-title { display: flex; align-items: center; gap: 0.4rem; font-size: 0.65rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem; }
          .sx-bulk-list { display: flex; flex-direction: column; gap: 0.25rem; max-height: 140px; overflow-y: auto; }
          .sx-bulk-list::-webkit-scrollbar { width: 3px; }
          .sx-bulk-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
          .sx-bulk-item {
            display: flex; align-items: center; gap: 0.5rem;
            padding: 0.3rem 0.5rem; border-radius: 4px;
            background: rgba(255,255,255,0.02);
            font-size: 0.75rem; font-weight: 600; color: var(--text-main);
          }

          /* Upload Form */
          .sx-form { display: flex; flex-direction: column; gap: 0.7rem; }

          /* ================================================================
             ADVANCED DROP ZONE
             ================================================================ */
          .sx-adv-drop {
            position: relative;
            border: 2px dashed var(--border);
            border-radius: var(--radius-lg);
            padding: 1.8rem 1.2rem;
            text-align: center; cursor: pointer;
            transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
            background: rgba(255,255,255,0.02);
            overflow: hidden;
            min-height: 140px;
            display: flex; align-items: center; justify-content: center;
          }
          .sx-adv-drop::before {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(135deg, rgba(99,102,241,0.03), rgba(139,92,246,0.03));
            opacity: 0; transition: opacity 0.35s;
          }
          .sx-adv-drop:hover::before { opacity: 1; }
          .sx-adv-drop:hover { border-color: var(--primary); }
          .sx-adv-drop-drag {
            border-style: solid;
            border-color: var(--primary) !important;
            background: rgba(99,102,241,0.06) !important;
            box-shadow: 0 0 40px rgba(99,102,241,0.1), inset 0 0 40px rgba(99,102,241,0.04);
            transform: scale(1.01);
          }
          .sx-adv-drop-ready {
            border-style: solid;
            border-color: var(--primary);
            background: rgba(99,102,241,0.04);
          }
          .sx-adv-drop-done {
            border-color: var(--accent);
            background: rgba(16,185,129,0.03);
            border-style: solid;
          }

          /* Empty state */
          .sx-adv-drop-empty { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
          .sx-adv-drop-icon { position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; }
          .sx-adv-drop-icon svg { color: var(--primary); position: relative; z-index: 1; }
          .sx-adv-ripple {
            position: absolute; width: 56px; height: 56px; border-radius: 50%;
            border: 1.5px solid var(--primary-glow);
            animation: sx-ripple 2s ease-out infinite;
          }
          .sx-adv-ripple::after {
            content: ''; position: absolute; inset: -12px; border-radius: 50%;
            border: 1px dashed rgba(99,102,241,0.15);
            animation: sx-ripple 2s ease-out infinite 0.5s;
          }
          @keyframes sx-ripple {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.8); opacity: 0; }
          }
          .sx-adv-drop-title { font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin: 0; }
          .sx-adv-drop-hint { font-size: 0.68rem; color: var(--text-dim); }

          /* Drag state */
          .sx-adv-drag-ring {
            width: 72px; height: 72px; border-radius: 50%;
            border: 2px solid var(--primary);
            display: flex; align-items: center; justify-content: center;
            color: var(--primary);
            animation: sx-drag-pulse 0.8s ease-in-out infinite alternate;
          }
          @keyframes sx-drag-pulse {
            from { transform: scale(1); box-shadow: 0 0 0 0 rgba(99,102,241,0.2); }
            to   { transform: scale(1.06); box-shadow: 0 0 0 12px rgba(99,102,241,0); }
          }
          .sx-adv-drop-drag-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }

          /* Selected state */
          .sx-adv-drop-selected { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; width: 100%; }
          .sx-adv-selected-badge {
            display: inline-flex; align-items: center; gap: 0.35rem;
            padding: 0.25rem 0.75rem;
            background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.15);
            border-radius: 100px;
            font-size: 0.72rem; font-weight: 700; color: var(--accent);
          }
          .sx-adv-selected-badge svg { color: var(--accent); }
          .sx-adv-selected-grid {
            display: flex; gap: 0.35rem; flex-wrap: wrap; justify-content: center;
            max-width: 100%;
          }
          .sx-adv-thumb-preview {
            width: 44px; height: 44px; border-radius: var(--radius-sm);
            overflow: hidden; border: 1px solid var(--border-light);
            background: var(--bg-deep);
          }
          .sx-adv-thumb-preview img { width: 100%; height: 100%; object-fit: cover; }
          .sx-adv-thumb-video {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            background: var(--bg-deep); color: var(--text-dim);
          }
          .sx-adv-thumb-more {
            width: 44px; height: 44px; border-radius: var(--radius-sm);
            background: var(--bg-hover); border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center;
            font-size: 0.6rem; font-weight: 800; color: var(--text-muted);
          }
          .sx-adv-clear {
            display: inline-flex; align-items: center; gap: 0.3rem;
            background: none; border: none; color: var(--danger);
            font-size: 0.65rem; font-weight: 600; cursor: pointer; padding: 0.2rem 0.4rem;
            border-radius: 4px; transition: all 0.2s;
          }
          .sx-adv-clear:hover { background: rgba(239,68,68,0.06); }

          /* Uploading state */
          .sx-adv-drop-uploading {
            display: flex; flex-direction: column; align-items: center; gap: 0.7rem;
            position: relative;
          }
          .sx-adv-pulse-ring {
            position: absolute; width: 64px; height: 64px; border-radius: 50%;
            border: 1.5px solid var(--primary-glow);
            animation: sx-ripple 1.2s ease-out infinite;
          }
          .sx-adv-progress-bar {
            width: 200px; max-width: 80%; height: 3px;
            border-radius: 4px; background: var(--border);
            overflow: hidden;
          }
          .sx-adv-progress-fill {
            height: 100%; width: 100%;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            border-radius: 4px;
            animation: sx-progress 1.8s ease-in-out infinite;
          }
          @keyframes sx-progress {
            0%   { transform: translateX(-100%); }
            50%  { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }

          /* Complete state */
          .sx-adv-drop-complete { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
          .sx-adv-complete-icon {
            width: 48px; height: 48px; border-radius: 50%;
            background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.15);
            display: flex; align-items: center; justify-content: center;
            color: var(--accent);
          }
          .sx-adv-upload-more {
            display: inline-flex; align-items: center; gap: 0.3rem;
            background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.1);
            color: var(--primary); font-size: 0.7rem; font-weight: 700;
            padding: 0.3rem 0.7rem; border-radius: var(--radius-sm);
            cursor: pointer; transition: all 0.2s;
          }
          .sx-adv-upload-more:hover { background: rgba(99,102,241,0.1); }

          /* ================================================================
             THUMBNAIL GALLERY
             ================================================================ */
          .sx-gallery {
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            overflow: hidden;
          }
          .sx-gallery-head {
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.5rem 0.7rem;
            cursor: pointer; transition: background 0.2s;
            user-select: none;
          }
          .sx-gallery-head:hover { background: rgba(255,255,255,0.02); }
          .sx-gallery-head-left { display: flex; align-items: center; gap: 0.35rem; font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
          .sx-gallery-head-left svg { color: var(--primary); }
          .sx-gallery-toggle {
            width: 22px; height: 22px; border-radius: 4px;
            background: var(--bg-hover); border: 1px solid var(--border);
            color: var(--text-dim); cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
          }
          .sx-gallery-toggle:hover { color: var(--text-main); border-color: var(--primary); }
          .sx-gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
            gap: 0.3rem;
            padding: 0.5rem 0.7rem 0.7rem;
            border-top: 1px solid var(--border);
          }
          .sx-gallery-item {
            position: relative;
            aspect-ratio: 1;
            border-radius: var(--radius-sm);
            overflow: hidden;
            border: 1px solid var(--border-light);
            background: var(--bg-deep);
            transition: all 0.2s;
          }
          .sx-gallery-item:hover {
            transform: scale(1.08);
            border-color: var(--primary);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 2;
          }
          .sx-gallery-item img { width: 100%; height: 100%; object-fit: cover; }
          .sx-gallery-video {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            background: var(--bg-deep); color: var(--text-dim);
          }
          .sx-gallery-item-name {
            position: absolute; bottom: 0; left: 0; right: 0;
            padding: 1px 3px;
            font-size: 0.45rem; font-weight: 600;
            background: rgba(0,0,0,0.65);
            color: rgba(255,255,255,0.8);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            backdrop-filter: blur(4px);
          }

          /* Submit Button */
          .sx-submit {
            width: 100%; padding: 0.8rem;
            border-radius: var(--radius-sm); border: none;
            color: #fff; font-weight: 800; font-size: 0.82rem;
            cursor: pointer; position: relative; overflow: hidden;
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            transition: all 0.25s; margin-top: 0.2rem;
          }
          .sx-submit-bg { position: absolute; inset: 0; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: var(--radius-sm); transition: all 0.25s; }
          .sx-submit::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%); background-size: 200% 200%; animation: shimmer 4s ease-in-out infinite; border-radius: var(--radius-sm); }
          @keyframes shimmer { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
          .sx-submit > * { position: relative; z-index: 1; }
          .sx-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px var(--primary-glow); }
          .sx-submit:disabled { opacity: 0.4; cursor: not-allowed; }
          .sx-hint { text-align: center; font-size: 0.68rem; color: var(--text-dim); margin: 0; }

          /* Idle State */
          .sx-idle { padding: 3rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; min-height: 400px; text-align: center; }
          .sx-idle-ring { width: 80px; height: 80px; border-radius: 50%; border: 1.5px solid var(--primary-glow); display: flex; align-items: center; justify-content: center; position: relative; }
          .sx-idle-ring::before { content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 1px dashed var(--border); }
          .sx-idle-inner { width: 52px; height: 52px; border-radius: 50%; background: var(--primary-glow); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--primary); }
          .sx-idle h3 { font-size: 1rem; font-weight: 800; margin: 0; color: var(--text-main); }
          .sx-idle p { font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.5; max-width: 240px; }

          /* ================================================================
             RESPONSIVE
             ================================================================ */
          @media (max-width: 1100px) {
            .sx-studio { position: static; max-height: none; }
          }
          @media (max-width: 768px) {
            .sx-root { padding: 1rem 1rem 1.5rem; padding-top: 0; }
            .sx-header { flex-direction: column; align-items: flex-start; gap: 0.8rem; }
            .sx-header-stats { width: 100%; justify-content: space-between; }
            .sx-hstat { flex: 1; justify-content: center; }
            .sx-kpi { grid-template-columns: 1fr; }
            .sx-body { gap: 1rem; }
            .sx-queue { min-height: 400px; }
            .sx-queue-header { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
            .sx-queue-list { padding: 0.5rem 0.75rem; }
            .sx-panel { padding: 1rem; }
            .sx-header h1 { font-size:1.3rem; }
            .sx-tabs button { font-size:0.7rem; padding:0.35rem 0.7rem; }
          }
          @media (max-width: 480px) {
            .sx-root { padding: 0.75rem 0.75rem 1.5rem; padding-top: 0; }
            .sx-header-title h1 { font-size:1.1rem; }
            .sx-tabs button { font-size:0.6rem; padding:0.25rem 0.5rem; }
            .sx-queue-header-left h2 { font-size:1rem; }
            .sx-queue-item { gap:0.5rem; padding:0.6rem; }
            .sx-ui-thumb { width:44px; height:44px; }
            .sx-panel { padding:0.7rem; }
            .sx-form-actions { flex-direction:column; gap:0.5rem; }
            .sx-form-actions button { width:100%; justify-content:center; }
          }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}
