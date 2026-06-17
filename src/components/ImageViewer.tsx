"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Download, Info,
  ImageOff, Play, Pause, Keyboard, ExternalLink, Loader2,
  RotateCw, RotateCcw, Sun, Contrast, Droplets, Grid3X3,
  Pipette, Monitor, Copy, Check, ChevronDown, Minus, Plus,
} from "lucide-react";
import { getDisplayUrl } from "@/lib/utils";

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  initialIndex?: number;
}

const SHORTCUTS = [
  { k: "← →", d: "Navigate" }, { k: "Esc", d: "Close" },
  { k: "+ / -", d: "Zoom" }, { k: "0", d: "Reset" },
  { k: "Space", d: "Slideshow" }, { k: "F", d: "Fullscreen" },
  { k: "I", d: "Info" }, { k: "R", d: "Rotate" },
  { k: "G", d: "Grid" }, { k: "A", d: "Adjust" },
  { k: "C", d: "Color pick" }, { k: "T", d: "Thumbs" },
  { k: "D", d: "Download" }, { k: "?", d: "Shortcuts" },
];

export default function ImageViewer({ isOpen, onClose, product, initialIndex = 0 }: ImageViewerProps) {
  const [idx, setIdx] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  const [info, setInfo] = useState(false);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState(false);
  const [dp, setDp] = useState({ x: 0, y: 0 });
  const [ds, setDs] = useState({ x: 0, y: 0 });
  const [swipe, setSwipe] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [kb, setKb] = useState(false);
  const [slide, setSlide] = useState(false);
  const [thumbs, setThumbs] = useState(true);
  const [grid, setGrid] = useState<0|1|2>(0);
  const [rot, setRot] = useState(0);
  const [bright, setBright] = useState(100);
  const [contr, setContr] = useState(100);
  const [sat, setSat] = useState(100);
  const [adj, setAdj] = useState(false);
  const [picker, setPicker] = useState(false);
  const [pColor, setPColor] = useState("");
  const [copied, setCopied] = useState(false);
  const picRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<any>(null);

  const items = useMemo(() => {
    if (!product) return [];
    if (product.variations?.length) return product.variations;
    if (product.rawUrls?.length) return product.rawUrls.map((u: string, i: number) => ({ url: u, id: product.rawIds?.[i] }));
    const u = product.mainDesignUrl || product.designUrl || product.url || product.thumbnailUrl;
    const id = product.mainDesignId || product.designId || product.id;
    return u ? [{ url: u, id }] : typeof product === 'string' ? [{ url: product }] : [];
  }, [product]);

  const total = items.length;
  const cur = items[idx];
  const src = useMemo(() => getDisplayUrl(cur?.url, cur?.id, 2000) || '', [cur]);

  useEffect(() => {
    if (isOpen) {
      setIdx(initialIndex); setZoom(1); setFit(true); setErr(false);
      setLoading(true); setDp({x:0,y:0}); setSwipe(0); setInfo(false);
      setRot(0); setBright(100); setContr(100); setSat(100);
      setGrid(0); setPicker(false); setAdj(false);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (slide && total > 1) {
      slideRef.current = setInterval(() => { setIdx(p => (p+1)%total); resetView(); }, 3000);
    }
    return () => { if (slideRef.current) clearInterval(slideRef.current); };
  }, [slide, total]);

  useEffect(() => {
    const fn = () => {};
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const resetView = () => { setZoom(1); setFit(true); setErr(false); setLoading(true); setDp({x:0,y:0}); setRot(0); };

  const go = useCallback((i: number) => {
    if (slide) setSlide(false);
    setIdx(Math.max(0, Math.min(i, total-1)));
    resetView();
  }, [slide, total]);

  const next = useCallback(() => total>1 && go((idx+1)%total), [total, idx, go]);
  const prev = useCallback(() => total>1 && go((idx-1+total)%total), [total, idx, go]);

  const dl = useCallback((s=2000) => { const u = getDisplayUrl(cur?.url, cur?.id, s); if (u) window.open(u, '_blank'); }, [cur]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (kb) { setKb(false); return; } if (info) { setInfo(false); return; } if (adj) { setAdj(false); return; } onClose(); return; }
      if (e.key === "ArrowRight") { next(); return; }
      if (e.key === "ArrowLeft") { prev(); return; }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(z=>Math.min(8,z+0.25)); setFit(false); return; }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); setZoom(z=>Math.max(0.5,z-0.25)); setFit(false); return; }
      if (e.key === "0") { resetView(); return; }
      if (e.key === " ") { e.preventDefault(); total>1 && setSlide(s=>!s); return; }
      if (e.key === "f" || e.key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); return; }
      if (e.key === "i" || e.key === "I") { setInfo(s=>!s); return; }
      if (e.key === "t" || e.key === "T") { setThumbs(s=>!s); return; }
      if (e.key === "g" || e.key === "G") { setGrid(g=>((g+1)%3) as 0|1|2); return; }
      if (e.key === "r" || e.key === "R") { setRot(r=>r+90); return; }
      if (e.key === "a" || e.key === "A") { setAdj(s=>!s); return; }
      if (e.key === "c" || e.key === "C") { setPicker(s=>!s); setPColor(""); return; }
      if (e.key === "d" || e.key === "D") { dl(); return; }
      if (e.key === "?") { setKb(s=>!s); return; }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, onClose, next, prev, dl, kb, info, adj, total]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(8, z + (e.deltaY>0?-0.1:0.1))));
    setFit(false);
  }, []);

  const md = useCallback((e: React.MouseEvent) => {
    if (zoom<=1 && fit) return;
    if (e.button!==0) return; e.preventDefault();
    setDrag(true); setDs({x: e.clientX-dp.x, y: e.clientY-dp.y});
  }, [zoom, dp, fit]);

  const mm = useCallback((e: React.MouseEvent) => {
    if (drag) setDp({x: e.clientX-ds.x, y: e.clientY-ds.y});
  }, [drag, ds]);

  const mu = useCallback(() => setDrag(false), []);

  const pickColor = useCallback((e: React.MouseEvent) => {
    if (!picker || !imgRef.current || !picRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    const ctx = picRef.current.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgRef.current, 0, 0, imgRef.current.naturalWidth, imgRef.current.naturalHeight);
    const px = ctx.getImageData(
      Math.round(((e.clientX-r.left)/r.width)*imgRef.current.naturalWidth),
      Math.round(((e.clientY-r.top)/r.height)*imgRef.current.naturalHeight), 1, 1
    ).data;
    setPColor('#'+[px[0],px[1],px[2]].map(v=>v.toString(16).padStart(2,'0')).join(''));
  }, [picker]);

  const tStart = useRef({x:0,y:0,t:0});

  const ts = useCallback((e: React.TouchEvent) => {
    if (e.touches.length===1) { tStart.current = {x:e.touches[0].clientX, y:e.touches[0].clientY, t:Date.now()}; setSwiping(true); }
  }, []);

  const tm = useCallback((e: React.TouchEvent) => {
    if (e.touches.length===1 && swiping && zoom<=1.1) setSwipe(e.touches[0].clientX-tStart.current.x);
  }, [swiping, zoom]);

  const te = useCallback(() => {
    if (swiping && zoom<=1.1) {
      const dx = swipe, dt = Date.now()-tStart.current.t;
      if (Math.abs(dx)>50 || (Math.abs(dx)>30 && dt<300)) dx<0 ? next() : prev();
    }
    setSwiping(false); setSwipe(0);
  }, [swiping, swipe, zoom, next, prev]);

  const oc = useCallback((e: React.MouseEvent) => { if (e.target===outRef.current) onClose(); }, [onClose]);

  const [vw, setVw] = useState(800);
  const [vh, setVh] = useState(600);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fn = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const filt = useMemo(() => `brightness(${bright/100}) contrast(${contr/100}) saturate(${sat/100})`, [bright, contr, sat]);
  const transf = useMemo(() => {
    const p: string[] = [];
    if (rot) p.push(`rotate(${rot}deg)`);
    const nw = imgRef.current?.naturalWidth || 100;
    const nh = imgRef.current?.naturalHeight || 100;
    const z = zoom * (fit ? Math.min((vw-80)/nw, (vh-120)/nh, 1) : 1);
    if (z) p.push(`scale(${z})`);
    if ((z>1||!fit) && (drag||dp.x||dp.y)) p.push(`translate(${dp.x/z||0}px, ${dp.y/z||0}px)`);
    return p.join(' ');
  }, [rot, zoom, fit, dp, drag, vw, vh]);
  const zoomed = zoom>1.05||!fit||rot!==0;

  return (
    <>
      <AnimatePresence>
        {isOpen && product && (
          <motion.div
            ref={outRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="iv"
            onClick={oc}
            onTouchStart={ts}
            onTouchMove={tm}
            onTouchEnd={te}
          >
            {/* TOP BAR */}
            <div className="iv-bar">
              <div className="iv-bl">
                <button onClick={onClose} className="iv-bt iv-bt-g" title="Close (Esc)">
                  <X size={18} />
                </button>
                <div className="iv-bt-t">
                  <h3>{product?.name||"Preview"}</h3>
                  <span className="iv-bt-c">{idx+1}/{total}</span>
                </div>
              </div>

              <div className="iv-bc">
                <div className="iv-tg">
                  <button onClick={()=>{setZoom(z=>Math.max(0.5,z-0.25)); setFit(false);}} className="iv-tb" title="Zoom Out (-)"><ZoomOut size={13}/></button>
                  <span className="iv-tl">{Math.round(zoom*(fit?Math.min(1,1):1)*100)}%</span>
                  <button onClick={()=>{setZoom(1); setFit(true);}} className="iv-tb" title="Reset (0)"><Monitor size={12}/></button>
                  <button onClick={()=>{setZoom(z=>Math.min(8,z+0.25)); setFit(false);}} className="iv-tb" title="Zoom In (+)"><ZoomIn size={13}/></button>
                  <span className="iv-sep" />
                  <button onClick={()=>setRot(r=>r-90)} className="iv-tb" title="Rotate Left"><RotateCcw size={13}/></button>
                  <button onClick={()=>setRot(r=>r+90)} className="iv-tb" title="Rotate Right (R)"><RotateCw size={13}/></button>
                </div>
              </div>

              <div className="iv-br">
                {total>1 && <button onClick={()=>setSlide(s=>!s)} className={`iv-tb ${slide?'iv-on':''}`} title="Slideshow (Space)">{slide?<Pause size={13}/>:<Play size={13}/>}</button>}
                <button onClick={()=>setGrid(g=>((g+1)%3)as 0|1|2)} className={`iv-tb ${grid?'iv-on':''}`} title="Grid (G)"><Grid3X3 size={13}/></button>
                <button onClick={()=>setAdj(s=>!s)} className={`iv-tb ${adj?'iv-on':''}`} title="Adjust (A)"><Sun size={13}/></button>
                <button onClick={()=>{setPicker(s=>!s); setPColor("");}} className={`iv-tb ${picker?'iv-on':''}`} title="Color (C)"><Pipette size={13}/></button>
                <button onClick={()=>setInfo(s=>!s)} className={`iv-tb ${info?'iv-on':''}`} title="Info (I)"><Info size={13}/></button>
                <span className="iv-sep" />
                <button onClick={()=>dl()} className="iv-tb" title="Download (D)"><Download size={13}/></button>
                <button onClick={()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()} className="iv-tb" title="Fullscreen (F)">
                  <Maximize2 size={13}/>
                </button>
                <button onClick={()=>setKb(s=>!s)} className="iv-tb" title="Shortcuts (?)"><Keyboard size={13}/></button>
              </div>
            </div>

            {/* ADJUSTMENTS */}
            <AnimatePresence>
              {adj && (
                <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="iv-adj">
                  <div className="iv-ai">
                    <div className="iv-af"><Sun size={11}/><span>Bright</span><input type="range" min="0" max="200" value={bright} onChange={e=>setBright(Number(e.target.value))} /><span className="iv-av">{bright}%</span></div>
                    <div className="iv-af"><Contrast size={11}/><span>Contrast</span><input type="range" min="0" max="200" value={contr} onChange={e=>setContr(Number(e.target.value))} /><span className="iv-av">{contr}%</span></div>
                    <div className="iv-af"><Droplets size={11}/><span>Saturate</span><input type="range" min="0" max="200" value={sat} onChange={e=>setSat(Number(e.target.value))} /><span className="iv-av">{sat}%</span></div>
                    <button onClick={()=>{setBright(100);setContr(100);setSat(100);}} className="iv-ar">Reset</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* STAGE */}
            <div className="iv-stage-wrap">
              {total>1 && <button className="iv-n iv-np" onClick={prev}><ChevronLeft size={24}/></button>}

              <div className="iv-stage" onWheel={handleWheel} onMouseDown={md} onMouseMove={mm} onMouseUp={mu} onMouseLeave={mu} onClick={pickColor}
                style={{cursor: picker?'crosshair':drag?'grabbing':zoomed?'grab':'default'}}>
                {loading && !err && <div className="iv-ld"><Loader2 size={32} className="iv-sp"/></div>}

                {err ? (
                  <div className="iv-er">
                    <ImageOff size={40}/>
                    <p>Failed to load</p>
                    {cur?.url && <a href={cur.url} target="_blank" className="iv-el"><ExternalLink size={11}/> Open in Drive</a>}
                  </div>
                ) : (
                  <>
                    <motion.img key={idx} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.2}}
                      ref={imgRef} src={src} className="iv-img" draggable={false}
                      style={{filter: filt, transform: transf}}
                      onError={()=>{setErr(true); setLoading(false);}}
                      onLoad={()=>{setErr(false); setLoading(false);}}
                    />
                    {/* Grid */}
                    {grid===1 && <svg className="iv-gr" viewBox="0 0 100 100">
                      <line x1="33.33" y1="0" x2="33.33" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
                      <line x1="66.67" y1="0" x2="66.67" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
                      <line x1="0" y1="33.33" x2="100" y2="33.33" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
                      <line x1="0" y1="66.67" x2="100" y2="66.67" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
                    </svg>}
                    {grid===2 && <svg className="iv-gr" viewBox="0 0 100 100">
                      <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
                      <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
                      <circle cx="50" cy="50" r="1.5" fill="rgba(255,255,255,0.3)"/>
                    </svg>}
                    {/* Color */}
                    {picker && pColor && <div className="iv-pc"><span className="iv-sw" style={{background:pColor}}/><span className="iv-hx">{pColor}</span>
                      <button onClick={()=>{navigator.clipboard.writeText(pColor).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);})}} className="iv-cpb">{copied?<Check size={10}/>:<Copy size={10}/>}</button>
                    </div>}
                    {/* Label */}
                    <div className="iv-lb"><span>{idx+1}</span></div>
                  </>
                )}
              </div>

              {total>1 && <button className="iv-n iv-nn" onClick={next}><ChevronRight size={24}/></button>}

              {/* INFO */}
              <AnimatePresence>
                {info && <motion.aside initial={{x:300}} animate={{x:0}} exit={{x:300}} transition={{type:'spring',damping:28,stiffness:280}} className="iv-inf">
                  <div className="iv-ii">
                    <div className="iv-is"><Info size={11}/><span>Details</span></div>
                    <div className="iv-ib"><span className="iv-il">Product</span><span className="iv-iv">{product?.name||"Untitled"}</span></div>
                    <div className="iv-ir"><div className="iv-ib"><span className="iv-il">Category</span><span className="iv-isv">{product?.category||"—"}</span></div>
                      <div className="iv-ib"><span className="iv-il">Status</span><span className="iv-isv">{product?.status||"—"}</span></div></div>
                    {product?.directions && <><div className="iv-id"/><div className="iv-ib"><span className="iv-il">Shoot</span><p className="iv-it">{product.directions.shoot||"None"}</p></div>
                      <div className="iv-ib"><span className="iv-il">Edit</span><p className="iv-it">{product.directions.edit||"None"}</p></div></>}
                    {cur?.url && <><div className="iv-id"/><a href={cur.url} target="_blank" className="iv-ilk"><ExternalLink size={10}/> Open in Drive</a></>}
                  </div>
                </motion.aside>}
              </AnimatePresence>

              {/* Shortcuts */}
              <AnimatePresence>
                {kb && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="iv-kb-bg" onClick={()=>setKb(false)}>
                  <div className="iv-kb" onClick={e=>e.stopPropagation()}>
                    <div className="iv-kh"><Keyboard size={12}/><span>Shortcuts</span><button onClick={()=>setKb(false)} className="iv-kc"><X size={12}/></button></div>
                    <div className="iv-kg">{SHORTCUTS.map(s=><div key={s.k} className="iv-kr"><span className="iv-kk">{s.k}</span><span className="iv-kd">{s.d}</span></div>)}</div>
                  </div>
                </motion.div>}
              </AnimatePresence>
            </div>

            {/* THUMBS */}
            {total>1 && thumbs && <div className="iv-tb-bar">
              <div className="iv-tb-in">{items.map((v:any,i:number)=>(
                <button key={i} className={`iv-tm ${i===idx?'iv-tm-on':''}`} onClick={()=>go(i)}>
                  <img src={getDisplayUrl(v.url,v.id,120)||''} alt="" loading="lazy"/>
                  <span className="iv-ti">{i+1}</span>
                </button>
              ))}</div>
            </div>}

            <canvas ref={picRef} style={{display:'none'}} />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .iv {
          position: fixed; inset: 0; z-index: 99999;
          background: rgba(0,0,0,0.94); backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          display: flex; flex-direction: column; color: #fff;
          user-select: none; -webkit-user-select: none;
          font-family: var(--font-sans,'Inter',system-ui,sans-serif);
        }
        .iv-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.9rem; background: linear-gradient(180deg,rgba(0,0,0,0.6),transparent); flex-shrink: 0; z-index: 20; gap: 0.75rem; }
        .iv-bl { display: flex; align-items: center; gap: 0.7rem; flex: 1; min-width: 0; }
        .iv-bt-t h3 { margin: 0; font-size: 0.85rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .iv-bt-c { font-size: 0.58rem; color: rgba(255,255,255,0.3); font-weight: 600; }
        .iv-bc { display: flex; align-items: center; }
        .iv-br { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
        .iv-tg { display: flex; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.03); border-radius: 100px; padding: 0.08rem; gap: 0; }
        .iv-sep { width: 1px; height: 16px; background: rgba(255,255,255,0.04); margin: 0 0.1rem; flex-shrink: 0; }
        .iv-tl { font-size: 0.6rem; font-weight: 600; color: rgba(255,255,255,0.35); width: 38px; text-align: center; }
        .iv-tb { width: 28px; height: 28px; border-radius: 7px; background: transparent; border: none; color: rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; font-size: 0.5rem; font-weight: 700; flex-shrink: 0; }
        .iv-tb:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .iv-on { background: rgba(99,102,241,0.15) !important; color: #a5b4fc !important; }
        .iv-bt-g { width: 32px; height: 32px; border-radius: 9px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
        .iv-bt-g:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.12); color: #ef4444; }

        .iv-adj { overflow: hidden; flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.02); }
        .iv-ai { display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 1rem; background: rgba(0,0,0,0.2); backdrop-filter: blur(12px); flex-wrap: wrap; }
        .iv-af { display: flex; align-items: center; gap: 0.35rem; color: rgba(255,255,255,0.4); font-size: 0.6rem; font-weight: 600; }
        .iv-af input[type=range] { -webkit-appearance: none; width: 70px; height: 3px; background: rgba(255,255,255,0.08); border-radius: 4px; outline: none; cursor: pointer; }
        .iv-af input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 11px; height: 11px; border-radius: 50%; background: #818cf8; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; }
        .iv-av { width: 28px; text-align: right; font-size: 0.58rem; color: rgba(255,255,255,0.25); }
        .iv-ar { padding: 0.2rem 0.5rem; border-radius: 5px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.03); color: rgba(255,255,255,0.25); font-size: 0.55rem; font-weight: 700; cursor: pointer; margin-left: auto; }
        .iv-ar:hover { background: rgba(255,255,255,0.06); color: #fff; }

        .iv-stage-wrap { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; min-height: 0; }
        .iv-stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 0.75rem; overflow: hidden; position: relative; }
        .iv-img { max-width: 100%; max-height: 100%; object-fit: contain; pointer-events: none; will-change: transform, filter; }
        .iv-ld { position: absolute; color: rgba(255,255,255,0.12); }
        .iv-sp { animation: iv-spin 0.8s linear infinite; }
        @keyframes iv-spin { to { transform: rotate(360deg); } }
        .iv-er { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; color: rgba(255,255,255,0.18); }
        .iv-er p { margin: 0; font-size: 0.78rem; font-weight: 600; color: rgba(255,255,255,0.2); }
        .iv-el { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.7rem; background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.1); border-radius: 7px; color: #818cf8; font-size: 0.65rem; font-weight: 700; text-decoration: none; }
        .iv-el:hover { background: rgba(99,102,241,0.12); }
        .iv-gr { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; }
        .iv-pc { position: absolute; z-index: 10; display: flex; align-items: center; gap: 0.3rem; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.04); border-radius: 7px; padding: 0.25rem 0.4rem; pointer-events: auto; left: 1rem; top: 1rem; }
        .iv-sw { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
        .iv-hx { font-size: 0.6rem; font-weight: 700; font-family: 'SF Mono','Fira Code',monospace; color: rgba(255,255,255,0.7); }
        .iv-cpb { width: 18px; height: 18px; border-radius: 3px; background: rgba(255,255,255,0.03); border: none; color: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .iv-cpb:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .iv-lb { position: absolute; bottom: 0.5rem; right: 0.75rem; font-size: 0.55rem; font-weight: 600; color: rgba(255,255,255,0.12); background: rgba(0,0,0,0.2); padding: 0.1rem 0.4rem; border-radius: 5px; pointer-events: none; }

        .iv-n { position: absolute; top: 50%; transform: translateY(-50%); z-index: 5; width: 38px; height: 38px; border-radius: 50%; background: rgba(0,0,0,0.3); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.03); color: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; opacity: 0; }
        .iv-stage-wrap:hover .iv-n { opacity: 1; }
        .iv-n:hover { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.15); color: #fff; transform: translateY(-50%) scale(1.05); }
        .iv-np { left: 0.6rem; }
        .iv-nn { right: 0.6rem; }

        .iv-inf { position: absolute; top: 0; right: 0; bottom: 0; width: 280px; background: rgba(8,8,20,0.85); backdrop-filter: blur(32px); border-left: 1px solid rgba(255,255,255,0.02); z-index: 20; overflow: hidden; display: flex; flex-direction: column; }
        .iv-ii { padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.7rem; }
        .iv-ii::-webkit-scrollbar { width: 2px; }
        .iv-ii::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); }
        .iv-is { display: flex; align-items: center; gap: 0.4rem; font-size: 0.52rem; font-weight: 700; color: rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 0.35rem; border-bottom: 1px solid rgba(255,255,255,0.02); }
        .iv-ib { display: flex; flex-direction: column; gap: 0.1rem; }
        .iv-il { font-size: 0.52rem; font-weight: 600; color: rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 0.05em; }
        .iv-iv { font-size: 0.88rem; font-weight: 700; color: #fff; }
        .iv-isv { font-size: 0.72rem; color: rgba(255,255,255,0.5); font-weight: 600; }
        .iv-ir { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        .iv-it { margin: 0; font-size: 0.65rem; line-height: 1.5; color: rgba(255,255,255,0.35); }
        .iv-id { height: 1px; background: rgba(255,255,255,0.02); margin: 0; }
        .iv-ilk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.62rem; font-weight: 600; color: #818cf8; text-decoration: none; }
        .iv-ilk:hover { color: #a5b4fc; }

        .iv-kb-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px); z-index: 50; display: flex; align-items: center; justify-content: center; }
        .iv-kb { background: rgba(10,10,24,0.95); border: 1px solid rgba(255,255,255,0.03); border-radius: 14px; max-width: 300px; width: 80%; box-shadow: 0 24px 48px rgba(0,0,0,0.5); overflow: hidden; }
        .iv-kh { display: flex; align-items: center; gap: 0.4rem; padding: 0.8rem 1rem; font-size: 0.65rem; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid rgba(255,255,255,0.02); }
        .iv-kc { margin-left: auto; width: 20px; height: 20px; border-radius: 5px; background: transparent; border: none; color: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .iv-kc:hover { background: rgba(255,255,255,0.04); color: #fff; }
        .iv-kg { padding: 0.6rem 1rem 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.1rem; }
        .iv-kr { display: flex; align-items: center; gap: 0.4rem; padding: 0.15rem 0; }
        .iv-kk { font-size: 0.55rem; font-weight: 700; color: #a5b4fc; background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.08); padding: 0.08rem 0.35rem; border-radius: 3px; min-width: 38px; text-align: center; font-family: 'SF Mono','Fira Code',monospace; }
        .iv-kd { font-size: 0.62rem; color: rgba(255,255,255,0.45); }

        .iv-tb-bar { flex-shrink: 0; background: linear-gradient(0deg,rgba(0,0,0,0.5),transparent); padding: 0.5rem 0 0.75rem; display: flex; justify-content: center; z-index: 10; }
        .iv-tb-in { display: flex; gap: 0.35rem; overflow-x: auto; padding: 0 0.75rem; max-width: 100%; scrollbar-width: none; }
        .iv-tb-in::-webkit-scrollbar { display: none; }
        .iv-tm { flex-shrink: 0; width: 44px; height: 44px; border-radius: 9px; overflow: hidden; border: 2px solid transparent; padding: 0; cursor: pointer; transition: all 0.15s; opacity: 0.3; position: relative; background: rgba(255,255,255,0.01); }
        .iv-tm:hover { opacity: 0.5; }
        .iv-tm-on { opacity: 1 !important; border-color: #818cf8; box-shadow: 0 0 10px rgba(99,102,241,0.15); transform: scale(1.05); }
        .iv-tm img { width: 100%; height: 100%; object-fit: cover; border-radius: 7px; }
        .iv-ti { position: absolute; bottom: 1px; right: 1px; width: 13px; height: 13px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); border-radius: 2px; font-size: 0.38rem; font-weight: 700; color: rgba(255,255,255,0.4); backdrop-filter: blur(3px); }

        @media (max-width: 768px) {
          .iv-bar { padding: 0.35rem 0.5rem; flex-wrap: wrap; gap: 0.3rem; }
          .iv-bc { order: 3; width: 100%; justify-content: center; }
          .iv-br { gap: 0; flex-wrap: wrap; justify-content: flex-end; }
          .iv-tb { width: 26px; height: 26px; }
          .iv-bt-g { width: 28px; height: 28px; }
          .iv-stage { padding: 0.25rem; }
          .iv-n { width: 32px; height: 32px; opacity: 1; }
          .iv-np { left: 0.2rem; }
          .iv-nn { right: 0.2rem; }
          .iv-inf { width: 100%; }
          .iv-tm { width: 36px; height: 36px; }
          .iv-af input[type=range] { width: 50px; }
          .iv-kg { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}

