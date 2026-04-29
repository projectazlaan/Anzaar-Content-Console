"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, onSnapshot, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadRawAssets, markAsShot } from "@/lib/actions";
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
} from "lucide-react";

export default function ShootingPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]); // For bulk selection
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Helper to get displayable image URL from Google Drive
  const getDisplayUrl = (url: string | null, id?: string | null, size = 400) => {
    if (!url && !id) return null;
    if (id) return `/api/image?id=${id}`;
    const match = url?.match(/[-\w]{25,}/);
    if (match) return `/api/image?id=${match[0]}`;
    return url || undefined;
  };

  // Toggle task selection for bulk
  const toggleTaskSelection = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  // Keyboard shortcuts for viewer
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
    const q = query(
      collection(db, "products"), 
      where("status", "==", "Pending Shoot")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid needing a composite index
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
      setError("");
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !selectedFiles || selectedFiles.length === 0) {
      setError("Please select files first.");
      return;
    }

    setIsUploading(true);
    setError("");
    
    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("files", selectedFiles[i]);
      }

      const uploadResult = await uploadRawAssets(selectedTask.id, formData);
      if (!uploadResult.success) throw new Error(uploadResult.error || "Upload failed");

      const markResult = await markAsShot(selectedTask.id);
      if (!markResult.success) throw new Error(markResult.error || "Failed to update status");

      setUploadSuccess(true);
      setSelectedTask(null);
      setSelectedFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      setTimeout(() => setUploadSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTasks.length === 0 || !selectedFiles || selectedFiles.length === 0) {
      setError("Please select products and files first.");
      return;
    }

    setIsUploading(true);
    setError("");
    
    try {
      // Upload files for each selected task
      for (const taskId of selectedTasks) {
        const formData = new FormData();
        for (let i = 0; i < selectedFiles.length; i++) {
          formData.append("files", selectedFiles[i]);
        }

        const uploadResult = await uploadRawAssets(taskId, formData);
        if (!uploadResult.success) throw new Error(`Upload failed for product ${taskId}`);

        const markResult = await markAsShot(taskId);
        if (!markResult.success) throw new Error(`Failed to update status for product ${taskId}`);
      }

      setUploadSuccess(true);
      setSelectedTasks([]);
      setSelectedFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      setTimeout(() => setUploadSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const allowedRoles = ["shooter"];

  return (
    <RoleGuard allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="shooting-page animate-fade">
          <header className="page-header">
            <div className="header-content">
              <h1>Shooting Task Queue</h1>
              <p>Access your assigned shoots and upload raw assets for selection.</p>
            </div>
            {uploadSuccess && (
              <div className="success-toast animate-slide-in">
                <CheckCircle2 size={18} />
                <span>Shoot completed and sent for selection!</span>
              </div>
            )}
          </header>

          <div className="shooting-grid">
            <section className="task-list glass">
              <div className="section-header">
                <div className="title-row">
                  <List size={20} className="text-primary" />
                  <h2>Active Assignments</h2>
                </div>
                <span className="count-badge">{tasks.length}</span>
              </div>
              
              <div className="bulk-actions-bar">
                <button className="select-all-btn" onClick={selectAllTasks}>
                  {selectedTasks.length === tasks.length ? <CheckSquare size={16} /> : <Square size={16} />}
                  <span>{selectedTasks.length === tasks.length ? 'Deselect All' : 'Select All'}</span>
                </button>
                {selectedTasks.length > 0 && (
                  <span className="selected-count">{selectedTasks.length} selected</span>
                )}
              </div>

              {error && !selectedTask && (
                <div className="error-alert-list animate-shake">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="items-scroll">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`task-item ${selectedTask?.id === task.id ? 'active' : ''} ${selectedTasks.includes(task.id) ? 'selected-bulk' : ''}`}
                    onClick={() => {
                      setSelectedTask(task);
                      setSelectedFiles(null);
                      setError("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <div className="task-main">
                      <div className="task-thumb" onClick={(e) => {
                        e.stopPropagation();
                        const imgUrl = getDisplayUrl(task.thumbnailUrl) || getDisplayUrl(task.mainDesignUrl || task.designUrl, (task.mainDesignId || task.designId) as string | undefined);
                        if (imgUrl) setViewingImage(imgUrl);
                      }}>
                        {task.thumbnailUrl || task.mainDesignUrl || task.designUrl ? (
                          <img src={getDisplayUrl(task.thumbnailUrl) || getDisplayUrl(task.mainDesignUrl || task.designUrl, (task.mainDesignId || task.designId) as string | undefined) || ''} alt="" />
                        ) : (
                          <Camera size={16} />
                        )}
                      </div>
                      <div className="task-info">
                        <h3>{task.name}</h3>
                        <p><Clock size={14} /> {task.updatedAt?.toDate ? task.updatedAt.toDate().toLocaleDateString() : 'Just now'}</p>
                        {task.variationCount && task.variationCount > 1 && (
                          <p className="variation-hint">{task.variationCount} variations</p>
                        )}
                      </div>
                    </div>

                    <div className="task-actions-right">
                      <div className="task-checkbox" onClick={(e) => toggleTaskSelection(task.id, e)}>
                        {selectedTasks.includes(task.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="empty-state-list">
                    <CheckCircle2 size={48} className="text-muted" />
                    <p>All caught up! No pending shoots.</p>
                  </div>
                )}
              </div>
            </section>

            <aside className="upload-panel glass">
              {selectedTasks.length > 0 ? (
                <div className="upload-content animate-fade">
                  <div className="upload-header">
                    <div className="header-main">
                      <h2>Bulk Upload</h2>
                      <p><span className="text-primary">{selectedTasks.length} Products</span> Selected</p>
                    </div>
                    <button className="close-btn" onClick={() => setSelectedTasks([])}>
                      <X size={20} />
                    </button>
                  </div>

                  <div className="bulk-info-box">
                    <div className="bulk-info-title">
                      <Layers size={16} />
                      <strong>Selected Products</strong>
                    </div>
                    <div className="selected-products-list">
                      {tasks.filter(t => selectedTasks.includes(t.id)).map(task => (
                        <div key={task.id} className="selected-product-item">
                          <CheckSquare size={14} />
                          <span>{task.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleBulkUpload} className="upload-form">
                    <div 
                      className={`file-drop-zone ${selectedFiles ? 'has-files' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        id="bulkRawFiles" 
                        multiple 
                        required 
                        hidden 
                        onChange={handleFileChange} 
                      />
                      
                      {selectedFiles ? (
                        <div className="files-selected animate-scale">
                          <Files size={40} className="text-primary" />
                          <p>{selectedFiles.length} files selected</p>
                          <span className="file-names">
                            {Array.from(selectedFiles).slice(0, 3).map(f => f.name).join(", ")}
                            {selectedFiles.length > 3 && ` and ${selectedFiles.length - 3} more...`}
                          </span>
                          <button 
                            type="button" 
                            className="change-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                          >
                            Change Selection
                          </button>
                        </div>
                      ) : (
                        <div className="upload-prompt">
                          <Upload size={40} />
                          <p>Click to select raw assets for ALL selected products</p>
                          <span>Same files will be uploaded to all {selectedTasks.length} products</span>
                        </div>
                      )}
                    </div>

                    {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}

                    <button 
                      type="submit" 
                      className="submit-btn bg-gradient"
                      disabled={isUploading || !selectedFiles}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="spinner" size={20} />
                          <span>Uploading to {selectedTasks.length} products...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} />
                          <span>Complete Shoot & Submit ({selectedTasks.length})</span>
                        </>
                      )}
                    </button>
                    <p className="form-hint">This will move all selected products to the Selection stage.</p>
                  </form>
                </div>
              ) : selectedTask ? (
                <div className="upload-content animate-fade">
                  <div className="upload-header">
                    <div className="header-main">
                      <h2>Upload Raw Assets</h2>
                      <p>Product: <span className="text-primary">{selectedTask.name}</span></p>
                    </div>
                    <button className="close-btn" onClick={() => setSelectedTask(null)}>
                      <X size={20} />
                    </button>
                  </div>

                  <div className="directions-box">
                    <div className="dir-title">
                      <FileCode size={16} />
                      <strong>Director's Instructions</strong>
                    </div>
                    <p>{selectedTask.directions?.shoot || "No specific instructions provided."}</p>
                  </div>

                  <form onSubmit={handleFileUpload} className="upload-form">
                    <div 
                      className={`file-drop-zone ${selectedFiles ? 'has-files' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        id="rawFiles" 
                        multiple 
                        required 
                        hidden 
                        onChange={handleFileChange} 
                      />
                      
                      {selectedFiles ? (
                        <div className="files-selected animate-scale">
                          <Files size={40} className="text-primary" />
                          <p>{selectedFiles.length} files selected</p>
                          <span className="file-names">
                            {Array.from(selectedFiles).slice(0, 3).map(f => f.name).join(", ")}
                            {selectedFiles.length > 3 && ` and ${selectedFiles.length - 3} more...`}
                          </span>
                          <button 
                            type="button" 
                            className="change-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                          >
                            Change Selection
                          </button>
                        </div>
                      ) : (
                        <div className="upload-prompt">
                          <Upload size={40} />
                          <p>Click to select raw assets</p>
                          <span>RAW, JPG, MP4 supported (Multiple)</span>
                        </div>
                      )}
                    </div>

                    {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}

                    <button 
                      type="submit" 
                      className="submit-btn bg-gradient"
                      disabled={isUploading || !selectedFiles}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="spinner" size={20} />
                          <span>Uploading & Finalizing...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} />
                          <span>Complete Shoot & Submit</span>
                        </>
                      )}
                    </button>
                    <p className="form-hint">This will move the product to the Selection stage.</p>
                  </form>
                </div>
              ) : (
                <div className="panel-empty">
                  <div className="empty-icon-wrapper">
                    <Camera size={64} />
                    <div className="pulse"></div>
                  </div>
                  <h3>Waiting for Selection</h3>
                  <p>Select a task from the active queue to start uploading assets and complete your assignment.</p>
                </div>
              )}
            </aside>
          </div>
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
        .shooting-page { padding: 2rem; max-width: 1600px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
        .success-toast { display: flex; align-items: center; gap: 0.8rem; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 0.8rem 1.2rem; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2); font-weight: 600; }
        .shooting-grid { display: grid; grid-template-columns: 450px 1fr; gap: 2rem; height: 750px; }
        .task-list { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
        .section-header { padding: 1.5rem 2rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .title-row { display: flex; align-items: center; gap: 1rem; }
        .header-actions { display: flex; align-items: center; gap: 1rem; }
        .bulk-toggle-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem; border-radius: 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid transparent; transition: all 0.3s; }
        .bulk-toggle-btn:hover { background: rgba(255, 255, 255, 0.05); border-color: var(--border); }
        .bulk-toggle-btn.active { background: rgba(99, 102, 241, 0.05); border-color: var(--primary); }
        .bulk-toggle-btn.active:hover { background: rgba(99, 102, 241, 0.1); }
        .bulk-toggle-btn span { font-size: 0.8rem; }
        .count-badge { background: var(--bg-hover); padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; color: var(--primary); }
        .items-scroll { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.8rem; }
        .task-item { padding: 1.2rem; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; background: rgba(255, 255, 255, 0.02); }
        .task-item:hover { background: rgba(255, 255, 255, 0.05); transform: translateX(5px); border-color: var(--border); }
        .task-item.active { background: var(--bg-hover); border-color: var(--primary); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
        .task-item.selected-bulk { background: rgba(99, 102, 241, 0.08); border-color: var(--primary); }
        .task-checkbox { color: rgba(255, 255, 255, 0.15); transition: 0.2s; margin-right: 0.5rem; }
        .task-checkbox:hover { color: var(--primary); transform: scale(1.1); }
        .task-checkbox .text-primary { color: var(--primary); }
        .bulk-actions-bar { padding: 0.8rem 2rem; background: rgba(99, 102, 241, 0.05); border-bottom: 1px solid rgba(99, 102, 241, 0.1); display: flex; align-items: center; gap: 1rem; }
        .select-all-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: 10px; color: var(--text-main); font-weight: 600; font-size: 0.85rem; transition: all 0.3s; }
        .select-all-btn:hover { background: rgba(255, 255, 255, 0.05); border-color: var(--primary); }
        .selected-count { color: var(--primary); font-weight: 700; font-size: 0.85rem; margin-left: auto; }
        .bulk-info-box { padding: 1.5rem; background: rgba(99, 102, 241, 0.05); border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.1); margin-bottom: 2rem; }
        .bulk-info-title { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1rem; color: var(--primary); }
        .bulk-info-title strong { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .selected-products-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto; }
        .selected-product-item { display: flex; align-items: center; gap: 0.8rem; padding: 0.6rem; background: rgba(255, 255, 255, 0.03); border-radius: 8px; font-size: 0.9rem; }
        .selected-product-item .text-primary { color: var(--primary); }
        .task-main { display: flex; align-items: center; gap: 1.2rem; flex: 1; }
        .task-thumb { width: 50px; height: 50px; border-radius: 12px; background: linear-gradient(135deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(225deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(315deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, #1e293b 25%, transparent 25%); background-size: 14px 14px; background-color: #0f172a; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .task-thumb img { width: 100%; height: 100%; object-fit: contain; }
        .task-info h3 { font-size: 1.05rem; margin-bottom: 0.2rem; }
        .task-info p { display: flex; align-items: center; gap: 0.4rem; color: var(--text-dim); font-size: 0.8rem; }
        .task-info .variation-hint { color: var(--primary); font-weight: 600; margin-top: 0.2rem; }
        .task-actions-right { display: flex; align-items: center; gap: 0.8rem; }
        .arrow { color: var(--text-dim); opacity: 0.5; transition: transform 0.3s; }
        .task-item.active .arrow { transform: translateX(5px); color: var(--primary); opacity: 1; }
        .upload-panel { padding: 3rem; display: flex; flex-direction: column; }
        .upload-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .header-main h2 { font-size: 2.2rem; margin-bottom: 0.5rem; }
        .close-btn { padding: 0.5rem; border-radius: 50%; color: var(--text-dim); transition: all 0.2s; }
        .close-btn:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .directions-box { padding: 1.5rem; background: rgba(99, 102, 241, 0.05); border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.1); margin-bottom: 2.5rem; }
        .dir-title { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.8rem; color: var(--primary); }
        .dir-title strong { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .directions-box p { line-height: 1.6; color: var(--text-main); }
        .file-drop-zone { border: 2px dashed var(--border); border-radius: 20px; padding: 3rem; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(255, 255, 255, 0.02); margin-bottom: 1.5rem; }
        .file-drop-zone:hover { border-color: var(--primary); background: rgba(99, 102, 241, 0.03); }
        .file-drop-zone.has-files { border-style: solid; border-color: var(--primary); background: rgba(99, 102, 241, 0.05); }
        .upload-prompt { display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--text-dim); }
        .upload-prompt p { font-size: 1.2rem; font-weight: 600; color: var(--text-main); }
        .files-selected { display: flex; flex-direction: column; align-items: center; gap: 0.8rem; }
        .files-selected p { font-size: 1.3rem; font-weight: 700; color: var(--text-main); }
        .file-names { font-size: 0.85rem; color: var(--text-dim); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .change-link { margin-top: 1rem; color: var(--primary); font-weight: 600; font-size: 0.9rem; text-decoration: underline; }
        .submit-btn { width: 100%; padding: 1.3rem; border-radius: 14px; color: white; font-weight: 800; font-size: 1.1rem; display: flex; justify-content: center; align-items: center; gap: 1rem; box-shadow: 0 10px 20px var(--primary-glow); transition: all 0.3s; }
        .submit-btn:disabled { opacity: 0.5; filter: grayscale(1); transform: none; box-shadow: none; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 30px var(--primary-glow); }
        .form-hint { text-align: center; margin-top: 1rem; color: var(--text-dim); font-size: 0.85rem; }
        .panel-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 2rem; padding: 4rem; }
        .empty-icon-wrapper { position: relative; }
        .pulse { position: absolute; inset: -20px; background: var(--primary); border-radius: 50%; filter: blur(40px); opacity: 0.1; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { transform: scale(0.9); opacity: 0.1; } 50% { transform: scale(1.1); opacity: 0.2; } 100% { transform: scale(0.9); opacity: 0.1; } }
        .panel-empty h3 { font-size: 1.8rem; }
        .panel-empty p { color: var(--text-dim); font-size: 1.1rem; max-width: 400px; line-height: 1.6; }
        .error-msg { margin-top: 1rem; color: #ef4444; font-size: 0.95rem; display: flex; align-items: center; gap: 0.6rem; padding: 1rem; background: rgba(239, 68, 68, 0.05); border-radius: 10px; }
        .error-alert-list { margin: 1rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); color: #f87171; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 0.9rem; display: flex; align-items: center; gap: 0.8rem; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .empty-state-list { padding: 4rem 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
        .empty-state-list p { font-size: 1.1rem; color: var(--text-dim); font-weight: 500; }
        @media (max-width: 1200px) { .shooting-grid { grid-template-columns: 1fr; height: auto; } .task-list { height: 500px; } }
        @media (max-width: 768px) { .shooting-page { padding: 1rem; padding-top: 90px; } .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; } .shooting-grid { gap: 1.5rem; } .upload-panel { padding: 2rem 1.5rem; } .file-drop-zone { padding: 2rem; } }
        
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
