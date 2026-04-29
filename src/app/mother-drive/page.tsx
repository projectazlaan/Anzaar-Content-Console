"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Database, 
  Search, 
  Download, 
  Eye, 
  Calendar,
  Info,
  ChevronRight,
  X
} from "lucide-react";

export default function MotherDrivePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [archiveData, setArchiveData] = useState<any[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Helper to get displayable image URL from Google Drive
  const getDisplayUrl = (url: string | null, id?: string | null, size = 400) => {
    if (!url && !id) return null;
    if (id) return `/api/image?id=${id}`;
    const match = url?.match(/[-\w]{25,}/);
    if (match) return `/api/image?id=${match[0]}`;
    return url || undefined;
  };

  // Real-time listener for all products (Archive)
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setArchiveData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Keyboard shortcuts for viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewingImage) return;
      if (e.key === "Escape") setViewingImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingImage]);

  const filteredData = archiveData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={["mother_drive"]}>
      <DashboardLayout>
        <div className="mother-drive-page animate-fade">
          <header className="page-header">
            <div>
              <h1>Mother Drive</h1>
              <p>Master archive of all production assets and historical data.</p>
            </div>
            <div className="action-row">
              <button className="btn-export glass">
                <Download size={18} />
                <span>Export History</span>
              </button>
            </div>
          </header>

          <section className="search-filter-section glass">
            <div className="search-box">
              <Search size={22} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search by product name, category, or status..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </section>

          <div className="drive-grid">
            <div className="table-container glass">
              <table className="archive-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Last Update</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr 
                      key={item.id} 
                      className={selectedItem?.id === item.id ? 'active' : ''}
                      onClick={() => setSelectedItem(item)}
                    >
                      <td>
                        <div className="item-name">
                          <div className="icon-box">
                            <Database size={16} />
                          </div>
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td><span className="chip category">{item.category}</span></td>
                      <td><span className={`chip status ${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span></td>
                      <td><div className="date-cell"><Calendar size={14} />{item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleDateString() : 'Just now'}</div></td>
                      <td><ChevronRight size={18} className="row-arrow" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredData.length === 0 && <div className="empty-state-list">No archive entries found.</div>}
            </div>

            <aside className="details-panel">
              {selectedItem ? (
                <div className="details-card glass animate-fade">
                  <div className="card-header">
                    <h3>Production Details</h3>
                    <button className="close-btn" onClick={() => setSelectedItem(null)}>×</button>
                  </div>
                  
                  <div className="detail-hero">
                    <div className="image-placeholder" onClick={() => {
                      const imgUrl = getDisplayUrl(selectedItem.designUrl, selectedItem.designId);
                      if (imgUrl) setViewingImage(imgUrl);
                    }}>
                      {selectedItem.designUrl ? (
                        <img src={getDisplayUrl(selectedItem.designUrl, selectedItem.designId) || ''} alt="" className="preview-img" />
                      ) : (
                        <Database size={48} />
                      )}
                    </div>
                    <h2>{selectedItem.name}</h2>
                    <p>Status: {selectedItem.status}</p>
                  </div>

                  <div className="asset-links">
                    {selectedItem.designUrl && (
                      <a href={selectedItem.designUrl} target="_blank" className="link-item glass">
                        <Eye size={16} />
                        <span>View Design</span>
                      </a>
                    )}
                    {selectedItem.rawUrls?.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" className="link-item glass">
                        <Eye size={16} />
                        <span>View Raw {i+1}</span>
                      </a>
                    ))}
                    {selectedItem.editedUrl && (
                      <a href={selectedItem.editedUrl} target="_blank" className="link-item glass">
                        <Eye size={16} />
                        <span>View Final Edit</span>
                      </a>
                    )}
                  </div>

                  <div className="directions-summary">
                    <h4>Instructions History</h4>
                    <div className="dir-item">
                      <strong>Shoot:</strong>
                      <p>{selectedItem.directions?.shoot || "N/A"}</p>
                    </div>
                    <div className="dir-item">
                      <strong>Edit:</strong>
                      <p>{selectedItem.directions?.edit || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="info-placeholder glass">
                  <Info size={48} />
                  <p>Select an item from the archive to view its deep history and assets.</p>
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
        .mother-drive-page {
          padding: 2rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
        }

        .page-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .btn-export {
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .search-filter-section {
          padding: 1.5rem;
          display: flex;
          gap: 2rem;
          margin-bottom: 2.5rem;
          align-items: center;
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 1.2rem;
          background: rgba(255, 255, 255, 0.03);
          padding: 0.6rem 1.5rem;
          border-radius: 50px;
          border: 1px solid var(--border);
        }

        .search-box input {
          background: none;
          border: none;
          color: var(--text-main);
          width: 100%;
          outline: none;
          font-size: 1.1rem;
        }

        .search-icon {
          color: var(--primary);
        }

        .drive-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
          align-items: start;
        }

        @media (max-width: 1200px) {
          .drive-grid {
            grid-template-columns: 1fr;
          }
          .details-panel {
            position: sticky;
            top: 90px;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .action-row {
            width: 100%;
          }
          .btn-export {
            width: 100%;
            justify-content: center;
          }
          .search-filter-section {
            padding: 1rem;
          }
          .archive-table {
            font-size: 0.85rem;
          }
          .archive-table th,
          .archive-table td {
            padding: 0.8rem;
          }
          .icon-box {
            display: none;
          }
        }

        .table-container {
          overflow: hidden;
          padding: 0;
        }

        .archive-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .archive-table th {
          padding: 1.5rem;
          font-size: 0.85rem;
          text-transform: uppercase;
          color: var(--text-dim);
          border-bottom: 1px solid var(--border);
        }

        .archive-table td {
          padding: 1.2rem 1.5rem;
          border-bottom: 1px solid var(--border);
          transition: all 0.2s ease;
        }

        .archive-table tr.active td {
          background: var(--bg-hover);
        }

        .item-name {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-weight: 600;
        }

        .icon-box {
          width: 32px;
          height: 32px;
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chip {
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .chip.category { background: rgba(168, 85, 247, 0.1); color: var(--secondary); }
        .chip.status.published { background: rgba(16, 185, 129, 0.1); color: var(--accent); }
        .chip.status.pending-direction { background: rgba(255, 171, 0, 0.1); color: #ffab00; }
        .chip.status.pending-shoot { background: rgba(0, 184, 217, 0.1); color: #00b8d9; }
        .chip.status.pending-selection { background: rgba(101, 84, 192, 0.1); color: #6554c0; }
        .chip.status.pending-review { background: rgba(54, 179, 126, 0.1); color: #36b37e; }

        .date-cell {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          color: var(--text-muted);
        }

        .row-arrow {
          color: var(--text-dim);
          opacity: 0;
          transition: all 0.3s ease;
        }

        .archive-table tr:hover .row-arrow {
          opacity: 1;
          transform: translateX(5px);
        }

        .details-card {
          padding: 2rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .close-btn {
          font-size: 2rem;
          color: var(--text-dim);
        }

        .detail-hero {
          text-align: center;
          margin-bottom: 2.5rem;
        }

                .preview-img {
          width: 100%;
          height: 200px;
          object-fit: contain;
          border-radius: 15px;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(225deg, #1e293b 25%, transparent 25%) -50px 0, linear-gradient(315deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, #1e293b 25%, transparent 25%);
          background-size: 20px 20px;
          background-color: #0f172a;
        }

        .asset-links {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.8rem;
          margin-bottom: 2rem;
        }

        .link-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.8rem 1.2rem;
          border-radius: 12px;
          font-size: 0.95rem;
          text-decoration: none;
          color: var(--text-main);
        }

        .link-item:hover {
          background: var(--bg-hover);
        }

        .directions-summary {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border);
        }

        .dir-item strong {
          display: block;
          font-size: 0.8rem;
          color: var(--text-dim);
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        .dir-item p {
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .info-placeholder {
          height: 500px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          text-align: center;
          color: var(--text-dim);
          padding: 3rem;
        }

        .empty-state-list {
          padding: 3rem;
          text-align: center;
          color: var(--text-dim);
        }

        @media (max-width: 1200px) {
          .drive-grid {
            grid-template-columns: 1fr;
          }
          .details-panel {
            position: sticky;
            top: 90px;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .action-row {
            width: 100%;
          }
          .btn-export {
            width: 100%;
            justify-content: center;
          }
          .search-filter-section {
            padding: 1rem;
          }
          .archive-table {
            font-size: 0.85rem;
          }
          .archive-table th,
          .archive-table td {
            padding: 0.8rem;
          }
          .icon-box {
            display: none;
          }
        }
        
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
