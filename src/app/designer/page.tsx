"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { createProduct } from "@/lib/actions";
import { Upload, CheckCircle2, Loader2, Image as ImageIcon, AlertCircle } from "lucide-react";

export default function DesignerPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !selectedFile) return;

    setIsUploading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("name", productName);
    formData.append("category", category);
    formData.append("file", selectedFile);

    const result = await createProduct(formData);
    
    setIsUploading(false);
    if (result.success) {
      setIsSuccess(true);
      setProductName("");
      setCategory("");
      setSelectedFile(null);
      setTimeout(() => setIsSuccess(false), 5000);
    } else {
      setError(result.error || "Failed to add product");
    }
  };

  return (
    <RoleGuard allowedRoles={["designer"]}>
      <DashboardLayout>
        <div className="designer-page animate-fade">
          <header className="page-header">
            <h1>Product Design Portal</h1>
            <p>Upload new designs to start the production pipeline.</p>
          </header>

          <div className="designer-container glass">
            <form onSubmit={handleSubmit} className="design-form">
              <div className="form-group">
                <label>Product Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Summer Silk Kurta v1" 
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="apparel">Apparel</option>
                  <option value="footwear">Footwear</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>

              {error && (
                <div className="error-alert glass">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="file-drop-zone" onClick={() => document.getElementById('fileInput')?.click()}>
                <input 
                  type="file" 
                  id="fileInput" 
                  hidden 
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="selected-file-info animate-scale">
                    <ImageIcon size={48} className="text-primary" />
                    <p>{selectedFile.name}</p>
                    <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <div className="upload-prompt">
                    <Upload size={48} />
                    <p>Click or drag product design to upload</p>
                    <span>Supports high-res JPG, PNG (Max 50MB)</span>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="submit-btn bg-gradient"
                disabled={isUploading || isSuccess}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="spinner" size={20} />
                    <span>Uploading to Drive...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 size={20} />
                    <span>Design Uploaded Successfully</span>
                  </>
                ) : (
                  <span>Initialize Production</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </DashboardLayout>

      <style jsx>{`
        .designer-page {
          padding: 2rem;
        }

        .designer-container {
          max-width: 800px;
          margin-top: 2rem;
          padding: 3rem;
        }

        .design-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .form-group label {
          font-weight: 700;
          color: var(--text-muted);
          font-size: 0.9rem;
          text-transform: uppercase;
        }

        .form-group input, .form-group select {
          padding: 1rem 1.2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: white;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .form-group input:focus {
          border-color: var(--primary);
          outline: none;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .file-drop-zone {
          height: 300px;
          border: 2px dashed var(--border);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.02);
        }

        .file-drop-zone:hover {
          border-color: var(--primary);
          background: rgba(99, 102, 241, 0.02);
        }

        .upload-prompt {
          color: var(--text-dim);
        }

        .upload-prompt p {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem;
          color: var(--text-main);
        }

        .submit-btn {
          padding: 1.2rem;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem;
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border-radius: 12px;
          border: 1px solid rgba(239, 68, 68, 0.1);
        }

        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </RoleGuard>
  );
}
