"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, MutableRefObject } from "react";
import ImageViewer from "./ImageViewer";

interface SelectionConfig {
  selectedRatiosRef: MutableRefObject<Map<string, any>>;
  onSelect: (url: string, ratio: 'three-quarter' | 'half' | 'full') => void;
}

interface ImageViewerContextType {
  openViewer: (product: any, initialIndex?: number) => void;
  openSelectionViewer: (product: any, initialIndex: number, config: SelectionConfig) => void;
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
  const [selectionConfig, setSelectionConfig] = useState<SelectionConfig | null>(null);

  const openViewer = useCallback((p: any, index = 0) => {
    setProduct(p);
    setInitialIndex(index);
    setSelectionConfig(null);
    setIsOpen(true);
  }, []);

  const openSelectionViewer = useCallback((p: any, index: number, config: SelectionConfig) => {
    setProduct(p);
    setInitialIndex(index);
    setSelectionConfig(config);
    setIsOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsOpen(false);
    setSelectionConfig(null);
  }, []);

  return (
    <ImageViewerContext.Provider value={{ openViewer, openSelectionViewer, closeViewer }}>
      {children}
      <ImageViewer isOpen={isOpen} onClose={closeViewer} product={product} initialIndex={initialIndex} selectionConfig={selectionConfig} />
    </ImageViewerContext.Provider>
  );
}
