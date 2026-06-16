"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDisplayUrl } from "@/lib/utils";
import {
  Search, X, Folder, FolderOpen,
  LayoutGrid, List, Columns3, Eye, Play,
  Sun, Moon,
} from "lucide-react";

const STATUS_MAP: Record<string, string> = {
  Published: "#34c759",
  "Pending Direction": "#ff9f0a",
  "Pending Shoot": "#0a84ff",
  "Pending Selection": "#bf5af2",
  "Pending Edit": "#ff9f0a",
  "Pending Review": "#64d2ff",
};

type ViewMode = "list" | "icon" | "column";
type SortField = "name" | "kind" | "date" | "status";
type SortDir = "asc" | "desc";

export default function MotherDrivePage() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [dark, setDark] = useState(true);
  const [preview, setPreview] = useState(true);
  const [sortF, setSortF] = useState<SortField>("date");
  const [sortD, setSortD] = useState<SortDir>("desc");
  const [catF, setCatF] = useState("all");
  const [ql, setQl] = useState<any>(null);
  const [vi, setVi] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const sref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, s => setData(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const sel = useMemo(() => data.find(d => d.id === selId) || null, [data, selId]);

  const filtered = useMemo(() => {
    let d = [...data];
    if (search) { const q = search.toLowerCase(); d = d.filter(x => x.name?.toLowerCase().includes(q) || x.category?.toLowerCase().includes(q) || x.status?.toLowerCase().includes(q)); }
    if (catF !== "all") d = d.filter(x => x.category === catF);
    d.sort((a, b) => {
      let va, vb;
      if (sortF === "name") { va = a.name; vb = b.name; }
      else if (sortF === "kind") { va = a.category; vb = b.category; }
      else if (sortF === "date") { va = a.updatedAt?.toDate?.()?.getTime() || 0; vb = b.updatedAt?.toDate?.()?.getTime() || 0; }
      else { va = a.status; vb = b.status; }
      return typeof va === "string" ? (sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortD === "asc" ? va - vb : vb - va);
    });
    return d;
  }, [data, search, catF, sortF, sortD]);

  const ts = (f: SortField) => { if (sortF === f) setSortD(d => d === "asc" ? "desc" : "asc"); else { setSortF(f); setSortD("asc"); } };
  const thu = (item: any) => getDisplayUrl(item.designUrl, item.designId, 120) || getDisplayUrl(item.thumbnailUrl) || undefined;
  const dt = (item: any) => {
    if (!item.updatedAt?.toDate) return "\u2014";
    const d = item.updatedAt.toDate();
    const h = Math.floor((Date.now() - d.getTime()) / 3600000);
    if (h < 1) return "Just now";
    if (h < 24) return `${h}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const hk = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { setQl(null); setVi(null); }
    if ((e.metaKey || e.ctrlKey) && e.key === "f") { e.preventDefault(); sref.current?.focus(); }
    if (e.key === " " && selId && !search) { e.preventDefault(); setQl(sel); }
    const i = filtered.findIndex(d => d.id === selId);
    if (e.key === "ArrowDown" && i < filtered.length - 1) { e.preventDefault(); setSelId(filtered[i + 1].id); }
    if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); setSelId(filtered[i - 1].id); }
  }, [filtered, selId, sel, search]);

  useEffect(() => { window.addEventListener("keydown", hk); return () => window.removeEventListener("keydown", hk); }, [hk]);

  return (
    <RoleGuard allowedRoles={["mother_drive"]}>
      <DashboardLayout>
        <div className="md">
            <div className="md-h">
              <div className="md-path">
                <span className="md-path-item md-path-root" onClick={() => setCatF("all")}>Mother Drive</span>
                {catF !== "all" && <><span className="md-path-sep">›</span><span className="md-path-item">{catF}</span></>}
              </div>
              <div className="md-hr">
                <div className="md-s">
                  <Search size={14} className="md-si" />
                  <input ref={sref} type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                  {search && <button className="md-sc" onClick={() => setSearch("")}><X size={14} /></button>}
                </div>
                <button className="md-b" onClick={() => setDark(d => !d)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
              </div>
            </div>
          <div className="md-tb">
            <div className="md-vs">
              <button className={`md-v ${view === "list" ? "md-va" : ""}`} onClick={() => setView("list")}><List size={15} /></button>
              <button className={`md-v ${view === "icon" ? "md-va" : ""}`} onClick={() => setView("icon")}><LayoutGrid size={15} /></button>
              <button className={`md-v ${view === "column" ? "md-va" : ""}`} onClick={() => setView("column")}><Columns3 size={15} /></button>
            </div>
            <div className="md-sep" />
            <span className="md-srt">Sort: {sortF === "name" ? "Name" : sortF === "kind" ? "Kind" : sortF === "date" ? "Date" : "Status"} <button className="md-sb" onClick={() => setSortD(d => d === "asc" ? "desc" : "asc")}>{sortD === "asc" ? "\u2191" : "\u2193"}</button></span>
            <div className="md-sp" />
            <span className="md-c">{filtered.length} items</span>
            <button className="md-b" onClick={() => setPreview(p => !p)}>{preview ? "Hide" : "Show"} Preview</button>
          </div>
          <div className="md-bd">
            <div className="md-catp">
              <div className="md-ch">Categories</div>
              <div className="md-ci" onClick={() => setCatF("all")}>{catF === "all" ? <FolderOpen size={14} /> : <Folder size={14} />}<span className={catF === "all" ? "md-cca" : ""}>All ({data.length})</span></div>
              {Array.from(new Set(data.map(d => d.category).filter(Boolean))).map(c => (
                <div key={c} className="md-ci" onClick={() => setCatF(c)}>{catF === c ? <FolderOpen size={14} /> : <Folder size={14} />}<span className={catF === c ? "md-cca" : ""}>{c} ({data.filter(d => d.category === c).length})</span></div>
              ))}
            </div>
            <div className="md-cx">
              {view === "list" && (
                <>
                  <div className="md-lh">
                    <span className="md-lc md-lc-n" onClick={() => ts("name")}>Name{sortF === "name" && <span className="md-sa">{sortD === "asc" ? "\u25B2" : "\u25BC"}</span>}</span>
                    <span className="md-lc md-lc-k" onClick={() => ts("kind")}>Kind{sortF === "kind" && <span className="md-sa">{sortD === "asc" ? "\u25B2" : "\u25BC"}</span>}</span>
                    <span className="md-lc md-lc-d" onClick={() => ts("date")}>Modified{sortF === "date" && <span className="md-sa">{sortD === "asc" ? "\u25B2" : "\u25BC"}</span>}</span>
                    <span className="md-lc md-lc-s" onClick={() => ts("status")}>Status{sortF === "status" && <span className="md-sa">{sortD === "asc" ? "\u25B2" : "\u25BC"}</span>}</span>
                  </div>
                  <div className="md-l" ref={ref}>
                    {filtered.map(item => (
                      <div key={item.id} className={`md-r ${selId === item.id ? "md-ra" : ""}`}
                        onClick={() => setSelId(item.id)}
                        onDoubleClick={() => setPreview(true)}
                        onContextMenu={e => { e.preventDefault(); }}>
                        <span className="md-cn">{thu(item) ? <img src={thu(item)} alt="" className="md-th" /> : <FolderOpen size={14} />}<span className="md-rn">{item.name}</span></span>
                        <span className="md-ck">{item.category ? <button className="md-cat-btn" onClick={e => { e.stopPropagation(); setCatF(item.category); }}>{item.category}</button> : "\u2014"}</span>
                        <span className="md-cd2">{dt(item)}</span>
                        <span className="md-cs"><span className="md-st" style={{ background: `${STATUS_MAP[item.status] || "#8e8e93"}18`, color: STATUS_MAP[item.status] || "#8e8e93", borderColor: `${STATUS_MAP[item.status] || "#8e8e93"}30` }}><span className="md-sd" style={{ background: STATUS_MAP[item.status] || "#8e8e93" }} />{item.status}</span></span>
                      </div>
                    ))}
                    {filtered.length === 0 && <div className="md-e">No items</div>}
                  </div>
                </>
              )}
              {view === "icon" && (
                <div className="md-icv">
                  {filtered.map(item => (
                    <div key={item.id} className={`md-ic ${selId === item.id ? "md-ia" : ""}`}
                      onClick={() => setSelId(item.id)}
                      onDoubleClick={() => setPreview(true)}
                      onContextMenu={e => { e.preventDefault(); }}>
                      <div className="md-it">{thu(item) ? <img src={thu(item)} alt="" /> : <FolderOpen size={24} />}</div>
                      <span className="md-il">{item.name}</span>
                      <span className="md-id" style={{ background: STATUS_MAP[item.status] || "#8e8e93" }} />
                    </div>
                  ))}
                </div>
              )}
              {view === "column" && (
                <div className="md-cv">
                  {sel ? (
                    <div className="md-cp md-cpd">
                      <div className="md-ch">Details</div>
                      <div className="md-cdi">{thu(sel) ? <img src={thu(sel)} alt="" /> : <FolderOpen size={32} />}</div>
                      <div className="md-cdt"><div><span>Modified</span><span>{dt(sel)}</span></div><div><span>Status</span><span>{sel.status}</span></div><div><span>Category</span><span>{sel.category || "\u2014"}</span></div></div>
                    </div>
                  ) : (
                    <div className="md-e">Select an item</div>
                  )}
                </div>
              )}
              <div className="md-sb"><span>{filtered.length} items</span></div>
            </div>
            {preview && sel && (
              <div className="md-pv">
                <div className="md-ph"><span>Preview</span><button className="md-b md-bs" onClick={() => setPreview(false)}><X size={14} /></button></div>
                <div className="md-psc">
                  <div className="md-pi" onClick={() => { const u = getDisplayUrl(sel.mainDesignUrl || sel.designUrl, sel.mainDesignId || sel.designId, 1200); if (u) setVi(u); }}>
                    {getDisplayUrl(sel.mainDesignUrl || sel.designUrl, sel.mainDesignId || sel.designId, 400) ? <img src={getDisplayUrl(sel.mainDesignUrl || sel.designUrl, (sel.mainDesignId || sel.designId) as string, 400) || ""} alt="" /> : sel.thumbnailUrl ? <img src={getDisplayUrl(sel.thumbnailUrl) || ""} alt="" /> : <FolderOpen size={32} />}
                  </div>
                  <h4 className="md-pn">{sel.name}</h4>
                  <span className="md-st" style={{ background: `${STATUS_MAP[sel.status] || "#8e8e93"}18`, color: STATUS_MAP[sel.status] || "#8e8e93", borderColor: `${STATUS_MAP[sel.status] || "#8e8e93"}30` }}><span className="md-sd" style={{ background: STATUS_MAP[sel.status] || "#8e8e93" }} />{sel.status}</span>
                  <div className="md-ps"><div className="md-psh">Info</div><div className="md-pi"><div><span>Modified</span><span>{dt(sel)}</span></div><div><span>Category</span><span>{sel.category || "\u2014"}</span></div></div></div>
                  <div className="md-ps"><div className="md-psh">Links</div><div className="md-pl">{sel.designUrl && <a href={sel.designUrl} target="_blank" className="md-pli"><Eye size={12} /> Design</a>}{sel.editedUrl && <a href={sel.editedUrl} target="_blank" className="md-pli"><Play size={12} /> Final</a>}</div></div>
                  <div className="md-ps"><div className="md-psh">Instructions</div><div className="md-pd"><div><span>Shoot</span><p>{sel.directions?.shoot || "\u2014"}</p></div><div><span>Edit</span><p>{sel.directions?.edit || "\u2014"}</p></div></div></div>
                </div>
              </div>
            )}
            {preview && !sel && (
              <div className="md-pv md-pe"><div className="md-ph"><span>Preview</span></div><div className="md-pemp"><FolderOpen size={28} /><p>Select an item</p></div></div>
            )}
          </div>
        </div>
        {vi && (
          <div className="md-vol" onClick={() => setVi(null)}>
            <div className="md-vow" onClick={e => e.stopPropagation()}>
              <button className="md-vc" onClick={() => setVi(null)}><X size={20} /></button>
              <img src={vi} alt="" />
            </div>
          </div>
        )}
        {ql && (
          <div className="md-qlo" onClick={() => setQl(null)}>
            <div className="md-qlw" onClick={e => e.stopPropagation()}>
              <button className="md-vc" onClick={() => setQl(null)}><X size={20} /></button>
              <div className="md-qli">{getDisplayUrl(ql.mainDesignUrl || ql.designUrl, ql.mainDesignId || ql.designId, 1200) ? <img src={getDisplayUrl(ql.mainDesignUrl || ql.designUrl, (ql.mainDesignId || ql.designId) as string, 1200) || ""} alt="" /> : <FolderOpen size={48} />}</div>
            </div>
          </div>
        )}
        <style jsx>{`
          .md { --bg: #1a1a2e; --bg2: #252535; --bg3: #2a2a3a; --tx: #ebebf5; --tx2: #98989f; --tx3: #636366; --bd: rgba(255,255,255,0.06); --sel: rgba(10,132,255,0.25); --selt: #0a84ff; --hv: rgba(255,255,255,0.04); font-family: -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif; color: var(--tx); background: var(--bg); display: flex; flex-direction: column; margin: -2.5rem; min-height: 100vh; }
          .md-h { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--bg2); border-bottom: 1px solid var(--bd); flex-shrink: 0; }
          .md-path { display: flex; align-items: center; gap: 0.3rem; font-size: 13px; color: var(--tx2); }
          .md-path-item { cursor: pointer; transition: color 0.15s; }
          .md-path-item:hover { color: var(--tx); }
          .md-path-root { font-weight: 600; color: var(--tx); }
          .md-path-sep { color: var(--tx3); font-size: 16px; }
          .md-t { margin: 0; font-size: 16px; font-weight: 600; }
          .md-hr { display: flex; align-items: center; gap: 0.75rem; }
          .md-s { display: flex; align-items: center; gap: 0.4rem; background: var(--bg3); border: 1px solid var(--bd); border-radius: 8px; padding: 0.3rem 0.6rem; width: 200px; }
          .md-s input { background: none; border: none; outline: none; color: var(--tx); font-size: 12px; font-family: inherit; width: 100%; }
          .md-s input::placeholder { color: var(--tx3); }
          .md-si { color: var(--tx3); flex-shrink: 0; }
          .md-sc { background: none; border: none; color: var(--tx3); cursor: pointer; padding: 0; display: flex; }
          .md-b { background: none; border: none; color: var(--tx2); cursor: pointer; padding: 0.3rem 0.5rem; border-radius: 6px; font-size: 12px; transition: all 0.15s; display: flex; align-items: center; gap: 0.3rem; }
          .md-b:hover { background: var(--hv); color: var(--tx); }
          .md-bs { padding: 0.2rem; }
          .md-tb { height: 36px; display: flex; align-items: center; gap: 0.3rem; padding: 0 0.75rem; background: var(--bg2); border-bottom: 1px solid var(--bd); flex-shrink: 0; font-size: 12px; }
          .md-vs { display: flex; gap: 1px; background: var(--bd); border-radius: 6px; padding: 1px; }
          .md-v { width: 26px; height: 24px; display: flex; align-items: center; justify-content: center; background: none; border: none; color: var(--tx2); border-radius: 5px; cursor: pointer; transition: all 0.15s; }
          .md-v:hover { color: var(--tx); }
          .md-va { background: var(--bg3) !important; color: var(--selt) !important; }
          .md-sep { width: 1px; height: 16px; background: var(--bd); margin: 0 0.2rem; }
          .md-srt { color: var(--tx2); white-space: nowrap; }
          .md-sb { background: none; border: none; color: var(--tx2); cursor: pointer; padding: 0; font-size: 10px; }
          .md-sp { flex: 1; }
          .md-c { color: var(--tx3); font-size: 12px; white-space: nowrap; margin-right: 0.3rem; }
          .md-bd { display: flex; flex: 1; min-height: 0; }
          .md-catp { width: 200px; flex-shrink: 0; border-right: 1px solid var(--bd); overflow-y: auto; display: flex; flex-direction: column; background: var(--bg2); }
          .md-catp::-webkit-scrollbar { width: 3px; }
          .md-catp::-webkit-scrollbar-thumb { background: var(--bd); border-radius: 3px; }
          .md-cx { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--bg3); }
          .md-lh { display: flex; padding: 0 0.75rem; height: 28px; align-items: center; border-bottom: 1px solid var(--bd); font-size: 11px; font-weight: 600; color: var(--tx3); text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0; }
          .md-lc { cursor: pointer; display: flex; align-items: center; gap: 0.2rem; user-select: none; }
          .md-lc:hover { color: var(--tx); }
          .md-sa { font-size: 8px; }
          .md-lc-n { flex: 1; min-width: 0; }
          .md-lc-k { width: 100px; flex-shrink: 0; }
          .md-lc-d { width: 110px; flex-shrink: 0; }
          .md-lc-s { width: 90px; flex-shrink: 0; }
          .md-l { flex: 1; overflow-y: auto; }
          .md-l::-webkit-scrollbar { width: 4px; }
          .md-l::-webkit-scrollbar-thumb { background: var(--bd); border-radius: 3px; }
          .md-r { display: flex; align-items: center; padding: 0 0.75rem; height: 36px; cursor: pointer; transition: background 0.1s; font-size: 12px; }
          .md-r:hover { background: var(--hv); }
          .md-ra { background: var(--sel) !important; }
          .md-cn { display: flex; align-items: center; gap: 0.4rem; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .md-ck { width: 100px; flex-shrink: 0; color: var(--tx2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .md-cat-btn { background: none; border: none; color: var(--selt); cursor: pointer; padding: 0; font-size: 12px; font-family: inherit; text-decoration: none; transition: color 0.15s; }
          .md-cat-btn:hover { color: #5ac8fa; text-decoration: underline; }
          .md-cd2 { width: 110px; flex-shrink: 0; color: var(--tx2); font-size: 11px; }
          .md-cs { width: 90px; flex-shrink: 0; }
          .md-th { width: 18px; height: 18px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
          .md-rn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .md-st { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 10px; font-weight: 500; border: 1px solid; white-space: nowrap; }
          .md-sd { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
          .md-e { padding: 2rem; text-align: center; color: var(--tx3); font-size: 13px; }
          .md-icv { flex: 1; overflow-y: auto; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 0.5rem; padding: 0.75rem; }
          .md-icv::-webkit-scrollbar { width: 4px; }
          .md-icv::-webkit-scrollbar-thumb { background: var(--bd); border-radius: 3px; }
          .md-ic { width: 90px; text-align: center; padding: 0.4rem; border-radius: 8px; cursor: pointer; transition: background 0.1s; position: relative; }
          .md-ic:hover { background: var(--hv); }
          .md-ia { background: var(--sel) !important; }
          .md-it { width: 72px; height: 72px; margin: 0 auto 0.3rem; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid var(--bd); display: flex; align-items: center; justify-content: center; }
          .md-it img { width: 100%; height: 100%; object-fit: cover; }
          .md-il { display: block; font-size: 11px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .md-id { position: absolute; top: 6px; right: 8px; width: 7px; height: 7px; border-radius: 50%; }
          .md-cv { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; }
          .md-cp { width: 200px; flex-shrink: 0; border-right: 1px solid var(--bd); overflow-y: auto; display: flex; flex-direction: column; }
          .md-cp:last-child { border-right: none; flex: 1; width: auto; }
          .md-cp::-webkit-scrollbar { width: 3px; }
          .md-cp::-webkit-scrollbar-thumb { background: var(--bd); border-radius: 3px; }
          .md-ch { padding: 0.5rem 0.75rem; font-size: 11px; font-weight: 600; color: var(--tx3); text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--bd); flex-shrink: 0; }
          .md-ci { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.75rem; font-size: 12px; cursor: pointer; transition: background 0.1s; cursor: pointer; }
          .md-ci:hover { background: var(--hv); }
          .md-cca { color: var(--selt); font-weight: 500; background: var(--sel) !important; }
          .md-cih { width: 16px; height: 16px; border-radius: 3px; object-fit: cover; }
          .md-cpd { padding: 0.75rem; overflow-y: auto; }
          .md-cdi { width: 100%; height: 120px; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid var(--bd); display: flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; }
          .md-cdi img { width: 100%; height: 100%; object-fit: contain; }
          .md-cdt { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
          .md-cdt > div { display: flex; justify-content: space-between; font-size: 12px; }
          .md-cdt > div > span:first-child { color: var(--tx3); }
          .md-sb { height: 24px; display: flex; align-items: center; gap: 0.3rem; padding: 0 0.75rem; background: var(--bg2); border-top: 1px solid var(--bd); font-size: 12px; color: var(--tx2); flex-shrink: 0; }
          .md-pv { width: 260px; flex-shrink: 0; background: var(--bg2); border-left: 1px solid var(--bd); display: flex; flex-direction: column; overflow: hidden; }
          .md-ph { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--bd); font-size: 11px; font-weight: 600; color: var(--tx3); text-transform: uppercase; letter-spacing: 0.06em; flex-shrink: 0; }
          .md-psc { flex: 1; overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; }
          .md-psc::-webkit-scrollbar { width: 3px; }
          .md-psc::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 3px; }
          .md-pi { width: 100%; height: 140px; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid var(--bd); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: border-color 0.15s; }
          .md-pi:hover { border-color: var(--selt); }
          .md-pi img { width: 100%; height: 100%; object-fit: contain; }
          .md-pn { font-size: 13px; font-weight: 600; margin: 0; }
          .md-ps { }
          .md-psh { font-size: 11px; font-weight: 600; color: var(--tx3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.4rem; }
          .md-pi > div { display: flex; justify-content: space-between; font-size: 12px; }
          .md-pi > div > span:first-child { color: var(--tx3); }
          .md-pl { display: flex; flex-wrap: wrap; gap: 0.25rem; }
          .md-pli { display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: var(--hv); border: 1px solid var(--bd); color: var(--tx2); font-size: 11px; text-decoration: none; cursor: pointer; transition: all 0.15s; font-family: inherit; }
          .md-pli:hover { color: var(--selt); border-color: var(--selt); }
          .md-pd { display: flex; flex-direction: column; gap: 0.4rem; }
          .md-pd > div > span { font-size: 11px; font-weight: 600; color: var(--tx3); text-transform: uppercase; display: block; margin-bottom: 0.2rem; }
          .md-pd p { margin: 0; font-size: 12px; color: var(--tx); line-height: 1.4; }
          .md-pemp { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; flex: 1; color: var(--tx3); }
          .md-pemp p { margin: 0; font-size: 12px; }
          .md-vol { position: fixed; inset: 0; z-index: 99998; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; }
          .md-vow { position: relative; max-width: 90vw; max-height: 90vh; }
          .md-vow img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }
          .md-vc { position: absolute; top: -2.5rem; right: 0; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.1); border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
          .md-qlo { position: fixed; inset: 0; z-index: 99998; background: rgba(0,0,0,0.7); backdrop-filter: blur(40px); display: flex; align-items: center; justify-content: center; }
          .md-qlw { background: rgba(30,30,35,0.95); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; box-shadow: 0 40px 80px rgba(0,0,0,0.5); overflow: hidden; max-width: 80vw; max-height: 80vh; display: flex; flex-direction: column; position: relative; }
          .md-qli { display: flex; align-items: center; justify-content: center; padding: 2rem; }
          .md-qli img { max-width: 70vw; max-height: 65vh; object-fit: contain; }
          @media (max-width: 1100px) { .md-pv { display: none; } }
          @media (max-width: 1024px) { .md { margin: -2.5rem; } }
          @media (max-width: 768px) { .md { margin: -1.5rem; } .md-catp { display: none; } .md-s { width: 120px; } .md-lc-d { display: none; } .md-cd2 { display: none; } }
        `}</style>
      </DashboardLayout>
    </RoleGuard>
  );
}
