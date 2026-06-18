"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight, ImageOff, Loader2 } from "lucide-react";
import { getDisplayUrl } from "@/lib/utils";

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  initialIndex?: number;
}

export default function ImageViewer({ isOpen, onClose, product, initialIndex = 0 }: ImageViewerProps) {
  const [idx, setIdx] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState(false);
  const [dp, setDp] = useState({ x: 0, y: 0 });
  const [ds, setDs] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const outRef = useRef<HTMLDivElement>(null);

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
    if (!isOpen) return;
    setIdx(initialIndex); setZoom(1); setErr(false);
    setLoading(true); setDp({x:0,y:0});
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight") { if (total>1) { setIdx(p=>(p+1)%total); setZoom(1); setDp({x:0,y:0}); } return; }
      if (e.key === "ArrowLeft") { if (total>1) { setIdx(p=>(p-1+total)%total); setZoom(1); setDp({x:0,y:0}); } return; }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(z=>Math.min(8,z+0.25)); return; }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); setZoom(z=>Math.max(0.5,z-0.25)); return; }
      if (e.key === "0") { setZoom(1); setDp({x:0,y:0}); return; }
      if (e.key === "d" || e.key === "D") { dl(); return; }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, onClose, total, cur]);

  const md = useCallback((e: React.MouseEvent) => {
    if (zoom<=1.05) return;
    if (e.button!==0) return; e.preventDefault();
    setDrag(true); setDs({x: e.clientX-dp.x, y: e.clientY-dp.y});
  }, [zoom, dp]);

  const mm = useCallback((e: React.MouseEvent) => {
    if (drag) setDp({x: e.clientX-ds.x, y: e.clientY-ds.y});
  }, [drag, ds]);

  const mu = useCallback(() => setDrag(false), []);

  const zoomed = zoom>1.05;
  const hasPan = zoomed || dp.x || dp.y;
  const transf = zoom!==1||hasPan ? `scale(${zoom})${hasPan ? ` translate(${dp.x/zoom||0}px,${dp.y/zoom||0}px)` : ''}` : '';

  const dl = () => {
    const target = cur?.id || cur?.url;
    if (!target) return;
    const match = target.match(/[-\w]{25,}/);
    if (match) {
      const dUrl = `/api/download?id=${match[0]}&name=${encodeURIComponent(product?.name || 'download')}`;
      window.open(dUrl, '_blank');
    } else {
      const u = getDisplayUrl(cur?.url, cur?.id, 2000);
      if (u) window.open(u, '_blank');
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="iv" ref={outRef} onClick={e=>{if(e.target===outRef.current) onClose();}}>
      {/* TOP BAR */}
      <div className="iv-bar">
        <div className="iv-bl">
          <button onClick={onClose} className="iv-bt"><X size={18}/></button>
          <div><h3 className="iv-tt">{product?.name||"Preview"}</h3><span className="iv-tc">{idx+1}/{total}</span></div>
        </div>
        <div className="iv-br">
          <div className="iv-tg">
            <button onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))} className="iv-tb"><ZoomOut size={13}/></button>
            <span className="iv-tl">{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(z=>Math.min(8,z+0.25))} className="iv-tb"><ZoomIn size={13}/></button>
          </div>
          <span className="iv-s"/>
          <button onClick={dl} className="iv-tb"><Download size={13}/></button>
        </div>
      </div>

      {/* STAGE */}
      <div className="iv-w">
        {total>1&&<button className="iv-n iv-np" onClick={()=>{setIdx(p=>(p-1+total)%total);setZoom(1);setDp({x:0,y:0});}}><ChevronLeft size={24}/></button>}
        <div className="iv-st" onWheel={e=>{e.preventDefault();setZoom(z=>Math.max(0.5,Math.min(8,z+(e.deltaY>0?-0.1:0.1))));}}
          onMouseDown={md} onMouseMove={mm} onMouseUp={mu} onMouseLeave={mu}
          style={{cursor:drag?'grabbing':zoomed?'grab':'default'}}>
          {loading&&!err&&<div className="iv-ld"><Loader2 size={32} className="iv-sp"/></div>}
          {err?<div className="iv-er"><ImageOff size={40}/><p>Failed to load</p></div>
          :<img ref={imgRef} src={src} className="iv-img" draggable={false}
            style={transf ? {transform:transf} : {}}
            onError={()=>{setErr(true);setLoading(false);}} onLoad={()=>{setErr(false);setLoading(false);}}/>}
        </div>
        {total>1&&<button className="iv-n iv-nn" onClick={()=>{setIdx(p=>(p+1)%total);setZoom(1);setDp({x:0,y:0});}}><ChevronRight size={24}/></button>}
      </div>

      {/* THUMBNAILS */}
      {total>1&&<div className="iv-tbr"><div className="iv-tbi">{items.map((v:any,i:number)=>(
        <button key={i} className={`iv-tm ${i===idx?'iv-tm-on':''}`} onClick={()=>{setIdx(i);setZoom(1);setDp({x:0,y:0});}}>
          <img src={getDisplayUrl(v.url,v.id,120)||''} alt="" loading="lazy"/>
        </button>
      ))}</div></div>}
    </div>
  );
}
