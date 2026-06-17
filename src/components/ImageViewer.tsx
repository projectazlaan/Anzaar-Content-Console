"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Download, Info,
  ImageOff, Play, Pause, Keyboard, ExternalLink, Loader2,
  RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Sun, Contrast, Droplets, Grid3X3, Crosshair,
  Pipette, Layers, Monitor,
  Copy, Check, ChevronDown,
} from "lucide-react";
import { getDisplayUrl } from "@/lib/utils";

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  initialIndex?: number;
}

const SWIPE_THRESHOLD = 60;

type GridMode = "off" | "thirds" | "cross" | "golden";
type FitMode = "fit" | "fill" | "original";

export default function ImageViewer({ isOpen, onClose, product, initialIndex = 0 }: ImageViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [gridMode, setGridMode] = useState<GridMode>("off");
  const [fitMode, setFitMode] = useState<FitMode>("fit");
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [showAdjust, setShowAdjust] = useState(false);
  const [colorPicker, setColorPicker] = useState(false);
  const [pickedColor, setPickedColor] = useState("#ffffff");
  const [pickedPos, setPickedPos] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const [lensActive, setLensActive] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [showLens, setShowLens] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [minimapPos, setMinimapPos] = useState({ x: 0, y: 0 });
  const [showShare, setShowShare] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const slideshowRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const variations = useMemo(() => {
    if (!product) return [];
    if (product.variations && product.variations.length > 0) return product.variations;
    if (product.rawUrls && product.rawUrls.length > 0) {
      return product.rawUrls.map((url: string, i: number) => ({ url, id: product.rawIds?.[i] }));
    }
    const singleUrl = product.mainDesignUrl || product.designUrl || product.url || product.thumbnailUrl;
    const singleId = product.mainDesignId || product.designId || product.id;
    if (typeof product === 'string') return [{ url: product }];
    if (singleUrl) return [{ url: singleUrl, id: singleId }];
    return [];
  }, [product]);

  const totalItems = variations.length;
  const currentItem = variations[activeIndex];
  const currentSrc = useMemo(() => getDisplayUrl(currentItem?.url, currentItem?.id, 2000) || '', [currentItem]);
  const currentThumb = useMemo(() => getDisplayUrl(currentItem?.url, currentItem?.id, 80) || '', [currentItem]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [imageSize, setImageSize] = useState({ w: 100, h: 100 });

  useEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  const naturalZoom = useMemo(() => {
    if (fitMode === "original") return 1;
    const scaleX = (containerSize.w - 80) / imageSize.w;
    const scaleY = (containerSize.h - 80) / imageSize.h;
    const baseFit = Math.min(scaleX, scaleY, 1);
    if (fitMode === "fill") return Math.max(scaleX, scaleY);
    return baseFit;
  }, [fitMode, containerSize, imageSize]);

  const displayZoom = fitMode === "fit" || fitMode === "fill" ? zoom * naturalZoom : zoom;

  // ── Reset on open ──
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(initialIndex);
      setZoom(1);
      setFitMode("fit");
      setImgError(false);
      setImgLoading(true);
      setDragPos({ x: 0, y: 0 });
      setSwipeX(0);
      setShowInfo(false);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setGridMode("off");
      setColorPicker(false);
      setShowAdjust(false);
      setShowCompare(false);
      setShowMinimap(false);
    }
  }, [isOpen, initialIndex]);

  // ── Slideshow ──
  useEffect(() => {
    if (slideshowActive && totalItems > 1) {
      slideshowRef.current = setInterval(() => {
        setActiveIndex(prev => { const next = (prev + 1) % totalItems; resetZoom(); return next; });
      }, 3000);
    }
    return () => { if (slideshowRef.current) clearInterval(slideshowRef.current); };
  }, [slideshowActive, totalItems]);

  // ── Fullscreen ──
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  useEffect(() => {
    const fn = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const resetZoom = () => {
    setZoom(1);
    setFitMode("fit");
    setImgError(false);
    setImgLoading(true);
    setDragPos({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  const goTo = useCallback((i: number) => {
    if (slideshowActive) setSlideshowActive(false);
    setActiveIndex(Math.max(0, Math.min(i, totalItems - 1)));
    resetZoom();
  }, [slideshowActive, totalItems]);

  const nextImage = useCallback(() => {
    if (totalItems <= 1) return;
    goTo((activeIndex + 1) % totalItems);
  }, [totalItems, activeIndex, goTo]);

  const prevImage = useCallback(() => {
    if (totalItems <= 1) return;
    goTo((activeIndex - 1 + totalItems) % totalItems);
  }, [totalItems, activeIndex, goTo]);

  const handleDownload = useCallback((size = 2000) => {
    const url = getDisplayUrl(currentItem?.url, currentItem?.id, size);
    if (url) window.open(url, '_blank');
  }, [currentItem]);

  const handleCopyLink = useCallback(() => {
    const url = getDisplayUrl(currentItem?.url, currentItem?.id, 2000);
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [currentItem]);

  // ── Keyboard ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (showKeyboard) { setShowKeyboard(false); return; } if (showInfo) { setShowInfo(false); return; } if (showAdjust) { setShowAdjust(false); return; } onClose(); return; }
      if (e.key === "ArrowRight") { nextImage(); return; }
      if (e.key === "ArrowLeft") { prevImage(); return; }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(z => Math.min(5, z + 0.25)); setFitMode("original"); return; }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); setZoom(z => Math.max(0.5, z - 0.25)); setFitMode("original"); return; }
      if (e.key === "f" || e.key === "F") { toggleFullScreen(); return; }
      if (e.key === "i" || e.key === "I") { setShowInfo(s => !s); return; }
      if (e.key === " ") { e.preventDefault(); if (totalItems > 1) setSlideshowActive(s => !s); return; }
      if (e.key === "t" || e.key === "T") { setShowThumbnails(s => !s); return; }
      if (e.key === "?") { setShowKeyboard(s => !s); return; }
      if (e.key === "d" || e.key === "D") { handleDownload(); return; }
      if (e.key === "0") { resetZoom(); return; }
      if (e.key === "g" || e.key === "G") { setGridMode(m => m === "off" ? "thirds" : m === "thirds" ? "cross" : m === "cross" ? "golden" : "off"); return; }
      if (e.key === "r") { setRotation(r => r + 90); return; }
      if (e.key === "R") { setRotation(r => r - 90); return; }
      if (e.key === "a" || e.key === "A") { setShowAdjust(s => !s); return; }
      if (e.key === "l" || e.key === "L") { setShowLens(s => !s); return; }
      if (e.key === "c" || e.key === "C") { setColorPicker(s => !s); return; }
      if (e.key === "m" || e.key === "M") { setShowMinimap(s => !s); return; }
      if (e.key === "b" || e.key === "B") { setShowCompare(s => !s); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, nextImage, prevImage, handleDownload, showKeyboard, showInfo, showAdjust, totalItems]);

  // ── Scroll wheel zoom ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) return;
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.max(0.5, Math.min(8, prev + delta));
    });
    setFitMode("original");
  }, []);

  // ── Mouse drag to pan ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (displayZoom <= 1 && fitMode === "fit") return;
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - dragPos.x, y: e.clientY - dragPos.y });
  }, [displayZoom, dragPos, fitMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setDragPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (showLens && imageRef.current && !isDragging) {
      const rect = imageRef.current.getBoundingClientRect();
      setLensPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
      setLensActive(true);
    }
  }, [isDragging, dragStart, showLens]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // ── Color Picker ──
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    if (!colorPicker || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * imageSize.w;
    const y = ((e.clientY - rect.top) / rect.height) * imageSize.h;
    setPickedPos({ x: e.clientX, y: e.clientY });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imageRef.current, 0, 0, imageSize.w, imageSize.h);
        const p = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        const hex = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('');
        setPickedColor(hex);
      }
    }
  }, [colorPicker, imageSize]);

  // ── Touch / Swipe ──
  const touchStartRef = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });
  const touchDistRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      setIsSwiping(true);
    }
    if (e.touches.length === 2) {
      touchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - touchDistRef.current;
      setZoom(prev => Math.max(0.5, Math.min(8, prev + delta * 0.01)));
      setFitMode("original");
      touchDistRef.current = dist;
      return;
    }
    if (e.touches.length === 1 && isSwiping && displayZoom <= 1.1) {
      setSwipeX(e.touches[0].clientX - touchStartRef.current.x);
    }
  }, [isSwiping, displayZoom]);

  const handleTouchEnd = useCallback(() => {
    if (isSwiping && displayZoom <= 1.1) {
      const dx = swipeX;
      const dt = Date.now() - touchStartRef.current.t;
      if (Math.abs(dx) > SWIPE_THRESHOLD || (Math.abs(dx) > 30 && dt < 300)) {
        if (dx < 0) nextImage(); else prevImage();
      }
    }
    setIsSwiping(false);
    setSwipeX(0);
  }, [isSwiping, swipeX, displayZoom, nextImage, prevImage]);

  // ── Auto-scroll thumbs ──
  useEffect(() => {
    if (thumbsRef.current && showThumbnails) {
      const child = thumbsRef.current.children[activeIndex] as HTMLElement;
      if (child) child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeIndex, showThumbnails]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  // ── Computed style ──
  const filterStyle = useMemo(() => ({
    brightness: `${brightness / 100}`,
    contrast: `${contrast / 100}`,
    saturate: `${saturation / 100}`,
  }), [brightness, contrast, saturation]);

  const transformStyle = useMemo(() => {
    const parts: string[] = [];
    if (flipH) parts.push('scaleX(-1)');
    if (flipV) parts.push('scaleY(-1)');
    if (rotation) parts.push(`rotate(${rotation}deg)`);
    if (displayZoom > 0) parts.push(`scale(${displayZoom})`);
    if ((displayZoom > 1 || fitMode !== "fit") && (isDragging || dragPos.x !== 0 || dragPos.y !== 0)) {
      const validX = isFinite(dragPos.x / displayZoom) ? dragPos.x / displayZoom : 0;
      const validY = isFinite(dragPos.y / displayZoom) ? dragPos.y / displayZoom : 0;
      parts.push(`translate(${validX}px, ${validY}px)`);
    }
    return parts.join(' ');
  }, [flipH, flipV, rotation, displayZoom, dragPos, isDragging, fitMode]);

  const isZoomed = displayZoom > 1.05 || fitMode !== "fit" || rotation !== 0;

  const shortcutRows = [
    { keys: "← →", desc: "Navigate" },
    { keys: "Esc", desc: "Close / Back" },
    { keys: "+ / -", desc: "Zoom in / out" },
    { keys: "0", desc: "Reset view" },
    { keys: "Space", desc: "Slideshow" },
    { keys: "F", desc: "Fullscreen" },
    { keys: "I", desc: "Info panel" },
    { keys: "R", desc: "Rotate 90°" },
    { keys: "G", desc: "Grid overlay" },
    { keys: "A", desc: "Adjustments" },
    { keys: "L", desc: "Lens zoom" },
    { keys: "C", desc: "Color picker" },
    { keys: "B", desc: "Compare" },
    { keys: "M", desc: "Minimap" },
    { keys: "T", desc: "Thumbnails" },
    { keys: "D", desc: "Download" },
  ];

  return (
    <AnimatePresence>
      {isOpen && product && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="gv-overlay"
          onClick={handleOverlayClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* ── TOP BAR ── */}
          <header className="gv-topbar">
            <div className="gv-topbar-left">
              <button onClick={onClose} className="gv-btn-ghost" title="Close (Esc)">
                <X size={20} />
              </button>
              <div className="gv-title-block">
                <h3 className="gv-title">{product?.name || "Preview"}</h3>
                <span className="gv-counter">{activeIndex + 1} / {totalItems}</span>
              </div>
            </div>

            <div className="gv-topbar-center">
              <div className="gv-tool-group">
                <button onClick={() => { setZoom(z => Math.max(0.5, z - 0.25)); setFitMode("original"); }} className="gv-tool-btn" title="Zoom Out (-)">
                  <ZoomOut size={14} />
                </button>
                <span className="gv-zoom-label">{Math.round(displayZoom * 100)}%</span>
                <button onClick={() => { setZoom(1); setFitMode("fit"); }} className="gv-tool-btn gv-tool-btn-sm" title="Fit to screen (0)">
                  <Monitor size={13} />
                </button>
                <button onClick={() => { setZoom(z => Math.min(8, z + 0.25)); setFitMode("original"); }} className="gv-tool-btn" title="Zoom In (+)">
                  <ZoomIn size={14} />
                </button>
                <div className="gv-tool-sep" />
                <button onClick={() => setRotation(r => r - 90)} className="gv-tool-btn" title="Rotate Left (Shift+R)">
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => setRotation(r => r + 90)} className="gv-tool-btn" title="Rotate Right (R)">
                  <RotateCw size={14} />
                </button>
                <button onClick={() => setFlipH(f => !f)} className={`gv-tool-btn ${flipH ? 'gv-tool-active' : ''}`} title="Flip Horizontal">
                  <FlipHorizontal size={14} />
                </button>
                <button onClick={() => setFlipV(f => !f)} className={`gv-tool-btn ${flipV ? 'gv-tool-active' : ''}`} title="Flip Vertical">
                  <FlipVertical size={14} />
                </button>
              </div>
            </div>

            <div className="gv-topbar-right">
              <button
                onClick={() => { setShowLens(s => !s); setColorPicker(false); }}
                className={`gv-tool-btn ${showLens ? 'gv-tool-active' : ''}`}
                title="Lens Zoom (L)"
              >
                <ZoomIn size={14} />
                <span className="gv-btn-dot" />
              </button>
              <button
                onClick={() => { setColorPicker(s => !s); setShowLens(false); }}
                className={`gv-tool-btn ${colorPicker ? 'gv-tool-active' : ''}`}
                title="Color Picker (C)"
              >
                <Pipette size={14} />
              </button>
              <button onClick={() => setGridMode(m => m === "off" ? "thirds" : m === "thirds" ? "cross" : m === "cross" ? "golden" : "off")} className={`gv-tool-btn ${gridMode !== 'off' ? 'gv-tool-active' : ''}`} title="Grid Overlay (G)">
                <Grid3X3 size={14} />
              </button>
              <button onClick={() => setShowCompare(s => !s)} className={`gv-tool-btn ${showCompare ? 'gv-tool-active' : ''}`} title="Before/After Compare (B)">
                <Layers size={14} />
              </button>
              <button onClick={() => setShowAdjust(s => !s)} className={`gv-tool-btn ${showAdjust ? 'gv-tool-active' : ''}`} title="Adjustments (A)">
                <Sun size={14} />
              </button>
              <button onClick={() => setShowInfo(s => !s)} className={`gv-tool-btn ${showInfo ? 'gv-tool-active' : ''}`} title="Info (I)">
                <Info size={14} />
              </button>
              <div className="gv-tool-sep" />
              <div className="gv-tool-btn-wrapper">
                <button onClick={() => handleDownload(2000)} className="gv-tool-btn" title="Download (D)">
                  <Download size={14} />
                </button>
                <button onClick={() => setShowShare(s => !s)} className="gv-tool-btn" title="Share">
                  <Copy size={13} />
                </button>
              </div>
              {totalItems > 1 && (
                <button onClick={() => setSlideshowActive(s => !s)} className={`gv-tool-btn ${slideshowActive ? 'gv-tool-active' : ''}`} title="Slideshow (Space)">
                  {slideshowActive ? <Pause size={14} /> : <Play size={14} />}
                </button>
              )}
              <button onClick={() => setShowMinimap(s => !s)} className={`gv-tool-btn ${showMinimap ? 'gv-tool-active' : ''}`} title="Minimap (M)">
                <ChevronDown size={14} />
              </button>
              <button onClick={toggleFullScreen} className="gv-tool-btn" title="Fullscreen (F)">
                <Maximize2 size={14} />
              </button>
              <button onClick={() => setShowKeyboard(s => !s)} className="gv-tool-btn" title="Shortcuts (?)">
                <Keyboard size={14} />
              </button>
            </div>
          </header>

          {/* ── ADJUSTMENTS BAR ── */}
          <AnimatePresence>
            {showAdjust && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="gv-adjust-bar"
              >
                <div className="gv-adjust-inner">
                  <div className="gv-adjust-item">
                    <Sun size={12} />
                    <span className="gv-adjust-label">Brightness</span>
                    <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="gv-range" />
                    <span className="gv-adjust-val">{brightness}%</span>
                  </div>
                  <div className="gv-adjust-item">
                    <Contrast size={12} />
                    <span className="gv-adjust-label">Contrast</span>
                    <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="gv-range" />
                    <span className="gv-adjust-val">{contrast}%</span>
                  </div>
                  <div className="gv-adjust-item">
                    <Droplets size={12} />
                    <span className="gv-adjust-label">Saturation</span>
                    <input type="range" min="0" max="200" value={saturation} onChange={e => setSaturation(Number(e.target.value))} className="gv-range" />
                    <span className="gv-adjust-val">{saturation}%</span>
                  </div>
                  <button onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); }} className="gv-adjust-reset">Reset</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MAIN STAGE ── */}
          <div className="gv-stage-wrap" ref={containerRef}>
            {totalItems > 1 && (
              <button className="gv-nav gv-nav-prev" onClick={prevImage} title="Previous (←)">
                <ChevronLeft size={28} />
              </button>
            )}

            <div
              ref={stageRef}
              className="gv-stage"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleImageClick}
              style={{
                cursor: colorPicker ? 'crosshair' : isDragging ? 'grabbing' : isZoomed ? 'grab' : 'default',
              }}
            >
              {imgLoading && !imgError && (
                <div className="gv-loader"><Loader2 size={36} className="gv-spin" /></div>
              )}

              {imgError ? (
                <div className="gv-error-state">
                  <div className="gv-error-icon"><ImageOff size={48} /></div>
                  <p>Failed to load image</p>
                  {currentItem?.url && (
                    <a href={currentItem.url} target="_blank" className="gv-error-link">
                      <ExternalLink size={12} /> Open in Drive
                    </a>
                  )}
                </div>
              ) : (
                <>
                  {showCompare && variations[activeIndex + 1] && (
                    <div className="gv-compare-wrap">
                      <img
                        src={getDisplayUrl(variations[activeIndex + 1]?.url, variations[activeIndex + 1]?.id, 2000) || ''}
                        className="gv-compare-img"
                        alt="Compare"
                        draggable={false}
                      />
                      <div className="gv-compare-label">Variant {activeIndex + 2}</div>
                    </div>
                  )}
                  <motion.img
                    key={activeIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    ref={imageRef}
                    src={currentSrc}
                    className="gv-main-img"
                    draggable={false}
                    style={{
                      filter: `brightness(${filterStyle.brightness}) contrast(${filterStyle.contrast}) saturate(${filterStyle.saturate})`,
                      transform: transformStyle,
                    }}
                    onError={() => { setImgError(true); setImgLoading(false); }}
                    onLoad={(e) => {
                      setImgError(false);
                      setImgLoading(false);
                      const img = e.target as HTMLImageElement;
                      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                  />

                  {/* Grid Overlay */}
                  {gridMode !== "off" && (
                    <svg className="gv-grid-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {gridMode === "thirds" && (
                        <>
                          <line x1="33.33" y1="0" x2="33.33" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <line x1="66.67" y1="0" x2="66.67" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <line x1="0" y1="33.33" x2="100" y2="33.33" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <line x1="0" y1="66.67" x2="100" y2="66.67" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          {[33.33, 66.67].map(x => [33.33, 66.67].map(y => (
                            <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="rgba(255,255,255,0.3)" />
                          )))}
                        </>
                      )}
                      {gridMode === "cross" && (
                        <>
                          <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                          <circle cx="50" cy="50" r="25" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                          <circle cx="50" cy="50" r="1.5" fill="rgba(255,255,255,0.3)" />
                        </>
                      )}
                      {gridMode === "golden" && (
                        <>
                          <line x1="38.2" y1="0" x2="38.2" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <line x1="61.8" y1="0" x2="61.8" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <line x1="0" y1="38.2" x2="100" y2="38.2" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <line x1="0" y1="61.8" x2="100" y2="61.8" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <rect x="38.2" y="38.2" width="23.6" height="23.6" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                        </>
                      )}
                    </svg>
                  )}

                  {/* Color picker indicator */}
                  {colorPicker && pickedColor && (
                    <div className="gv-color-indicator" style={{ left: pickedPos.x + 16, top: pickedPos.y - 16 }}>
                      <span className="gv-color-swatch" style={{ background: pickedColor }} />
                      <span className="gv-color-hex">{pickedColor}</span>
                      <button className="gv-color-copy" onClick={() => {
                        navigator.clipboard.writeText(pickedColor).then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        });
                      }}>
                        {copied ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                  )}

                  {/* Image label */}
                  <div className="gv-img-label">
                    <span>{activeIndex + 1}</span>
                    {imageSize.w > 0 && <span className="gv-img-dims">{imageSize.w}×{imageSize.h}</span>}
                  </div>
                </>
              )}
            </div>

            {totalItems > 1 && (
              <button className="gv-nav gv-nav-next" onClick={nextImage} title="Next (→)">
                <ChevronRight size={28} />
              </button>
            )}

            {/* ── INFO PANEL ── */}
            <AnimatePresence>
              {showInfo && (
                <motion.aside
                  initial={{ x: 360 }}
                  animate={{ x: 0 }}
                  exit={{ x: 360 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="gv-info-panel"
                >
                  <div className="gv-info-inner">
                    <div className="gv-info-section-title">
                      <Info size={12} />
                      <span>Details</span>
                    </div>
                    <div className="gv-info-block">
                      <span className="gv-info-label">Product</span>
                      <span className="gv-info-value">{product?.name || "Untitled"}</span>
                    </div>
                    <div className="gv-info-row">
                      <div className="gv-info-block">
                        <span className="gv-info-label">Category</span>
                        <span className="gv-info-value-sm">{product?.category || "—"}</span>
                      </div>
                      <div className="gv-info-block">
                        <span className="gv-info-label">Status</span>
                        <span className="gv-info-value-sm">{product?.status || "—"}</span>
                      </div>
                    </div>
                    {product?.variationCount && (
                      <div className="gv-info-block">
                        <span className="gv-info-label">Variations</span>
                        <span className="gv-info-value-sm">{product.variationCount}</span>
                      </div>
                    )}
                    {imageSize.w > 0 && (
                      <div className="gv-info-block">
                        <span className="gv-info-label">Resolution</span>
                        <span className="gv-info-value-sm">{imageSize.w} × {imageSize.h}</span>
                      </div>
                    )}
                    {product?.directions && (
                      <>
                        <div className="gv-info-divider" />
                        <div className="gv-info-block">
                          <span className="gv-info-label">Shoot Direction</span>
                          <p className="gv-info-text">{product.directions.shoot || "None"}</p>
                        </div>
                        <div className="gv-info-block">
                          <span className="gv-info-label">Edit Direction</span>
                          <p className="gv-info-text">{product.directions.edit || "None"}</p>
                        </div>
                      </>
                    )}
                    {currentItem?.url && (
                      <>
                        <div className="gv-info-divider" />
                        <a href={currentItem.url} target="_blank" className="gv-info-link">
                          <ExternalLink size={11} /> Open in Google Drive
                        </a>
                      </>
                    )}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* ── SHARE MODAL ── */}
            <AnimatePresence>
              {showShare && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="gv-share-modal"
                >
                  <div className="gv-share-header">
                    <Copy size={12} />
                    <span>Share Image</span>
                    <button onClick={() => setShowShare(false)} className="gv-share-close"><X size={12} /></button>
                  </div>
                  <div className="gv-share-options">
                    {[2000, 800, 400].map(s => (
                      <button key={s} onClick={() => handleDownload(s)} className="gv-share-btn">
                        <Download size={12} />
                        <span>{s === 2000 ? 'Original' : s === 800 ? 'Large' : 'Thumbnail'}</span>
                        <span className="gv-share-size">{s}px</span>
                      </button>
                    ))}
                    <button onClick={handleCopyLink} className="gv-share-btn">
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copied ? 'Copied!' : 'Copy URL'}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── LENS ZOOM ── */}
          <AnimatePresence>
            {showLens && lensActive && currentSrc && !imgError && (
              <motion.div
                ref={lensRef}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="gv-lens"
                style={{
                  left: `calc(${lensPos.x}% + 20px)`,
                  top: `calc(${lensPos.y}% - 80px)`,
                }}
              >
                <div
                  className="gv-lens-img"
                  style={{
                    backgroundImage: `url(${currentSrc})`,
                    backgroundPosition: `${lensPos.x}% ${lensPos.y}%`,
                    backgroundSize: `${displayZoom * 300}%`,
                    filter: `brightness(${filterStyle.brightness}) contrast(${filterStyle.contrast}) saturate(${filterStyle.saturate})`,
                  }}
                />
                <div className="gv-lens-crosshair" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── KEYBOARD MODAL ── */}
          <AnimatePresence>
            {showKeyboard && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="gv-modal-overlay"
                onClick={() => setShowKeyboard(false)}
              >
                <div className="gv-modal" onClick={e => e.stopPropagation()}>
                  <div className="gv-modal-head">
                    <Keyboard size={14} />
                    <span>Keyboard Shortcuts</span>
                    <button onClick={() => setShowKeyboard(false)} className="gv-modal-close"><X size={14} /></button>
                  </div>
                  <div className="gv-modal-grid">
                    {shortcutRows.map(s => (
                      <div key={s.keys} className="gv-modal-row">
                        <span className="gv-modal-key">{s.keys}</span>
                        <span className="gv-modal-desc">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MINIMAP ── */}
          <AnimatePresence>
            {showMinimap && currentThumb && !imgError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="gv-minimap"
              >
                <div className="gv-minimap-header">
                  <ChevronDown size={10} />
                  <span>Navigator</span>
                  <button onClick={() => setShowMinimap(false)} className="gv-minimap-close"><X size={10} /></button>
                </div>
                <div className="gv-minimap-img-wrap">
                  <img src={currentThumb} alt="minimap" className="gv-minimap-img" draggable={false} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── THUMBNAIL STRIP ── */}
          {totalItems > 1 && showThumbnails && (
            <div className="gv-thumbs-bar">
              <div className="gv-thumbs-inner" ref={thumbsRef}>
                {variations.map((v: any, i: number) => (
                  <button
                    key={i}
                    className={`gv-thumb ${i === activeIndex ? 'gv-thumb-active' : ''}`}
                    onClick={() => goTo(i)}
                  >
                    <img src={getDisplayUrl(v.url, v.id, 120) || ''} alt={`Thumb ${i + 1}`} loading="lazy" />
                    <span className="gv-thumb-idx">{i + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── CANVAS (hidden, for color picker) ── */}
          <canvas ref={canvasRef} width={imageSize.w} height={imageSize.h} style={{ display: 'none' }} />

          <style jsx>{`
            /* ================================================================
               GLOBAL VIEWER — Pro-level image viewer
               ================================================================ */
            .gv-overlay {
              position: fixed; inset: 0;
              background: rgba(0, 0, 0, 0.94);
              backdrop-filter: blur(32px) saturate(1.5);
              -webkit-backdrop-filter: blur(32px) saturate(1.5);
              z-index: 99999;
              display: flex;
              flex-direction: column;
              color: #fff;
              font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
              user-select: none;
              -webkit-user-select: none;
            }

            /* ── TOP BAR ── */
            .gv-topbar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0.6rem 1rem;
              background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%);
              flex-shrink: 0;
              z-index: 20;
              gap: 1rem;
            }
            .gv-topbar-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
            .gv-title-block { min-width: 0; }
            .gv-title { margin: 0; font-size: 0.9rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; }
            .gv-counter { font-size: 0.6rem; color: rgba(255,255,255,0.35); font-weight: 600; letter-spacing: 0.04em; }
            .gv-topbar-center { display: flex; align-items: center; }
            .gv-topbar-right { display: flex; align-items: center; gap: 0.05rem; flex-shrink: 0; }

            .gv-tool-group {
              display: flex; align-items: center;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.04);
              border-radius: 100px;
              padding: 0.1rem;
              gap: 0.05rem;
            }
            .gv-tool-sep { width: 1px; height: 18px; background: rgba(255,255,255,0.06); margin: 0 0.1rem; flex-shrink: 0; }
            .gv-zoom-label {
              font-size: 0.65rem; font-weight: 600; color: rgba(255,255,255,0.4);
              width: 42px; text-align: center; font-variant-numeric: tabular-nums;
            }

            .gv-tool-btn {
              width: 30px; height: 30px;
              border-radius: 8px;
              background: transparent; border: none;
              color: rgba(255,255,255,0.45);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; transition: all 0.15s;
              font-size: 0.55rem; font-weight: 700;
              position: relative;
            }
            .gv-tool-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
            .gv-tool-btn-sm { font-size: 0.5rem; }
            .gv-tool-active { background: rgba(99,102,241,0.15) !important; color: #a5b4fc !important; }
            .gv-btn-dot { display: none; }
            .gv-tool-active .gv-btn-dot { display: block; position: absolute; bottom: 2px; right: 2px; width: 4px; height: 4px; border-radius: 50%; background: #818cf8; }

            .gv-tool-btn-wrapper { display: flex; align-items: center; gap: 0; }

            .gv-btn-ghost {
              width: 34px; height: 34px;
              border-radius: 10px;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.04);
              color: rgba(255,255,255,0.6);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; transition: all 0.15s;
              flex-shrink: 0;
            }
            .gv-btn-ghost:hover { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.15); color: #ef4444; }

            /* ── ADJUSTMENTS BAR ── */
            .gv-adjust-bar {
              overflow: hidden;
              flex-shrink: 0;
              z-index: 15;
              border-bottom: 1px solid rgba(255,255,255,0.03);
            }
            .gv-adjust-inner {
              display: flex; align-items: center; gap: 1rem;
              padding: 0.5rem 1.5rem;
              background: rgba(0,0,0,0.3);
              backdrop-filter: blur(16px);
              flex-wrap: wrap;
            }
            .gv-adjust-item {
              display: flex; align-items: center; gap: 0.4rem;
              color: rgba(255,255,255,0.5);
              font-size: 0.65rem; font-weight: 600;
            }
            .gv-adjust-label { min-width: 60px; }
            .gv-range {
              -webkit-appearance: none; appearance: none;
              width: 80px; height: 3px;
              background: rgba(255,255,255,0.1);
              border-radius: 4px;
              outline: none;
              cursor: pointer;
            }
            .gv-range::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 12px; height: 12px;
              border-radius: 50%;
              background: #818cf8;
              border: 2px solid rgba(255,255,255,0.2);
              cursor: pointer;
              transition: all 0.15s;
            }
            .gv-range::-webkit-slider-thumb:hover { transform: scale(1.2); background: #a5b4fc; }
            .gv-adjust-val { width: 32px; text-align: right; font-variant-numeric: tabular-nums; color: rgba(255,255,255,0.3); }
            .gv-adjust-reset {
              padding: 0.25rem 0.6rem;
              border-radius: 6px;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.04);
              color: rgba(255,255,255,0.3);
              font-size: 0.6rem; font-weight: 700;
              cursor: pointer; transition: all 0.15s;
              margin-left: auto;
            }
            .gv-adjust-reset:hover { background: rgba(255,255,255,0.08); color: #fff; }

            /* ── STAGE ── */
            .gv-stage-wrap {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              overflow: hidden;
              min-height: 0;
            }
            .gv-stage {
              width: 100%; height: 100%;
              display: flex; align-items: center; justify-content: center;
              padding: 1rem;
              overflow: hidden;
              position: relative;
            }
            .gv-main-img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              pointer-events: none;
              will-change: transform, filter;
              border-radius: 1px;
              transition: filter 0.2s ease;
            }

            .gv-loader { position: absolute; color: rgba(255,255,255,0.15); }
            .gv-spin { animation: gv-rotate 0.8s linear infinite; }
            @keyframes gv-rotate { to { transform: rotate(360deg); } }

            .gv-error-state {
              display: flex; flex-direction: column; align-items: center; gap: 0.8rem;
              color: rgba(255,255,255,0.2);
            }
            .gv-error-icon { opacity: 0.4; }
            .gv-error-state p { margin: 0; font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.25); }
            .gv-error-link {
              display: inline-flex; align-items: center; gap: 0.35rem;
              padding: 0.35rem 0.8rem;
              background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.12);
              border-radius: 8px; color: #818cf8;
              font-size: 0.7rem; font-weight: 700; text-decoration: none;
              transition: all 0.15s;
            }
            .gv-error-link:hover { background: rgba(99,102,241,0.15); }

            /* ── Grid Overlay ── */
            .gv-grid-overlay {
              position: absolute; inset: 0;
              width: 100%; height: 100%;
              pointer-events: none;
              z-index: 5;
            }

            /* ── Compare ── */
            .gv-compare-wrap {
              position: absolute; inset: 1rem;
              z-index: 3;
              overflow: hidden;
              border-radius: 4px;
              border: 1px solid rgba(255,255,255,0.06);
            }
            .gv-compare-img {
              width: 100%; height: 100%;
              object-fit: contain;
              opacity: 0.5;
              filter: grayscale(1);
            }
            .gv-compare-label {
              position: absolute; top: 0.5rem; left: 0.5rem;
              font-size: 0.6rem; font-weight: 700;
              background: rgba(0,0,0,0.6);
              padding: 0.15rem 0.45rem;
              border-radius: 4px;
              color: rgba(255,255,255,0.4);
            }

            /* ── Color indicator ── */
            .gv-color-indicator {
              position: absolute; z-index: 10;
              display: flex; align-items: center; gap: 0.3rem;
              background: rgba(0,0,0,0.75);
              backdrop-filter: blur(8px);
              border: 1px solid rgba(255,255,255,0.06);
              border-radius: 8px;
              padding: 0.3rem 0.5rem;
              pointer-events: auto;
            }
            .gv-color-swatch {
              width: 16px; height: 16px;
              border-radius: 4px;
              border: 1px solid rgba(255,255,255,0.1);
              flex-shrink: 0;
            }
            .gv-color-hex {
              font-size: 0.65rem; font-weight: 700;
              font-family: 'SF Mono', 'Fira Code', monospace;
              color: rgba(255,255,255,0.8);
            }
            .gv-color-copy {
              width: 20px; height: 20px;
              border-radius: 4px;
              background: rgba(255,255,255,0.04);
              border: none;
              color: rgba(255,255,255,0.3);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; transition: all 0.15s;
            }
            .gv-color-copy:hover { background: rgba(255,255,255,0.1); color: #fff; }

            /* ── Image label ── */
            .gv-img-label {
              position: absolute; bottom: 0.75rem; right: 1rem;
              display: flex; align-items: center; gap: 0.4rem;
              font-size: 0.6rem; font-weight: 600;
              color: rgba(255,255,255,0.15);
              background: rgba(0,0,0,0.3);
              padding: 0.15rem 0.5rem;
              border-radius: 6px;
              pointer-events: none;
            }
            .gv-img-dims { color: rgba(255,255,255,0.1); }

            /* ── Navigation ── */
            .gv-nav {
              position: absolute; top: 50%; transform: translateY(-50%);
              z-index: 5;
              width: 42px; height: 42px;
              border-radius: 50%;
              background: rgba(0,0,0,0.35);
              backdrop-filter: blur(12px);
              border: 1px solid rgba(255,255,255,0.04);
              color: rgba(255,255,255,0.3);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; transition: all 0.2s;
              opacity: 0;
            }
            .gv-stage-wrap:hover .gv-nav { opacity: 1; }
            .gv-nav:hover { background: rgba(99,102,241,0.25); border-color: rgba(99,102,241,0.2); color: #fff; transform: translateY(-50%) scale(1.06); }
            .gv-nav-prev { left: 0.75rem; }
            .gv-nav-next { right: 0.75rem; }

            /* ── INFO PANEL ── */
            .gv-info-panel {
              position: absolute; top: 0; right: 0; bottom: 0;
              width: 320px;
              background: rgba(8, 8, 20, 0.88);
              backdrop-filter: blur(40px) saturate(1.2);
              -webkit-backdrop-filter: blur(40px) saturate(1.2);
              border-left: 1px solid rgba(255,255,255,0.03);
              z-index: 20;
              overflow: hidden;
              display: flex; flex-direction: column;
            }
            .gv-info-inner {
              padding: 1.25rem;
              overflow-y: auto;
              display: flex; flex-direction: column; gap: 0.85rem;
            }
            .gv-info-inner::-webkit-scrollbar { width: 2px; }
            .gv-info-inner::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }
            .gv-info-section-title {
              display: flex; align-items: center; gap: 0.45rem;
              font-size: 0.55rem; font-weight: 700; color: rgba(255,255,255,0.25);
              text-transform: uppercase; letter-spacing: 0.1em;
              padding-bottom: 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.03);
            }
            .gv-info-block { display: flex; flex-direction: column; gap: 0.15rem; }
            .gv-info-label { font-size: 0.55rem; font-weight: 600; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.06em; }
            .gv-info-value { font-size: 0.95rem; font-weight: 700; color: #fff; }
            .gv-info-value-sm { font-size: 0.78rem; color: rgba(255,255,255,0.55); font-weight: 600; }
            .gv-info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
            .gv-info-text { margin: 0; font-size: 0.7rem; line-height: 1.6; color: rgba(255,255,255,0.4); }
            .gv-info-divider { height: 1px; background: rgba(255,255,255,0.03); margin: 0.1rem 0; }
            .gv-info-link {
              display: inline-flex; align-items: center; gap: 0.35rem;
              font-size: 0.68rem; font-weight: 600; color: #818cf8;
              text-decoration: none; transition: all 0.15s;
            }
            .gv-info-link:hover { color: #a5b4fc; }

            /* ── LENS ── */
            .gv-lens {
              position: absolute; z-index: 30;
              width: 120px; height: 120px;
              border-radius: 50%;
              overflow: hidden;
              border: 2px solid rgba(255,255,255,0.1);
              box-shadow: 0 8px 32px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04);
              pointer-events: none;
              background: rgba(0,0,0,0.8);
            }
            .gv-lens-img {
              width: 100%; height: 100%;
              background-repeat: no-repeat;
              image-rendering: auto;
            }
            .gv-lens-crosshair {
              position: absolute; top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              width: 4px; height: 4px;
              border: 1px solid rgba(255,255,255,0.3);
              border-radius: 50%;
            }

            /* ── SHARE MODAL ── */
            .gv-share-modal {
              position: absolute; bottom: 5rem; right: 1rem;
              z-index: 25;
              background: rgba(12, 12, 28, 0.95);
              backdrop-filter: blur(24px);
              border: 1px solid rgba(255,255,255,0.04);
              border-radius: 14px;
              padding: 0.75rem;
              min-width: 180px;
              box-shadow: 0 16px 48px rgba(0,0,0,0.5);
            }
            .gv-share-header {
              display: flex; align-items: center; gap: 0.4rem;
              font-size: 0.6rem; font-weight: 700;
              color: rgba(255,255,255,0.3);
              padding-bottom: 0.5rem;
              margin-bottom: 0.4rem;
              border-bottom: 1px solid rgba(255,255,255,0.03);
              text-transform: uppercase; letter-spacing: 0.06em;
            }
            .gv-share-close {
              margin-left: auto;
              width: 18px; height: 18px;
              border-radius: 4px;
              background: transparent; border: none;
              color: rgba(255,255,255,0.2);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer;
            }
            .gv-share-close:hover { background: rgba(255,255,255,0.04); color: #fff; }
            .gv-share-options { display: flex; flex-direction: column; gap: 0.25rem; }
            .gv-share-btn {
              display: flex; align-items: center; gap: 0.5rem;
              padding: 0.4rem 0.6rem;
              border-radius: 8px;
              background: transparent; border: none;
              color: rgba(255,255,255,0.5);
              font-size: 0.72rem; font-weight: 600;
              cursor: pointer; transition: all 0.15s;
              width: 100%; text-align: left;
            }
            .gv-share-btn:hover { background: rgba(255,255,255,0.04); color: #fff; }
            .gv-share-size { margin-left: auto; font-size: 0.6rem; color: rgba(255,255,255,0.2); }

            /* ── KEYBOARD MODAL ── */
            .gv-modal-overlay {
              position: absolute; inset: 0;
              background: rgba(0,0,0,0.5);
              backdrop-filter: blur(8px);
              z-index: 50;
              display: flex; align-items: center; justify-content: center;
            }
            .gv-modal {
              background: rgba(12, 12, 28, 0.96);
              border: 1px solid rgba(255,255,255,0.04);
              border-radius: 16px;
              padding: 0.1rem;
              max-width: 360px; width: 85%;
              box-shadow: 0 32px 64px rgba(0,0,0,0.6);
              overflow: hidden;
            }
            .gv-modal-head {
              display: flex; align-items: center; gap: 0.5rem;
              padding: 1rem 1.25rem;
              font-size: 0.7rem; font-weight: 700;
              color: rgba(255,255,255,0.4);
              text-transform: uppercase; letter-spacing: 0.08em;
              border-bottom: 1px solid rgba(255,255,255,0.03);
            }
            .gv-modal-close {
              margin-left: auto;
              width: 22px; height: 22px;
              border-radius: 6px;
              background: transparent; border: none;
              color: rgba(255,255,255,0.2);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer;
            }
            .gv-modal-close:hover { background: rgba(255,255,255,0.04); color: #fff; }
            .gv-modal-grid {
              padding: 0.75rem 1.25rem 1.25rem;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.15rem;
            }
            .gv-modal-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.2rem 0; }
            .gv-modal-key {
              font-size: 0.6rem; font-weight: 700; color: #a5b4fc;
              background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.1);
              padding: 0.1rem 0.4rem; border-radius: 4px;
              min-width: 44px; text-align: center;
              font-family: 'SF Mono', 'Fira Code', monospace;
              letter-spacing: 0.02em;
            }
            .gv-modal-desc { font-size: 0.68rem; color: rgba(255,255,255,0.5); }

            /* ── MINIMAP ── */
            .gv-minimap {
              position: absolute; bottom: 5.5rem; left: 1rem;
              z-index: 15;
              background: rgba(8, 8, 20, 0.9);
              backdrop-filter: blur(16px);
              border: 1px solid rgba(255,255,255,0.03);
              border-radius: 10px;
              overflow: hidden;
              width: 120px;
              box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            }
            .gv-minimap-header {
              display: flex; align-items: center; gap: 0.3rem;
              padding: 0.3rem 0.5rem;
              font-size: 0.55rem; font-weight: 700;
              color: rgba(255,255,255,0.2);
              border-bottom: 1px solid rgba(255,255,255,0.03);
            }
            .gv-minimap-close {
              margin-left: auto;
              width: 16px; height: 16px;
              border-radius: 3px;
              background: transparent; border: none;
              color: rgba(255,255,255,0.15);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; padding: 0;
            }
            .gv-minimap-close:hover { background: rgba(255,255,255,0.04); color: #fff; }
            .gv-minimap-img-wrap { padding: 0.35rem; }
            .gv-minimap-img { width: 100%; display: block; border-radius: 4px; opacity: 0.7; }

            /* ── THUMBNAIL STRIP ── */
            .gv-thumbs-bar {
              flex-shrink: 0;
              background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%);
              padding: 0.6rem 0 0.85rem;
              display: flex; justify-content: center;
              z-index: 10;
            }
            .gv-thumbs-inner {
              display: flex; gap: 0.4rem;
              overflow-x: auto;
              padding: 0 1rem;
              max-width: 100%;
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .gv-thumbs-inner::-webkit-scrollbar { display: none; }

            .gv-thumb {
              flex-shrink: 0;
              width: 48px; height: 48px;
              border-radius: 10px;
              overflow: hidden;
              border: 2px solid transparent;
              padding: 0;
              cursor: pointer;
              transition: all 0.2s;
              opacity: 0.35;
              position: relative;
              background: rgba(255,255,255,0.02);
            }
            .gv-thumb:hover { opacity: 0.6; }
            .gv-thumb-active {
              opacity: 1 !important;
              border-color: #818cf8;
              box-shadow: 0 0 12px rgba(99,102,241,0.2);
              transform: scale(1.06);
            }
            .gv-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
            .gv-thumb-idx {
              position: absolute; bottom: 1px; right: 1px;
              width: 14px; height: 14px;
              display: flex; align-items: center; justify-content: center;
              background: rgba(0,0,0,0.5);
              border-radius: 3px;
              font-size: 0.4rem; font-weight: 700; color: rgba(255,255,255,0.5);
              backdrop-filter: blur(4px);
            }

            /* ── RESPONSIVE ── */
            @media (max-width: 768px) {
              .gv-topbar { padding: 0.4rem 0.6rem; flex-wrap: wrap; gap: 0.4rem; }
              .gv-topbar-center { order: 3; width: 100%; justify-content: center; }
              .gv-topbar-right { gap: 0; flex-wrap: wrap; justify-content: flex-end; }
              .gv-tool-btn { width: 28px; height: 28px; }
              .gv-btn-ghost { width: 30px; height: 30px; }
              .gv-stage { padding: 0.25rem; }
              .gv-nav { width: 34px; height: 34px; opacity: 1; }
              .gv-nav-prev { left: 0.25rem; }
              .gv-nav-next { right: 0.25rem; }
              .gv-info-panel { width: 100%; }
              .gv-thumb { width: 40px; height: 40px; }
              .gv-zoom-label { width: 36px; font-size: 0.6rem; }
              .gv-modal { padding: 0; }
              .gv-modal-grid { grid-template-columns: 1fr; }
              .gv-adjust-inner { padding: 0.4rem 0.75rem; gap: 0.5rem; }
              .gv-range { width: 60px; }
              .gv-lens { width: 80px; height: 80px; }
              .gv-minimap { width: 90px; }
              .gv-share-modal { right: 0.5rem; bottom: 4.5rem; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
