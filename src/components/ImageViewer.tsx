"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Info,
  Minimize,
  ImageOff,
  Play,
  Pause,
  Keyboard,
  Loader2,
  ExternalLink,
  Grid,
  FileText,
  Tag,
  Clock,
  Layers,
  Camera,
} from "lucide-react";
import { getDisplayUrl } from "@/lib/utils";

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  initialIndex?: number;
}

const SWIPE_THRESHOLD = 60;

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
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const slideshowRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const currentSrc = useMemo(() => getDisplayUrl(currentItem?.url, currentItem?.id, 1600) || '', [currentItem]);

  // ── Reset on open ──
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(initialIndex);
      setZoom(1);
      setImgError(false);
      setImgLoading(true);
      setDragPos({ x: 0, y: 0 });
      setSwipeX(0);
      setShowInfo(false);
    }
  }, [isOpen, initialIndex]);

  // ── Slideshow ──
  useEffect(() => {
    if (slideshowActive && totalItems > 1) {
      slideshowRef.current = setInterval(() => {
        setActiveIndex(prev => {
          const next = (prev + 1) % totalItems;
          resetZoom();
          return next;
        });
      }, 3000);
    }
    return () => { if (slideshowRef.current) clearInterval(slideshowRef.current); };
  }, [slideshowActive, totalItems]);

  // ── Fullscreen ──
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const fn = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const resetZoom = () => {
    setZoom(1);
    setImgError(false);
    setImgLoading(true);
    setDragPos({ x: 0, y: 0 });
  };

  const goTo = useCallback((i: number) => {
    if (slideshowActive) setSlideshowActive(false);
    setActiveIndex(i);
    resetZoom();
  }, [slideshowActive]);

  const nextImage = useCallback(() => {
    if (totalItems <= 1) return;
    goTo((activeIndex + 1) % totalItems);
  }, [totalItems, activeIndex, goTo]);

  const prevImage = useCallback(() => {
    if (totalItems <= 1) return;
    goTo((activeIndex - 1 + totalItems) % totalItems);
  }, [totalItems, activeIndex, goTo]);

  const handleDownload = useCallback(() => {
    if (!currentItem?.url) return;
    const url = getDisplayUrl(currentItem.url, currentItem.id, 2000);
    if (url) window.open(url, '_blank');
  }, [currentItem]);

  // ── Keyboard ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight") { nextImage(); return; }
      if (e.key === "ArrowLeft") { prevImage(); return; }
      if (e.key === "+" || e.key === "=") { setZoom(z => Math.min(5, z + 0.25)); return; }
      if (e.key === "-" || e.key === "_") { setZoom(z => Math.max(0.5, z - 0.25)); return; }
      if (e.key === "f" || e.key === "F") { toggleFullScreen(); return; }
      if (e.key === "i" || e.key === "I") { setShowInfo(s => !s); return; }
      if (e.key === " ") { e.preventDefault(); setSlideshowActive(s => !s); return; }
      if (e.key === "t" || e.key === "T") { setShowThumbnails(s => !s); return; }
      if (e.key === "?" || e.key === "/") { setShowKeyboard(s => !s); return; }
      if (e.key === "d" || e.key === "D") { handleDownload(); return; }
      if (e.key === "0") { resetZoom(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, nextImage, prevImage, handleDownload]);

  // ── Scroll wheel zoom ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.max(0.5, Math.min(5, prev + delta));
    });
  }, []);

  // ── Mouse drag to pan ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - dragPos.x, y: e.clientY - dragPos.y });
  }, [zoom, dragPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // ── Touch / Swipe ──
  const touchStartRef = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      setIsSwiping(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isSwiping && zoom <= 1) {
      setSwipeX(e.touches[0].clientX - touchStartRef.current.x);
    }
  }, [isSwiping, zoom]);

  const handleTouchEnd = useCallback(() => {
    if (isSwiping && zoom <= 1) {
      const dx = swipeX;
      const dt = Date.now() - touchStartRef.current.t;
      if (Math.abs(dx) > SWIPE_THRESHOLD || (Math.abs(dx) > 30 && dt < 300)) {
        if (dx < 0) nextImage();
        else prevImage();
      }
    }
    setIsSwiping(false);
    setSwipeX(0);
  }, [isSwiping, swipeX, zoom, nextImage, prevImage]);

  // ── Auto-scroll thumbs into view ──
  useEffect(() => {
    if (thumbsRef.current && showThumbnails) {
      const child = thumbsRef.current.children[activeIndex] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeIndex, showThumbnails]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  const stageStyle: React.CSSProperties = {
    cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
    transform: isSwiping ? `translateX(${swipeX}px)` : 'none',
    transition: isSwiping ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <AnimatePresence>
      {isOpen && product && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="iv-overlay"
          onClick={handleOverlayClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* ── TOP BAR ── */}
          <div className="iv-topbar">
            <div className="iv-topbar-left">
              <button onClick={onClose} className="iv-btn iv-btn-ghost" title="Close (Esc)">
                <X size={22} />
              </button>
              <div className="iv-topbar-title">
                <h3>{product?.name || "Preview"}</h3>
                <span className="iv-topbar-counter">
                  {activeIndex + 1} / {totalItems}
                </span>
              </div>
            </div>

            <div className="iv-topbar-center">
              <div className="iv-zoom-group">
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="iv-btn-icon" title="Zoom Out (-)">
                  <ZoomOut size={15} />
                </button>
                <span className="iv-zoom-pct">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(1)} className="iv-btn-icon iv-btn-icon-sm" title="Reset Zoom (0)">
                  1:1
                </button>
                <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="iv-btn-icon" title="Zoom In (+)">
                  <ZoomIn size={15} />
                </button>
              </div>
            </div>

            <div className="iv-topbar-right">
              {totalItems > 1 && (
                <button
                  onClick={() => setSlideshowActive(s => !s)}
                  className={`iv-btn-icon ${slideshowActive ? 'iv-btn-active' : ''}`}
                  title="Slideshow (Space)"
                >
                  {slideshowActive ? <Pause size={16} /> : <Play size={16} />}
                </button>
              )}
              <button onClick={() => setShowThumbnails(s => !s)} className={`iv-btn-icon ${showThumbnails ? 'iv-btn-active' : ''}`} title="Thumbnails (T)">
                <Grid size={16} />
              </button>
              <button onClick={() => setShowInfo(s => !s)} className={`iv-btn-icon ${showInfo ? 'iv-btn-active' : ''}`} title="Info (I)">
                <Info size={16} />
              </button>
              <button onClick={handleDownload} className="iv-btn-icon" title="Download (D)">
                <Download size={16} />
              </button>
              <button onClick={toggleFullScreen} className="iv-btn-icon" title="Fullscreen (F)">
                {isFullScreen ? <Minimize size={16} /> : <Maximize2 size={16} />}
              </button>
              <button onClick={() => setShowKeyboard(s => !s)} className="iv-btn-icon" title="Keyboard Shortcuts (?)">
                <Keyboard size={16} />
              </button>
            </div>
          </div>

          {/* ── KEYBOARD SHORTCUTS OVERLAY ── */}
          <AnimatePresence>
            {showKeyboard && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="iv-keyboard-modal"
                onClick={() => setShowKeyboard(false)}
              >
                <div className="iv-keyboard-content" onClick={e => e.stopPropagation()}>
                  <h4>Keyboard Shortcuts</h4>
                  <div className="iv-kb-grid">
                    {[
                      { keys: "← →", desc: "Navigate images" },
                      { keys: "Esc", desc: "Close viewer" },
                      { keys: "+ / -", desc: "Zoom in / out" },
                      { keys: "0", desc: "Reset zoom" },
                      { keys: "Space", desc: "Toggle slideshow" },
                      { keys: "F", desc: "Fullscreen" },
                      { keys: "I", desc: "Toggle info panel" },
                      { keys: "T", desc: "Toggle thumbnails" },
                      { keys: "D", desc: "Download image" },
                      { keys: "?", desc: "Toggle shortcuts" },
                    ].map(s => (
                      <div key={s.keys} className="iv-kb-row">
                        <span className="iv-kb-keys">{s.keys}</span>
                        <span className="iv-kb-desc">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MAIN STAGE ── */}
          <div className="iv-stage-wrap">
            {totalItems > 1 && (
              <button className="iv-nav iv-nav-prev" onClick={prevImage} title="Previous (←)">
                <ChevronLeft size={32} />
              </button>
            )}

            <div
              ref={stageRef}
              className="iv-stage"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={stageStyle}
            >
              {imgLoading && !imgError && (
                <div className="iv-loader">
                  <Loader2 size={40} className="iv-spin" />
                </div>
              )}

              {imgError ? (
                <div className="iv-error">
                  <div className="iv-error-icon"><ImageOff size={48} /></div>
                  <p>Failed to load image</p>
                  {currentItem?.url && (
                    <a href={currentItem.url} target="_blank" className="iv-error-link">
                      <ExternalLink size={12} /> Open in Drive
                    </a>
                  )}
                </div>
              ) : (
                <motion.img
                  key={activeIndex}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  src={currentSrc}
                  style={{
                    transform: zoom > 1
                      ? `scale(${zoom}) translate(${dragPos.x / zoom}px, ${dragPos.y / zoom}px)`
                      : `scale(${zoom})`,
                  }}
                  className="iv-main-img"
                  draggable={false}
                  onError={() => { setImgError(true); setImgLoading(false); }}
                  onLoad={() => { setImgError(false); setImgLoading(false); }}
                />
              )}

              {/* Progress dots */}
              {totalItems > 1 && (
                <div className="iv-progress-dots">
                  {variations.slice(0, 20).map((_: any, i: number) => (
                    <span key={i} className={`iv-pdot ${i === activeIndex ? 'iv-pdot-active' : ''}`} />
                  ))}
                  {totalItems > 20 && <span className="iv-pdot-more">+{totalItems - 20}</span>}
                </div>
              )}
            </div>

            {totalItems > 1 && (
              <button className="iv-nav iv-nav-next" onClick={nextImage} title="Next (→)">
                <ChevronRight size={32} />
              </button>
            )}
          </div>

          {/* ── INFO PANEL (slide-in) ── */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ x: 380 }}
                animate={{ x: 0 }}
                exit={{ x: 380 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="iv-info"
              >
                <div className="iv-info-scroll">
                  <div className="iv-info-header">
                    <FileText size={14} />
                    <span>Details</span>
                  </div>

                  <div className="iv-info-block">
                    <label>Product</label>
                    <h4>{product?.name || "Untitled"}</h4>
                  </div>

                  <div className="iv-info-row">
                    <div className="iv-info-block">
                      <label>Category</label>
                      <p>{product?.category || "—"}</p>
                    </div>
                    <div className="iv-info-block">
                      <label>Status</label>
                      <p>{product?.status || "—"}</p>
                    </div>
                  </div>

                  {product?.variationCount && (
                    <div className="iv-info-block">
                      <label>Variations</label>
                      <p>{product.variationCount}</p>
                    </div>
                  )}

                  {product?.directions && (
                    <>
                      <div className="iv-info-divider" />
                      <div className="iv-info-block">
                        <label><Camera size={11} /> Shoot Direction</label>
                        <p className="iv-info-text">{product.directions.shoot || "None"}</p>
                      </div>
                      <div className="iv-info-block">
                        <label><Layers size={11} /> Edit Direction</label>
                        <p className="iv-info-text">{product.directions.edit || "None"}</p>
                      </div>
                    </>
                  )}

                  {currentItem?.url && (
                    <>
                      <div className="iv-info-divider" />
                      <a href={currentItem.url} target="_blank" className="iv-info-drive-link">
                        <ExternalLink size={12} /> Open in Google Drive
                      </a>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── BOTTOM THUMBNAIL STRIP ── */}
          {totalItems > 1 && showThumbnails && (
            <div className="iv-thumbs-bar">
              <div className="iv-thumbs-container" ref={thumbsRef}>
                {variations.map((v: any, i: number) => (
                  <button
                    key={i}
                    className={`iv-thumb ${i === activeIndex ? 'iv-thumb-active' : ''}`}
                    onClick={() => goTo(i)}
                  >
                    <img
                      src={getDisplayUrl(v.url, v.id, 120) || ''}
                      alt={`Thumb ${i + 1}`}
                      loading="lazy"
                    />
                    <span className="iv-thumb-idx">{i + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <style jsx>{`
            /* ================================================================
               OVERLAY
               ================================================================ */
            .iv-overlay {
              position: fixed; inset: 0;
              background: rgba(0, 0, 0, 0.92);
              backdrop-filter: blur(24px) saturate(1.4);
              z-index: 99999;
              display: flex;
              flex-direction: column;
              color: #fff;
              font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
              user-select: none;
              -webkit-user-select: none;
            }

            /* ================================================================
               TOP BAR
               ================================================================ */
            .iv-topbar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0.75rem 1.25rem;
              background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);
              flex-shrink: 0;
              z-index: 10;
              gap: 1rem;
            }
            .iv-topbar-left { display: flex; align-items: center; gap: 0.85rem; flex: 1; min-width: 0; }
            .iv-topbar-title { min-width: 0; }
            .iv-topbar-title h3 {
              margin: 0; font-size: 0.95rem; font-weight: 700;
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              line-height: 1.3;
            }
            .iv-topbar-counter {
              font-size: 0.65rem; color: rgba(255,255,255,0.4);
              font-weight: 600; letter-spacing: 0.04em;
            }
            .iv-topbar-center { display: flex; align-items: center; }
            .iv-topbar-right { display: flex; align-items: center; gap: 0.15rem; flex-shrink: 0; }

            .iv-zoom-group {
              display: flex; align-items: center;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.06);
              border-radius: 100px;
              padding: 0.15rem;
              gap: 0.1rem;
            }
            .iv-zoom-pct {
              font-size: 0.7rem; font-weight: 600; color: rgba(255,255,255,0.5);
              width: 48px; text-align: center; font-variant-numeric: tabular-nums;
            }

            .iv-btn-icon {
              width: 34px; height: 34px;
              border-radius: 8px;
              background: transparent;
              border: none; color: rgba(255,255,255,0.55);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; transition: all 0.2s;
              font-size: 0.6rem; font-weight: 700;
            }
            .iv-btn-icon:hover { background: rgba(255,255,255,0.08); color: #fff; }
            .iv-btn-icon-sm { font-size: 0.55rem; }
            .iv-btn-active { background: rgba(99,102,241,0.2) !important; color: #818cf8 !important; }

            .iv-btn-ghost {
              width: 38px; height: 38px;
              border-radius: 10px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.06);
              color: rgba(255,255,255,0.7);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; transition: all 0.2s;
            }
            .iv-btn-ghost:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.2); color: #ef4444; }

            /* ================================================================
               KEYBOARD MODAL
               ================================================================ */
            .iv-keyboard-modal {
              position: absolute; inset: 0;
              background: rgba(0,0,0,0.6);
              backdrop-filter: blur(8px);
              z-index: 50;
              display: flex; align-items: center; justify-content: center;
            }
            .iv-keyboard-content {
              background: rgba(20,20,30,0.95);
              border: 1px solid rgba(255,255,255,0.06);
              border-radius: 16px;
              padding: 2rem 2.2rem;
              max-width: 440px; width: 90%;
              box-shadow: 0 32px 64px rgba(0,0,0,0.5);
            }
            .iv-keyboard-content h4 {
              margin: 0 0 1.2rem 0; font-size: 0.85rem; font-weight: 800;
              color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.1em;
            }
            .iv-kb-grid { display: flex; flex-direction: column; gap: 0.5rem; }
            .iv-kb-row { display: flex; align-items: center; gap: 1rem; }
            .iv-kb-keys {
              font-size: 0.7rem; font-weight: 700; color: #818cf8;
              background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.15);
              padding: 0.15rem 0.5rem; border-radius: 4px;
              min-width: 60px; text-align: center;
              font-family: 'SF Mono', 'Fira Code', monospace;
            }
            .iv-kb-desc { font-size: 0.78rem; color: rgba(255,255,255,0.65); }

            /* ================================================================
               MAIN STAGE
               ================================================================ */
            .iv-stage-wrap {
              flex: 1; display: flex; align-items: center; justify-content: center;
              position: relative; overflow: hidden; min-height: 0;
            }
            .iv-stage {
              width: 100%; height: 100%;
              display: flex; align-items: center; justify-content: center;
              padding: 1.5rem;
              overflow: hidden;
              position: relative;
            }
            .iv-main-img {
              max-width: 100%; max-height: 100%;
              object-fit: contain;
              transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
              pointer-events: none;
              will-change: transform;
              border-radius: 2px;
            }

            .iv-loader {
              position: absolute;
              color: rgba(255,255,255,0.2);
            }
            .iv-spin { animation: iv-rotate 0.8s linear infinite; }
            @keyframes iv-rotate { to { transform: rotate(360deg); } }

            .iv-error {
              display: flex; flex-direction: column; align-items: center; gap: 0.8rem;
              color: rgba(255,255,255,0.25);
            }
            .iv-error-icon { opacity: 0.5; }
            .iv-error p { margin: 0; font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.3); }
            .iv-error-link {
              display: inline-flex; align-items: center; gap: 0.35rem;
              padding: 0.35rem 0.8rem;
              background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.15);
              border-radius: 8px; color: #818cf8;
              font-size: 0.72rem; font-weight: 700; text-decoration: none;
              transition: all 0.2s;
            }
            .iv-error-link:hover { background: rgba(99,102,241,0.2); }

            .iv-progress-dots {
              position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%);
              display: flex; align-items: center; gap: 0.3rem;
              background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
              padding: 0.3rem 0.6rem; border-radius: 100px;
              border: 1px solid rgba(255,255,255,0.06);
            }
            .iv-pdot {
              width: 5px; height: 5px; border-radius: 50%;
              background: rgba(255,255,255,0.15); transition: all 0.3s;
            }
            .iv-pdot-active { background: #818cf8; width: 16px; border-radius: 4px; }
            .iv-pdot-more { font-size: 0.55rem; color: rgba(255,255,255,0.3); font-weight: 600; }

            .iv-nav {
              position: absolute; top: 50%; transform: translateY(-50%);
              z-index: 5;
              width: 48px; height: 48px;
              border-radius: 50%;
              background: rgba(0,0,0,0.4);
              backdrop-filter: blur(12px);
              border: 1px solid rgba(255,255,255,0.06);
              color: rgba(255,255,255,0.4);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; transition: all 0.25s;
              opacity: 0;
            }
            .iv-stage-wrap:hover .iv-nav { opacity: 1; }
            .iv-nav:hover { background: rgba(99,102,241,0.3); border-color: rgba(99,102,241,0.3); color: #fff; transform: translateY(-50%) scale(1.08); }
            .iv-nav-prev { left: 1rem; }
            .iv-nav-next { right: 1rem; }

            /* ================================================================
               INFO PANEL
               ================================================================ */
            .iv-info {
              position: absolute; top: 0; right: 0; bottom: 0;
              width: 340px;
              background: rgba(10, 10, 20, 0.85);
              backdrop-filter: blur(32px) saturate(1.2);
              border-left: 1px solid rgba(255,255,255,0.04);
              z-index: 20;
              overflow: hidden;
              display: flex; flex-direction: column;
            }
            .iv-info-scroll {
              padding: 1.5rem;
              overflow-y: auto;
              display: flex; flex-direction: column; gap: 1rem;
            }
            .iv-info-scroll::-webkit-scrollbar { width: 2px; }
            .iv-info-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

            .iv-info-header {
              display: flex; align-items: center; gap: 0.5rem;
              font-size: 0.6rem; font-weight: 700; color: rgba(255,255,255,0.3);
              text-transform: uppercase; letter-spacing: 0.1em;
              padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.04);
            }
            .iv-info-block { }
            .iv-info-block label {
              display: flex; align-items: center; gap: 0.35rem;
              font-size: 0.6rem; font-weight: 600; color: rgba(255,255,255,0.3);
              text-transform: uppercase; letter-spacing: 0.06em;
              margin-bottom: 0.25rem;
            }
            .iv-info-block h4 { margin: 0; font-size: 1rem; font-weight: 700; color: #fff; }
            .iv-info-block p { margin: 0; font-size: 0.78rem; color: rgba(255,255,255,0.6); }
            .iv-info-text { font-size: 0.75rem !important; line-height: 1.6 !important; color: rgba(255,255,255,0.5) !important; }
            .iv-info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
            .iv-info-divider { height: 1px; background: rgba(255,255,255,0.04); margin: 0.2rem 0; }
            .iv-info-drive-link {
              display: inline-flex; align-items: center; gap: 0.35rem;
              font-size: 0.72rem; font-weight: 600; color: #818cf8;
              text-decoration: none; transition: all 0.2s;
            }
            .iv-info-drive-link:hover { color: #a5b4fc; }

            /* ================================================================
               THUMBNAIL STRIP
               ================================================================ */
            .iv-thumbs-bar {
              flex-shrink: 0;
              background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%);
              padding: 0.75rem 0 1rem;
              display: flex; justify-content: center;
              z-index: 10;
            }
            .iv-thumbs-container {
              display: flex; gap: 0.5rem;
              overflow-x: auto;
              padding: 0 1rem;
              max-width: 100%;
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .iv-thumbs-container::-webkit-scrollbar { display: none; }

            .iv-thumb {
              flex-shrink: 0;
              width: 56px; height: 56px;
              border-radius: 10px;
              overflow: hidden;
              border: 2px solid transparent;
              padding: 0;
              cursor: pointer;
              transition: all 0.25s;
              opacity: 0.4;
              position: relative;
              background: rgba(255,255,255,0.02);
            }
            .iv-thumb:hover { opacity: 0.7; }
            .iv-thumb-active {
              opacity: 1 !important;
              border-color: #818cf8;
              box-shadow: 0 0 16px rgba(99,102,241,0.25);
              transform: scale(1.08);
            }
            .iv-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
            .iv-thumb-idx {
              position: absolute; bottom: 2px; right: 2px;
              width: 16px; height: 16px;
              display: flex; align-items: center; justify-content: center;
              background: rgba(0,0,0,0.6);
              border-radius: 4px;
              font-size: 0.45rem; font-weight: 700; color: rgba(255,255,255,0.7);
              backdrop-filter: blur(4px);
            }

            /* ================================================================
               RESPONSIVE
               ================================================================ */
            @media (max-width: 768px) {
              .iv-topbar { padding: 0.5rem 0.75rem; flex-wrap: wrap; gap: 0.5rem; }
              .iv-topbar-center { order: 3; width: 100%; justify-content: center; }
              .iv-topbar-right { gap: 0; }
              .iv-btn-icon { width: 30px; height: 30px; }
              .iv-btn-ghost { width: 32px; height: 32px; }
              .iv-stage { padding: 0.5rem; }
              .iv-nav { width: 36px; height: 36px; opacity: 1; }
              .iv-nav-prev { left: 0.5rem; }
              .iv-nav-next { right: 0.5rem; }
              .iv-info { width: 100%; }
              .iv-thumb { width: 44px; height: 44px; }
              .iv-zoom-pct { width: 36px; }
              .iv-keyboard-content { padding: 1.5rem; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
