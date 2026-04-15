"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadRawAssets } from "@/lib/actions";
import { 
  Camera, 
  List, 
  Upload, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ImageIcon,
  Loader2,
  AlertCircle
} from "lucide-react";

export default function ShootingPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "products"), where("status", "==", "Pending Shoot"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const files = (document.getElementById('rawFiles') as HTMLInputElement).files;
    if (!selectedTask || !files || files.length === 0) return;

    setIsUploading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("productId", selectedTask.id);
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    const result = await uploadRawAssets(formData);
    
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
    <RoleGuard allowedRoles={["shooter"]}>
      <DashboardLayout>
        <div className="shooting-page animate-fade">
          <header className="page-header">
            <h1>Shooting Task Queue</h1>
            <p>Access your assigned shoots and upload raw assets for selection.</p>
          </header>

          <div className="shooting-grid">
            <section className="task-list glass">
              <div className="section-header">
                <List size={20} />
                <h2>Active Assignments</h2>
              </div>
              <div className="items-scroll">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`task-item ${selectedTask?.id === task.id ? 'active' : ''}`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="task-info">
                      <h3>{task.name}</h3>
                      <p><Clock size={14} /> Assigned {task.updatedAt?.toDate ? task.updatedAt.toDate().toLocaleDateString() : 'Just now'}</p>
                    </div>
                    <ChevronRight size={18} />
                  </div>
                ))}
                {tasks.length === 0 && <div className="empty-state">No active shoots assigned.</div>}
              </div>
            </section>

            <aside className="upload-panel glass">
              {selectedTask ? (
                <div className="upload-content animate-fade">
                  <div className="task-header">
                    <h2>Upload Raw Assets</h2>
                    <p>Product: {selectedTask.name}</p>
                    <div className="directions-box">
                      <strong>Director's Instructions:</strong>
                      <p>{selectedTask.directions?.shoot || "No specific instructions provided."}</p>
                    </div>
                  </div>

                  <form onSubmit={handleFileUpload} className="upload-form">
                    <div className="file-input-wrapper">
                      <input type="file" id="rawFiles" multiple required hidden onChange={() => setError("")} />
                      <label htmlFor="rawFiles" className="file-label">
                        <Upload size={32} />
                        <span>Select Multiple Files</span>
                        <small>RAW, JPG, MP4 supported</small>
                      </label>
                    </div>

                    {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}

                    <button 
                      type="submit" 
                      className="submit-btn bg-gradient"
                      disabled={isUploading || uploadSuccess}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="spinner" size={20} />
                          <span>Uploading to Google Drive...</span>
                        </>
                      ) : uploadSuccess ? (
                        <>
                          <CheckCircle2 size={20} />
                          <span>Upload Complete!</span>
                        </>
                      ) : (
                        <span>Start Asset Upload</span>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="panel-empty">
                  <Camera size={64} />
                  <p>Select a task from the queue to start uploading assets.</p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </DashboardLayout>

      <style jsx>{`
        .shooting-page { padding: 2rem; }
        .shooting-grid {
          display: grid;
          grid-template-columns: 1fr 500px;
          gap: 2rem;
          margin-top: 2rem;
        }

        .task-list { padding: 0; overflow: hidden; display: flex; flex-direction: column; height: 600px; }
        .section-header { padding: 1.5rem 2rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 1rem; }
        .items-scroll { flex: 1; overflow-y: auto; }

        .task-item {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s;
        }

        .task-item:hover { background: rgba(255, 255, 255, 0.02); }
        .task-item.active { background: var(--bg-hover); border-left: 4px solid var(--primary); }

        .task-info h3 { margin-bottom: 0.4rem; }
        .task-info p { display: flex; align-items: center; gap: 0.5rem; color: var(--text-dim); font-size: 0.85rem; }

        .upload-panel { padding: 3rem; }
        .task-header h2 { font-size: 2rem; margin-bottom: 0.5rem; }
        .directions-box { margin-top: 1.5rem; padding: 1.2rem; background: rgba(255, 255, 255, 0.03); border-radius: 12px; border: 1px solid var(--border); }
        .directions-box strong { font-size: 0.8rem; color: var(--primary); text-transform: uppercase; display: block; margin-bottom: 0.5rem; }

        .file-input-wrapper { margin-top: 2rem; }
        .file-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem;
          border: 2px dashed var(--border);
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .file-label:hover { border-color: var(--primary); background: rgba(99, 102, 241, 0.02); }

        .submit-btn {
          width: 100%;
          padding: 1.2rem;
          margin-top: 2rem;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
        }

        .error-msg { margin-top: 1rem; color: #ef4444; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </RoleGuard>
  );
}
