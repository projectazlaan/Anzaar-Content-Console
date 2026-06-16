"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadEditedAsset } from "@/lib/actions";
import { 
  PenTool, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Loader2,
  AlertCircle,
  FileText,
  ImageIcon,
  Search,
  Filter,
  Layers,
  Calendar,
  TrendingUp,
  Package,
  Eye,
  X,
  Zap,
  Award,
  ChevronRight
} from "lucide-react";

export default function EditingPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const getDisplayUrl = (url: string | null, id?: string | null, size = 400) => {
    if (!url && !id) return null;
    if (id) return `/api/image?id=${id}`;
    const match = url?.match(/[-\w]{25,}/);
    if (match) return `/api/image?id=${match[0]}`;
    return url;
  };

  useEffect(() => {
    const q = query(collection(db, "products"), where("status", "==", "Pending Edit"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewingImage) return;
      if (e.key === "Escape") setViewingImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingImage]);

  const isWithinDateRange = (date: any) => {
    if (dateRange === "all") return true;
    if (!date?.toDate) return true;
    const pDate = date.toDate();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateRange === "today") return pDate >= today;
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
    return true;
  };

  const getPriority = (task: any): { label: string; color: string } => {
    if (!task.updatedAt?.toDate) return { label: "New", color: "#6366f1" };
    const hours = (Date.now() - task.updatedAt.toDate().getTime()) / 3600000;
    if (hours > 72) return { label: "Overdue", color: "#ef4444" };
    if (hours > 48) return { label: "Urgent", color: "#f59e0b" };
    if (hours > 24) return { label: "Due", color: "#06b6d4" };
    return { label: "New", color: "#6366f1" };
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = isWithinDateRange(t.updatedAt);
    const priority = getPriority(t);
    const matchesPriority = filterPriority === "all" || priority.label.toLowerCase() === filterPriority;
    return matchesSearch && matchesDate && matchesPriority;
  });

  const stats = {
    total: filteredTasks.length,
    dueToday: filteredTasks.filter(t => {
      if (!t.updatedAt?.toDate) return false;
      return (Date.now() - t.updatedAt.toDate().getTime()) < 86400000;
    }).length,
    urgent: filteredTasks.filter(t => {
      if (!t.updatedAt?.toDate) return false;
      return (Date.now() - t.updatedAt.toDate().getTime()) > 86400000 * 2;
    }).length,
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
      setSelectedTask(null);
      setTimeout(() => setUploadSuccess(false), 5000);
    } else {
      setError(result.error || "Upload failed");
    }
  };

  return (
    <RoleGuard allowedRoles={["editor"]}>
      <DashboardLayout>
        <div className="eh">
          <div className="eh-ambient">
            <div className="eh-glow eh-glow-1" />
            <div className="eh-glow eh-glow-2" />
            <div className="eh-glow eh-glow-3" />
            <div className="eh-grid" />
          </div>

          <div className="eh-content">
            <div className="eh-top">
              <div className="eh-top-l">
                <PenTool size={22} className="eh-top-icon" />
                <div>
                  <h1 className="eh-top-title">Editing Studio</h1>
                  <p className="eh-top-sub">Finalize assets and deliver polished content</p>
                </div>
              </div>
              {uploadSuccess && (
                <div className="eh-toast"><CheckCircle2 size={16} /> Delivered for review!</div>
              )}
            </div>

            <div className="eh-kpi">
              <div className="eh-kpi-c" style={{ "--kpi-color": "#f59e0b" } as React.CSSProperties}>
                <div className="eh-kpi-h">
                  <Package size={18} />
                  <span>Pending Edit</span>
                </div>
                <div className="eh-kpi-v">{stats.total}</div>
                <div className="eh-kpi-b"><div className="eh-kpi-bf" style={{ width: "100%" }} /></div>
              </div>
              <div className="eh-kpi-c" style={{ "--kpi-color": "#06b6d4" } as React.CSSProperties}>
                <div className="eh-kpi-h">
                  <TrendingUp size={18} />
                  <span>Due Today</span>
                </div>
                <div className="eh-kpi-v">{stats.dueToday}</div>
                <div className="eh-kpi-b"><div className="eh-kpi-bf" style={{ width: `${stats.total > 0 ? (stats.dueToday / stats.total) * 100 : 0}%` }} /></div>
              </div>
              <div className="eh-kpi-c" style={{ "--kpi-color": "#ef4444" } as React.CSSProperties}>
                <div className="eh-kpi-h">
                  <Clock size={18} />
                  <span>Overdue</span>
                </div>
                <div className="eh-kpi-v">{stats.urgent}</div>
                <div className="eh-kpi-b"><div className="eh-kpi-bf" style={{ width: `${stats.total > 0 ? (stats.urgent / stats.total) * 100 : 0}%` }} /></div>
              </div>
            </div>

            <div className="eh-controls">
              <div className="eh-date-pills">
                {[
                  { key: "all", label: "All" },
                  { key: "today", label: "Today" },
                  { key: "week", label: "7 Days" },
                  { key: "month", label: "30 Days" },
                ].map(d => (
                  <button key={d.key} className={`eh-date-pill ${dateRange === d.key ? "eh-date-pill-a" : ""}`} onClick={() => setDateRange(d.key)}>{d.label}</button>
                ))}
              </div>
              <div className="eh-search">
                <Search size={16} />
                <input type="text" placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="eh-filters">
                <div className="eh-filter">
                  <Filter size={14} />
                  <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                    <option value="all">All Priority</option>
                    <option value="new">New</option>
                    <option value="due">Due</option>
                    <option value="urgent">Urgent</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="eh-body">
              <div className="eh-tasklist">
                <div className="eh-tl-h">
                  <span>Editing Queue</span>
                  <span className="eh-tl-c">{filteredTasks.length}</span>
                </div>
                <div className="eh-tl">
                  {filteredTasks.map(task => {
                    const priority = getPriority(task);
                    const thumbnailUrl = getDisplayUrl(task.thumbnailUrl) || getDisplayUrl(task.mainDesignUrl || task.designUrl, task.mainDesignId || task.designId);
                    return (
                      <div key={task.id} className={`eh-task ${selectedTask?.id === task.id ? "eh-task-a" : ""}`}
                        onClick={() => { setSelectedTask(task); setError(""); }}>
                        <div className="eh-task-m">
                          <div className="eh-thumb" onClick={(e) => {
                            e.stopPropagation();
                            const url = getDisplayUrl(task.thumbnailUrl) || getDisplayUrl(task.mainDesignUrl || task.designUrl, task.mainDesignId || task.designId, 800);
                            if (url) setViewingImage(url);
                          }}>
                            {thumbnailUrl ? (
                              <img src={thumbnailUrl} alt="" />
                            ) : <ImageIcon size={14} />}
                          </div>
                          <div className="eh-task-i">
                            <h4>{task.name}</h4>
                            <span><Clock size={11} /> {task.updatedAt?.toDate ? task.updatedAt.toDate().toLocaleDateString() : "Just now"}</span>
                          </div>
                        </div>
                        <div className="eh-task-r">
                          <span className="eh-priority" style={{ background: `${priority.color}18`, color: priority.color, borderColor: `${priority.color}30` }}>
                            {priority.label}
                          </span>
                          <ChevronRight size={14} className="eh-arrow" />
                        </div>
                      </div>
                    );
                  })}
                  {filteredTasks.length === 0 && (
                    <div className="eh-empty">
                      <CheckCircle2 size={32} />
                      <p>No pending edits at this moment.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="eh-main">
                {selectedTask ? (
                  <div className="eh-panel">
                    <div className="eh-panel-h">
                      <div className="eh-panel-hl">
                        <h3>Deliver Final Edit</h3>
                        <p>{selectedTask.name}</p>
                      </div>
                      <span className="eh-cat">{selectedTask.category}</span>
                    </div>

                    <div className="eh-dir">
                      <FileText size={14} />
                      <strong>Edit Instructions</strong>
                      <p>{selectedTask.directions?.edit || "No specific edit instructions."}</p>
                    </div>

                    <div className="eh-assets">
                      <div className="eh-assets-h">
                        <ImageIcon size={14} />
                        <span>Raw Assets ({selectedTask.rawUrls?.length || selectedTask.variations?.length || 0})</span>
                      </div>
                      <div className="eh-assets-g">
                        {(selectedTask.rawUrls || selectedTask.variations?.map((v: any) => v.url || v) || []).map((url: string, i: number) => {
                          const displayUrl = getDisplayUrl(url, typeof url === 'string' && url.length > 20 ? url.match(/[-\w]{25,}/)?.[0] : undefined, 400);
                          return displayUrl ? (
                            <div key={i} className="eh-asset" onClick={() => setViewingImage(displayUrl)}>
                              <img src={displayUrl} alt="" />
                            </div>
                          ) : (
                            <a key={i} href={url} target="_blank" className="eh-asset-link">
                              <Eye size={16} /> Asset {i + 1}
                            </a>
                          );
                        })}
                      </div>
                    </div>

                    <form onSubmit={handleFileUpload} className="eh-form">
                      <div className="eh-file-box">
                        <input type="file" id="finalEdit" required hidden onChange={() => setError("")} />
                        <label htmlFor="finalEdit" className="eh-file-label">
                          <Upload size={22} />
                          <span>Upload Final Export</span>
                        </label>
                      </div>

                      {error && <div className="eh-error"><AlertCircle size={14} /> {error}</div>}

                      <button type="submit" className="eh-submit" disabled={isUploading || uploadSuccess}>
                        {isUploading ? (
                          <><Loader2 className="eh-spin" size={18} /> Uploading...</>
                        ) : uploadSuccess ? (
                          <><CheckCircle2 size={18} /> Delivered Successfully</>
                        ) : (
                          <><Upload size={18} /> Finalize & Submit Review</>
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="eh-welcome">
                    <div className="eh-w-i"><PenTool size={48} /><div className="eh-w-pulse" /></div>
                    <h3>Select a task</h3>
                    <p>Choose a product from the queue to start editing</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {viewingImage && (
          <div className="eh-viewer" onClick={() => setViewingImage(null)}>
            <div className="eh-viewer-c" onClick={e => e.stopPropagation()}>
              <button className="eh-viewer-x" onClick={() => setViewingImage(null)}><X size={22} /></button>
              <img src={viewingImage} alt="" />
            </div>
          </div>
        )}

        <style jsx>{`
          .eh { position: relative; min-height: calc(100vh - 2rem); padding: 1.5rem; font-family: -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif; color: #ebebf5; }
          .eh-ambient { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
          .eh-glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.13; }
          .eh-glow-1 { width: 500px; height: 500px; top: -100px; right: -100px; background: #f59e0b; }
          .eh-glow-2 { width: 400px; height: 400px; bottom: -80px; left: -80px; background: #06b6d4; }
          .eh-glow-3 { width: 300px; height: 300px; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #8b5cf6; opacity: 0.07; }
          .eh-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; }
          .eh-content { position: relative; z-index: 1; max-width: 1600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
          .eh-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
          .eh-top-l { display: flex; align-items: center; gap: 0.75rem; }
          .eh-top-icon { color: #f59e0b; }
          .eh-top-title { font-size: 1.4rem; font-weight: 700; margin: 0; }
          .eh-top-sub { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; }
          .eh-toast { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 8px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #34d399; font-size: 0.8rem; font-weight: 600; }

          .eh-kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
          .eh-kpi-c { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1rem 1.25rem; transition: all 0.25s; }
          .eh-kpi-c:hover { background: rgba(255,255,255,0.05); transform: translateY(-2px); }
          .eh-kpi-h { display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--kpi-color); margin-bottom: 0.5rem; }
          .eh-kpi-v { font-size: 2rem; font-weight: 800; line-height: 1; margin-bottom: 0.5rem; }
          .eh-kpi-b { height: 3px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
          .eh-kpi-bf { height: 100%; border-radius: 4px; background: var(--kpi-color); transition: width 0.6s ease; }

          .eh-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
          .eh-date-pills { display: flex; gap: 0.25rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.2rem; }
          .eh-date-pill { padding: 0.35rem 0.7rem; border-radius: 6px; background: none; border: none; color: rgba(255,255,255,0.4); font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
          .eh-date-pill:hover { color: rgba(255,255,255,0.7); }
          .eh-date-pill-a { background: rgba(245,158,11,0.15) !important; color: #fbbf24 !important; }
          .eh-search { display: flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.3rem 0.7rem; flex: 1; min-width: 160px; }
          .eh-search svg { color: rgba(255,255,255,0.3); flex-shrink: 0; }
          .eh-search input { background: none; border: none; color: #fff; font-size: 0.8rem; font-family: inherit; width: 100%; outline: none; }
          .eh-search input::placeholder { color: rgba(255,255,255,0.25); }
          .eh-filters { display: flex; gap: 0.4rem; }
          .eh-filter { display: flex; align-items: center; gap: 0.3rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.25rem 0.5rem; }
          .eh-filter svg { color: rgba(255,255,255,0.3); flex-shrink: 0; }
          .eh-filter select { background: none; border: none; color: #fff; font-size: 0.7rem; font-weight: 600; font-family: inherit; outline: none; cursor: pointer; padding: 0.25rem 0; }

          .eh-body { display: grid; grid-template-columns: 320px 1fr; gap: 1rem; min-height: 500px; }
          .eh-tasklist { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
          .eh-tl-h { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.4); }
          .eh-tl-c { background: rgba(255,255,255,0.06); padding: 0.1rem 0.45rem; border-radius: 6px; font-size: 0.7rem; }
          .eh-tl { flex: 1; overflow-y: auto; padding: 0.5rem; display: flex; flex-direction: column; gap: 0.3rem; }
          .eh-tl::-webkit-scrollbar { width: 3px; }
          .eh-tl::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 3px; }
          .eh-task { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem; border-radius: 8px; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
          .eh-task:hover { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.04); }
          .eh-task-a { background: rgba(245,158,11,0.08) !important; border-color: rgba(245,158,11,0.2) !important; }
          .eh-task-m { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; }
          .eh-thumb { width: 36px; height: 36px; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
          .eh-thumb img { width: 100%; height: 100%; object-fit: contain; }
          .eh-task-i { min-width: 0; }
          .eh-task-i h4 { font-size: 0.8rem; font-weight: 600; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .eh-task-i span { font-size: 0.65rem; color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 0.2rem; }
          .eh-task-r { display: flex; align-items: center; gap: 0.5rem; }
          .eh-priority { font-size: 0.6rem; font-weight: 700; padding: 0.12rem 0.45rem; border-radius: 4px; border: 1px solid; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.04em; }
          .eh-arrow { color: rgba(255,255,255,0.15); }
          .eh-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; color: rgba(255,255,255,0.3); text-align: center; }
          .eh-empty p { font-size: 0.85rem; margin: 0; }

          .eh-main { display: flex; flex-direction: column; }
          .eh-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
          .eh-panel-h { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
          .eh-panel-hl h3 { font-size: 1.1rem; font-weight: 700; margin: 0 0 0.2rem; }
          .eh-panel-hl p { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; }
          .eh-cat { font-size: 0.65rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 4px; background: rgba(245,158,11,0.1); color: #fbbf24; white-space: nowrap; }

          .eh-dir { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; border-radius: 10px; background: rgba(245,158,11,0.04); border: 1px solid rgba(245,158,11,0.1); }
          .eh-dir strong { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #f59e0b; }
          .eh-dir p { font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.6); margin: 0; }
          .eh-dir > :first-child { display: flex; align-items: center; gap: 0.4rem; color: #f59e0b; }

          .eh-assets { }
          .eh-assets-h { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.4); margin-bottom: 0.6rem; }
          .eh-assets-g { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.5rem; }
          .eh-asset { aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 1px solid rgba(255,255,255,0.06); transition: all 0.2s; background: rgba(255,255,255,0.02); }
          .eh-asset:hover { border-color: #f59e0b; transform: scale(1.03); }
          .eh-asset img { width: 100%; height: 100%; object-fit: cover; }
          .eh-asset-link { display: flex; align-items: center; justify-content: center; gap: 0.3rem; padding: 0.5rem; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); font-size: 0.7rem; text-decoration: none; transition: all 0.15s; }
          .eh-asset-link:hover { background: rgba(245,158,11,0.08); color: #fbbf24; }

          .eh-form { display: flex; flex-direction: column; gap: 0.75rem; }
          .eh-file-box input { display: none; }
          .eh-file-label { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 1.25rem; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); cursor: pointer; transition: all 0.2s; color: rgba(255,255,255,0.4); }
          .eh-file-label:hover { border-color: #f59e0b; background: rgba(245,158,11,0.04); color: #fbbf24; }
          .eh-error { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15); color: #f87171; font-size: 0.8rem; }
          .eh-submit { width: 100%; padding: 0.85rem; border-radius: 10px; border: none; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; transition: all 0.25s; font-family: inherit; }
          .eh-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(245,158,11,0.3); }
          .eh-submit:disabled { opacity: 0.5; cursor: not-allowed; }
          .eh-spin { animation: ehSpin 1s linear infinite; }
          @keyframes ehSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

          .eh-welcome { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: rgba(255,255,255,0.3); text-align: center; }
          .eh-w-i { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
          .eh-w-i svg { color: rgba(255,255,255,0.1); }
          .eh-w-pulse { position: absolute; inset: -10px; border-radius: 50%; background: #f59e0b; filter: blur(30px); opacity: 0.06; animation: ehPulse 2s infinite; }
          @keyframes ehPulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
          .eh-welcome h3 { font-size: 1.1rem; margin: 0; color: rgba(255,255,255,0.5); }
          .eh-welcome p { font-size: 0.85rem; margin: 0; }

          .eh-viewer { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.92); backdrop-filter: blur(20px); display: flex; align-items: center; justify-content: center; }
          .eh-viewer-c { position: relative; max-width: 90vw; max-height: 90vh; }
          .eh-viewer-c img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }
          .eh-viewer-x { position: absolute; top: -2.5rem; right: 0; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.08); border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
          .eh-viewer-x:hover { background: rgba(239,68,68,0.3); }

          @media (max-width: 1024px) { .eh-body { grid-template-columns: 1fr; } .eh-tasklist { max-height: 300px; } .eh-kpi { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 768px) { .eh-kpi { grid-template-columns: 1fr; } .eh-top { flex-direction: column; align-items: flex-start; } .eh-controls { flex-direction: column; align-items: stretch; } .eh-panel-h { flex-direction: column; } .eh-assets-g { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); } }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}
