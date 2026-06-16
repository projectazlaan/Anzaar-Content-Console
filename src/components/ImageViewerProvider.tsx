"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import ImageViewer from "./ImageViewer";

interface ImageViewerContextType {
  openViewer: (product: any, initialIndex?: number) => void;
  closeViewer: () => void;
}

const ImageViewerContext = createContext<ImageViewerContextType | null>(null);

export function useImageViewer(): ImageViewerContextType {
  const ctx = useContext(ImageViewerContext);
  if (!ctx) throw new Error("useImageViewer must be used within ImageViewerProvider");
  return ctx;
}

export default function ImageViewerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [initialIndex, setInitialIndex] = useState(0);

  const openViewer = useCallback((p: any, index = 0) => {
    setProduct(p);
    setInitialIndex(index);
    setIsOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ImageViewerContext.Provider value={{ openViewer, closeViewer }}>
      {children}
      <ImageViewer isOpen={isOpen} onClose={closeViewer} product={product} initialIndex={initialIndex} />
    </ImageViewerContext.Provider>
  );
}
