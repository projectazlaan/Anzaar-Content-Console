"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadEditedAsset } from "@/lib/actions";
import { 
  PenTool, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Upload,
  Loader2,
  AlertCircle,
  FileText
} from "lucide-react";

export default function EditingPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "products"), where("status", "==", "Pending Edit"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

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
        <div className="editing-page animate-fade">
          <header className="page-header">
            <h1>Editing Studio</h1>
            <p>Finalize assets and deliver polished content for review.</p>
          </header>

          <div className="editing-grid">
            <section className="task-list glass">
              <div className="section-header">
                <Layers size={20} />
                <h2>Editing Queue</h2>
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
                {tasks.length === 0 && <div className="empty-state">No pending edits at this moment.</div>}
              </div>
            </section>

            <aside className="editor-panel glass">
              {selectedTask ? (
                <div className="editor-content animate-fade">
                  <div className="task-header">
                    <h2>Deliver Final Edit</h2>
                    <p>Production: {selectedTask.name}</p>
                  </div>

                  <div className="instruction-card">
                    <div className="ins-row">
                      <FileText size={18} />
                      <strong>Editing Instructions</strong>
                    </div>
                    <p>{selectedTask.directions?.edit || "No specific edit instructions."}</p>
                  </div>

                  <div className="raw-links">
                    <strong>Raw Assets Archive</strong>
                    <div className="links-grid">
                      {selectedTask.rawUrls?.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" className="link-pill glass">
                          Select {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleFileUpload} className="delivery-form">
                    <div className="file-box">
                      <input type="file" id="finalEdit" required hidden onChange={() => setError("")} />
                      <label htmlFor="finalEdit" className="file-label-v2">
                        <Upload size={24} />
                        <span>Upload Final Export</span>
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
                          <span>Delivering to Drive...</span>
                        </>
                      ) : uploadSuccess ? (
                        <>
                          <CheckCircle2 size={20} />
                          <span>Delivered Successfully</span>
                        </>
                      ) : (
                        <span>Finalize & Submit Review</span>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="panel-empty">
                  <PenTool size={64} />
                  <p>Pick an assignment from the queue to start editing.</p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </DashboardLayout>

      <style jsx>{`
        .editing-page { padding: 2rem; }
        .editing-grid {
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

        .editor-panel { padding: 3rem; }
        .task-header h2 { font-size: 2rem; margin-bottom: 0.5rem; }
        
        .instruction-card { margin-top: 2rem; padding: 1.5rem; background: rgba(99, 102, 241, 0.05); border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.1); }
        .ins-row { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.8rem; color: var(--primary); }
        .instruction-card p { line-height: 1.6; }

        .raw-links { margin-top: 2rem; }
        .raw-links strong { display: block; margin-bottom: 1rem; font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase; }
        .links-grid { display: flex; flex-wrap: wrap; gap: 0.8rem; }
        .link-pill { padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.9rem; text-decoration: none; color: white; display: block; }

        .delivery-form { margin-top: 2.5rem; }
        .file-label-v2 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .file-label-v2:hover { background: var(--bg-hover); border-color: var(--primary); }

        .submit-btn {
          width: 100%;
          padding: 1.2rem;
          margin-top: 1.5rem;
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

        @media (max-width: 1200px) {
          .editing-grid {
            grid-template-columns: 1fr;
          }
          .task-list {
            height: 500px;
          }
        }

        @media (max-width: 768px) {
          .editing-page {
            padding: 1rem;
            padding-top: 90px;
          }
          .page-header {
            margin-bottom: 1.5rem;
          }
          .page-header h1 {
            font-size: 1.8rem;
          }
          .editing-grid {
            gap: 1.5rem;
          }
          .task-list {
            height: 400px;
          }
          .editor-panel {
            padding: 2rem 1.5rem;
          }
          .file-label-v2 {
            padding: 1.2rem;
          }
        }
      `}</style>
    </RoleGuard>
  );
}
