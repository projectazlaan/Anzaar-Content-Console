"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadRawAssets, markAsShot } from "@/lib/actions";
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  Clock, 
  ImageIcon,
  Loader2,
  AlertCircle,
  X,
  FileCode,
  Files,
  CheckSquare,
  Square,
  Layers,
  ChevronDown,
  ChevronUp,
  List,
  Zap,
  Target,
  Award
} from "lucide-react";

export default function ShootingPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [dragState, setDragState] = useState<"idle" | "drag" | "selected" | "uploading" | "done">("idle");
  const [galleryOpen, setGalleryOpen] = useState(true);
  const dropRef = useRef<HTMLDivElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getDisplayUrl = (url: string | null, id?: string | null, size = 400) => {
    if (!url && !id) return null;
    if (id) return `/api/image?id=${id}`;
    const match = url?.match(/[-\w]{25,}/);
    if (match) return `/api/image?id=${match[0]}`;
    return url || undefined;
  };

  const toggleTaskSelection = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewingImage) return;
      if (e.key === "Escape") setViewingImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingImage]);

  const selectAllTasks = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  useEffect(() => {
    const q = query(collection(db, "products"), where("status", "==", "Pending Shoot"));
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

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length > 0) {
      setSelectedFiles(arr);
      setDragState("selected");
      setError("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragState === "idle") setDragState("drag");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragState === "drag") setDragState("idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setDragState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (taskId: string) => {
    if (!selectedFiles.length) return;

    setIsUploading(true);
    setDragState("uploading");
    setUploadProgress(0);
    setError("");

    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("files", selectedFiles[i]);
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 50));
      }

      const uploadResult = await uploadRawAssets(taskId, formData);
      if (!uploadResult.success) throw new Error(uploadResult.error || "Upload failed");

      setUploadProgress(80);

      const markResult = await markAsShot(taskId);
      if (!markResult.success) throw new Error(markResult.error || "Failed to update status");

      setUploadProgress(100);
      setDragState("done");
      setUploadSuccess(true);
      setSelectedTask(null);
      clearFiles();

      setTimeout(() => {
        setUploadSuccess(false);
        setDragState("idle");
        setUploadProgress(0);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      setDragState("selected");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (selectedTasks.length === 0 || !selectedFiles.length) return;

    setIsUploading(true);
    setDragState("uploading");
    setUploadProgress(0);
    setError("");

    try {
      for (let i = 0; i < selectedTasks.length; i++) {
        const formData = new FormData();
        for (let j = 0; j < selectedFiles.length; j++) {
          formData.append("files", selectedFiles[j]);
        }
        const uploadResult = await uploadRawAssets(selectedTasks[i], formData);
        if (!uploadResult.success) throw new Error(`Upload failed for product ${selectedTasks[i]}`);
        const markResult = await markAsShot(selectedTasks[i]);
        if (!markResult.success) throw new Error(`Failed to update status`);
        setUploadProgress(Math.round(((i + 1) / selectedTasks.length) * 100));
      }

      setDragState("done");
      setUploadSuccess(true);
      setSelectedTasks([]);
      clearFiles();

      setTimeout(() => {
        setUploadSuccess(false);
        setDragState("idle");
        setUploadProgress(0);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      setDragState("selected");
    } finally {
      setIsUploading(false);
    }
  };

  const stats = {
    total: tasks.length,
    urgent: tasks.filter(t => {
      if (!t.updatedAt?.toDate) return false;
      return Date.now() - t.updatedAt.toDate().getTime() > 86400000;
    }).length,
  };

  const showDropZone = selectedTask || selectedTasks.length > 0;

  return (
    <RoleGuard allowedRoles={["shooter"]}>
      <DashboardLayout>
        <div className="sp">
          <div className="sp-ambient">
            <div className="sp-glow sp-glow-1" />
            <div className="sp-glow sp-glow-2" />
            <div className="sp-grid" />
          </div>

          <div className="sp-content">
            <div className="sp-top">
              <div className="sp-top-l">
                <Camera size={20} className="sp-top-icon" />
                <div>
                  <h1 className="sp-top-title">Shooting Queue</h1>
                  <p className="sp-top-sub">Upload raw assets and complete your assignments</p>
                </div>
              </div>
              {uploadSuccess && (
                <div className="sp-toast"><CheckCircle2 size={16} /> Shoot completed! Sent for selection.</div>
              )}
            </div>

            <div className="sp-kpi">
              <div className="sp-kpi-c" style={{ "--kpi-clr": "#06b6d4" } as React.CSSProperties}>
                <div className="sp-kpi-h"><List size={15} /><span>Active Assignments</span></div>
                <div className="sp-kpi-v">{stats.total}</div>
                <div className="sp-kpi-b"><div className="sp-kpi-bf" style={{ width: "100%" }} /></div>
              </div>
              <div className="sp-kpi-c" style={{ "--kpi-clr": "#f59e0b" } as React.CSSProperties}>
                <div className="sp-kpi-h"><Zap size={15} /><span>Due Today</span></div>
                <div className="sp-kpi-v">{stats.total - stats.urgent}</div>
                <div className="sp-kpi-b"><div className="sp-kpi-bf" style={{ width: stats.total > 0 ? ((stats.total - stats.urgent) / stats.total) * 100 : 0 + "%" }} /></div>
              </div>
              <div className="sp-kpi-c" style={{ "--kpi-clr": "#ef4444" } as React.CSSProperties}>
                <div className="sp-kpi-h"><Clock size={15} /><span>Overdue</span></div>
                <div className="sp-kpi-v">{stats.urgent}</div>
                <div className="sp-kpi-b"><div className="sp-kpi-bf" style={{ width: stats.total > 0 ? (stats.urgent / stats.total) * 100 : 0 + "%" }} /></div>
              </div>
            </div>

            <div className="sp-body">
              <div className="sp-tasklist">
                <div className="sp-tl-h">
                  <span>Tasks</span>
                  <span className="sp-tl-c">{tasks.length}</span>
                </div>
                <div className="sp-bulk">
                  <button className="sp-bulk-btn" onClick={selectAllTasks}>
                    {selectedTasks.length === tasks.length ? <CheckSquare size={14} /> : <Square size={14} />}
                    <span>{selectedTasks.length === tasks.length ? "Deselect All" : "Select All"}</span>
                  </button>
                  {selectedTasks.length > 0 && <span className="sp-bulk-c">{selectedTasks.length} selected</span>}
                </div>
                <div className="sp-tl">
                  {tasks.map(task => (
                    <div key={task.id} className={`sp-task ${selectedTask?.id === task.id ? "sp-task-a" : ""} ${selectedTasks.includes(task.id) ? "sp-task-s" : ""}`}
                      onClick={() => {
                        setSelectedTask(task);
                        clearFiles();
                        setError("");
                      }}>
                      <div className="sp-task-m">
                        <div className="sp-thumb" onClick={(e) => {
                          e.stopPropagation();
                          const url = getDisplayUrl(task.thumbnailUrl) || getDisplayUrl(task.mainDesignUrl || task.designUrl, (task.mainDesignId || task.designId) as string | undefined);
                          if (url) setViewingImage(url);
                        }}>
                          {task.thumbnailUrl || task.mainDesignUrl || task.designUrl ? (
                            <img src={getDisplayUrl(task.thumbnailUrl) || getDisplayUrl(task.mainDesignUrl || task.designUrl, (task.mainDesignId || task.designId) as string | undefined) || ""} alt="" />
                          ) : <Camera size={14} />}
                        </div>
                        <div className="sp-task-i">
                          <h4>{task.name}</h4>
                          <span><Clock size={11} /> {task.updatedAt?.toDate ? task.updatedAt.toDate().toLocaleDateString() : "Just now"}</span>
                          {task.variationCount > 1 && <span className="sp-var">{task.variationCount} var.</span>}
                        </div>
                      </div>
                      <div className="sp-task-r">
                        <div className="sp-cb" onClick={(e) => toggleTaskSelection(task.id, e)}>
                          {selectedTasks.includes(task.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="sp-empty">
                      <CheckCircle2 size={32} />
                      <p>All caught up!</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="sp-main">
                {showDropZone ? (
                  <div className="sp-drop-panel">
                    <div className="sp-drop-h">
                      <h3>{selectedTasks.length > 0 ? "Bulk Upload" : `Upload Raw Assets`}</h3>
                      <p>{selectedTasks.length > 0 ? `${selectedTasks.length} products selected` : `Product: ${selectedTask?.name}`}</p>
                      <button className="sp-drop-x" onClick={() => { setSelectedTask(null); setSelectedTasks([]); clearFiles(); }}><X size={16} /></button>
                    </div>

                    {selectedTask && selectedTask.directions?.shoot && (
                      <div className="sp-dir">
                        <FileCode size={14} />
                        <strong>Instructions: </strong>
                        <span>{selectedTask.directions.shoot}</span>
                      </div>
                    )}

                    {selectedTasks.length > 0 && (
                      <div className="sp-bulk-list">
                        {tasks.filter(t => selectedTasks.includes(t.id)).map(t => (
                          <span key={t.id} className="sp-bulk-chip">{t.name}</span>
                        ))}
                      </div>
                    )}

                    <div
                      ref={dropRef}
                      className={`sp-dropzone ${dragState === "drag" ? "sp-dz-drag" : ""} ${dragState === "selected" ? "sp-dz-sel" : ""} ${dragState === "uploading" ? "sp-dz-up" : ""} ${dragState === "done" ? "sp-dz-done" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => dragState === "idle" && fileInputRef.current?.click()}
                    >
                      <input type="file" ref={fileInputRef} multiple hidden accept="image/*,video/*" onChange={handleFileChange} />

                      {dragState === "idle" && (
                        <div className="sp-dz-c">
                          <div className="sp-dz-i"><Upload size={32} /><span className="sp-dz-ripple" /></div>
                          <h4>Drop raw assets here</h4>
                          <p>or click to browse &mdash; JPG, PNG, MP4</p>
                        </div>
                      )}
                      {dragState === "drag" && (
                        <div className="sp-dz-c">
                          <div className="sp-dz-i sp-dz-i-pulse"><Upload size={36} /></div>
                          <h4>Release to upload</h4>
                        </div>
                      )}
                      {dragState === "selected" && (
                        <div className="sp-dz-c">
                          <div className="sp-dz-i"><Files size={28} /></div>
                          <h4>{selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected</h4>
                          <div className="sp-dz-names">
                            {selectedFiles.slice(0, 3).map(f => f.name).join(", ")}
                            {selectedFiles.length > 3 && <span> +{selectedFiles.length - 3} more</span>}
                          </div>
                          <div className="sp-dz-acts">
                            <button className="sp-dz-btn sp-dz-btn-p" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Change</button>
                            <button className="sp-dz-btn sp-dz-btn-s" onClick={(e) => { e.stopPropagation(); selectedTasks.length > 0 ? handleBulkUpload() : selectedTask && handleUpload(selectedTask.id); }}>
                              <Upload size={14} /> Upload & Complete
                            </button>
                          </div>
                        </div>
                      )}
                      {dragState === "uploading" && (
                        <div className="sp-dz-c">
                          <div className="sp-dz-i"><Loader2 className="sp-spin" size={28} /></div>
                          <h4>Uploading...</h4>
                          <div className="sp-progress"><div className="sp-progress-f" style={{ width: `${uploadProgress}%` }} /></div>
                          <p>{uploadProgress}%</p>
                        </div>
                      )}
                      {dragState === "done" && (
                        <div className="sp-dz-c">
                          <div className="sp-dz-i sp-dz-i-done"><CheckCircle2 size={32} /></div>
                          <h4>Upload complete!</h4>
                        </div>
                      )}
                    </div>

                    {error && <div className="sp-err"><AlertCircle size={14} /> {error}</div>}

                    {selectedFiles.length > 0 && (
                      <div className="sp-gallery">
                        <div className="sp-gal-h" onClick={() => setGalleryOpen(!galleryOpen)}>
                          <span>Files ({selectedFiles.length})</span>
                          {galleryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                        {galleryOpen && (
                          <div className="sp-gal-g">
                            {selectedFiles.map((f, i) => (
                              <div key={i} className="sp-gal-card">
                                {f.type.startsWith("image/") ? (
                                  <img src={URL.createObjectURL(f)} alt="" />
                                ) : (
                                  <div className="sp-gal-vid"><Camera size={20} /></div>
                                )}
                                <span>{f.name.length > 15 ? f.name.slice(0, 12) + "..." : f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="sp-welcome">
                    <div className="sp-w-i"><Camera size={48} /><div className="sp-w-pulse" /></div>
                    <h3>Select a task</h3>
                    <p>Choose a product from the queue to upload raw assets</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {viewingImage && (
          <div className="sp-viewer" onClick={() => setViewingImage(null)}>
            <div className="sp-viewer-c" onClick={e => e.stopPropagation()}>
              <button className="sp-viewer-x" onClick={() => setViewingImage(null)}><X size={20} /></button>
              <img src={viewingImage} alt="" />
            </div>
          </div>
        )}

        <style jsx>{`
          .sp { position: relative; min-height: calc(100vh - 2rem); padding: 1.5rem; font-family: -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif; color: #ebebf5; }
          .sp-ambient { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
          .sp-glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.12; }
          .sp-glow-1 { width: 500px; height: 500px; top: -100px; right: -100px; background: #06b6d4; }
          .sp-glow-2 { width: 400px; height: 400px; bottom: -80px; left: -80px; background: #0ea5e9; }
          .sp-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; }
          .sp-content { position: relative; z-index: 1; max-width: 1600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }
          .sp-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
          .sp-top-l { display: flex; align-items: center; gap: 0.75rem; }
          .sp-top-icon { color: #06b6d4; }
          .sp-top-title { font-size: 1.4rem; font-weight: 700; margin: 0; }
          .sp-top-sub { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; }
          .sp-toast { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 8px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #34d399; font-size: 0.8rem; font-weight: 600; }
          .sp-kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
          .sp-kpi-c { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1rem 1.25rem; transition: all 0.25s; }
          .sp-kpi-c:hover { background: rgba(255,255,255,0.05); transform: translateY(-2px); }
          .sp-kpi-h { display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--kpi-clr); margin-bottom: 0.5rem; }
          .sp-kpi-v { font-size: 2rem; font-weight: 800; line-height: 1; margin-bottom: 0.5rem; }
          .sp-kpi-b { height: 3px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
          .sp-kpi-bf { height: 100%; border-radius: 4px; background: var(--kpi-clr); transition: width 0.6s ease; }
          .sp-body { display: grid; grid-template-columns: 320px 1fr; gap: 1rem; min-height: 500px; }
          .sp-tasklist { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
          .sp-tl-h { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.4); }
          .sp-tl-c { background: rgba(255,255,255,0.06); padding: 0.1rem 0.45rem; border-radius: 6px; font-size: 0.7rem; }
          .sp-bulk { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 1rem; background: rgba(6,182,212,0.04); border-bottom: 1px solid rgba(6,182,212,0.08); }
          .sp-bulk-btn { display: flex; align-items: center; gap: 0.3rem; background: none; border: none; color: rgba(255,255,255,0.5); font-size: 0.7rem; font-weight: 600; cursor: pointer; padding: 0.2rem 0.3rem; border-radius: 4px; font-family: inherit; transition: all 0.15s; }
          .sp-bulk-btn:hover { color: #06b6d4; background: rgba(6,182,212,0.08); }
          .sp-bulk-c { font-size: 0.7rem; color: #06b6d4; font-weight: 600; margin-left: auto; }
          .sp-tl { flex: 1; overflow-y: auto; padding: 0.5rem; display: flex; flex-direction: column; gap: 0.3rem; }
          .sp-tl::-webkit-scrollbar { width: 3px; }
          .sp-tl::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 3px; }
          .sp-task { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: 8px; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
          .sp-task:hover { background: rgba(255,255,255,0.03); }
          .sp-task-a { background: rgba(6,182,212,0.08) !important; border-color: rgba(6,182,212,0.2); }
          .sp-task-s { background: rgba(6,182,212,0.04); border-color: rgba(6,182,212,0.1); }
          .sp-task-m { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; }
          .sp-thumb { width: 36px; height: 36px; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
          .sp-thumb img { width: 100%; height: 100%; object-fit: contain; }
          .sp-task-i { min-width: 0; }
          .sp-task-i h4 { font-size: 0.8rem; font-weight: 600; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .sp-task-i span { font-size: 0.65rem; color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 0.2rem; }
          .sp-var { font-size: 0.6rem; color: #06b6d4; background: rgba(6,182,212,0.08); padding: 0.05rem 0.3rem; border-radius: 3px; display: inline-block !important; margin-top: 0.15rem; }
          .sp-cb { color: rgba(255,255,255,0.2); cursor: pointer; display: flex; transition: color 0.15s; }
          .sp-cb:hover { color: #06b6d4; }
          .sp-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; color: rgba(255,255,255,0.3); text-align: center; }
          .sp-empty p { font-size: 0.85rem; margin: 0; }

          .sp-main { display: flex; flex-direction: column; }
          .sp-drop-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
          .sp-drop-h { display: flex; align-items: center; gap: 0.75rem; }
          .sp-drop-h h3 { font-size: 1rem; font-weight: 700; margin: 0; }
          .sp-drop-h p { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin: 0; flex: 1; }
          .sp-drop-x { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 0.3rem; border-radius: 4px; display: flex; transition: all 0.15s; }
          .sp-drop-x:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
          .sp-dir { display: flex; align-items: flex-start; gap: 0.4rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: rgba(6,182,212,0.04); border: 1px solid rgba(6,182,212,0.1); font-size: 0.75rem; color: rgba(255,255,255,0.6); }
          .sp-dir strong { color: #06b6d4; font-size: 0.65rem; text-transform: uppercase; }
          .sp-bulk-list { display: flex; flex-wrap: wrap; gap: 0.3rem; }
          .sp-bulk-chip { padding: 0.2rem 0.5rem; border-radius: 4px; background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.1); font-size: 0.7rem; color: #22d3ee; }
          .sp-dropzone { border: 2px dashed rgba(255,255,255,0.08); border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(255,255,255,0.01); position: relative; overflow: hidden; }
          .sp-dropzone:hover { border-color: #06b6d4; background: rgba(6,182,212,0.03); }
          .sp-dz-drag { border-color: #06b6d4 !important; background: rgba(6,182,212,0.06) !important; transform: scale(1.01); }
          .sp-dz-sel { border-style: solid; border-color: rgba(6,182,212,0.3); background: rgba(6,182,212,0.02); }
          .sp-dz-up { border-style: solid; border-color: #06b6d4; background: rgba(6,182,212,0.02); pointer-events: none; }
          .sp-dz-done { border-style: solid; border-color: #34d399; background: rgba(16,185,129,0.03); }
          .sp-dz-c { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
          .sp-dz-i { position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.15); margin-bottom: 0.25rem; }
          .sp-dz-i-pulse { color: #06b6d4; animation: spPulse 1s infinite; }
          .sp-dz-i-done { color: #34d399; }
          .sp-dz-ripple { position: absolute; inset: -10px; border-radius: 50%; border: 2px solid rgba(6,182,212,0.2); animation: spRipple 1.5s infinite; }
          @keyframes spRipple { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
          @keyframes spPulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
          .sp-dz-c h4 { font-size: 0.95rem; font-weight: 600; margin: 0; }
          .sp-dz-c p { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin: 0; }
          .sp-dz-names { font-size: 0.7rem; color: rgba(255,255,255,0.4); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .sp-dz-names span { color: #06b6d4; }
          .sp-dz-acts { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
          .sp-dz-btn { padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; display: flex; align-items: center; gap: 0.3rem; }
          .sp-dz-btn-p { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
          .sp-dz-btn-p:hover { background: rgba(255,255,255,0.08); color: #fff; }
          .sp-dz-btn-s { background: #06b6d4; border: none; color: #fff; }
          .sp-dz-btn-s:hover { background: #0891b2; }
          .sp-progress { width: 200px; height: 4px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
          .sp-progress-f { height: 100%; background: linear-gradient(90deg, #06b6d4, #0ea5e9); border-radius: 4px; transition: width 0.3s ease; }
          .sp-err { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15); color: #f87171; font-size: 0.8rem; }
          .sp-spin { animation: spSpin 1s linear infinite; }
          @keyframes spSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

          .sp-gallery { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; overflow: hidden; }
          .sp-gal-h { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; cursor: pointer; font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.4); transition: color 0.15s; }
          .sp-gal-h:hover { color: rgba(255,255,255,0.6); }
          .sp-gal-g { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.4rem; padding: 0 0.75rem 0.75rem; }
          .sp-gal-card { aspect-ratio: 1; border-radius: 6px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.04); }
          .sp-gal-card img { width: 100%; height: 100%; object-fit: cover; }
          .sp-gal-vid { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.2); }
          .sp-gal-card span { position: absolute; bottom: 0; left: 0; right: 0; font-size: 0.5rem; padding: 0.1rem 0.3rem; background: rgba(0,0,0,0.6); color: rgba(255,255,255,0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

          .sp-welcome { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: rgba(255,255,255,0.3); text-align: center; }
          .sp-w-i { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
          .sp-w-i svg { color: rgba(255,255,255,0.1); }
          .sp-w-pulse { position: absolute; inset: -10px; border-radius: 50%; background: #06b6d4; filter: blur(30px); opacity: 0.06; animation: spPulse 2s infinite; }
          .sp-welcome h3 { font-size: 1.1rem; margin: 0; color: rgba(255,255,255,0.5); }
          .sp-welcome p { font-size: 0.85rem; margin: 0; }

          .sp-viewer { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.92); backdrop-filter: blur(20px); display: flex; align-items: center; justify-content: center; }
          .sp-viewer-c { position: relative; max-width: 90vw; max-height: 90vh; }
          .sp-viewer-c img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }
          .sp-viewer-x { position: absolute; top: -2.5rem; right: 0; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.08); border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
          .sp-viewer-x:hover { background: rgba(239,68,68,0.3); }

          @media (max-width: 1024px) { .sp-body { grid-template-columns: 1fr; } .sp-tasklist { max-height: 300px; } .sp-kpi { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 768px) { .sp-kpi { grid-template-columns: 1fr; } .sp-top { flex-direction: column; align-items: flex-start; } .sp-drop-h { flex-wrap: wrap; } }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}
