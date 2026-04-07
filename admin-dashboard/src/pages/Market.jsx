import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, LineChart, Line,
  RadialBarChart, RadialBar, Treemap, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Brush, ReferenceLine, Cell, PieChart, Pie, FunnelChart, Funnel,
  LabelList, Sankey
} from "recharts";
import {
  Activity, AlertCircle, BarChart2, BarChart3, Bug, ChevronDown,
  ChevronRight, ChevronUp, CircleDollarSign, Droplets,
  Leaf, MapPin, Package, RefreshCw, Search, Shield, Sprout,
  Table, TrendingDown, TrendingUp, Warehouse, Zap, Eye, X,
  Tractor, Layers, Wind, Thermometer, Info, Flame, Droplet,
  ArrowUpRight, ArrowDownRight, Star, Globe, Clock, Database,
  ChevronLeft, Maximize2, LayoutGrid, List, Cpu, Wifi
} from "lucide-react";
import { apiTry, withQuery } from "../api/client";

/* ═══════════════════════════════════════════════════════════════
   TAB CONFIG
═══════════════════════════════════════════════════════════════ */
const TABS = [
  { id:"prices",     label:"Mandi Prices",    icon:CircleDollarSign, accent:"#22c55e", glow:"rgba(34,197,94,0.3)", bg:"rgba(34,197,94,0.08)" },
  { id:"msp",        label:"MSP",             icon:TrendingUp,        accent:"#22c55e", glow:"rgba(34,197,94,0.3)", bg:"rgba(34,197,94,0.08)" },
  { id:"trends",     label:"Price Trends",    icon:BarChart2,         accent:"#22c55e", glow:"rgba(34,197,94,0.3)", bg:"rgba(34,197,94,0.08)" },
  { id:"mandis",     label:"Mandis",          icon:MapPin,            accent:"#22c55e", glow:"rgba(34,197,94,0.3)", bg:"rgba(34,197,94,0.08)" },
  { id:"cold",       label:"Cold Storage",    icon:Warehouse,         accent:"#22c55e", glow:"rgba(34,197,94,0.3)", bg:"rgba(34,197,94,0.08)" },
  { id:"reservoir",  label:"Reservoir",       icon:Droplets,          accent:"#22c55e", glow:"rgba(34,197,94,0.3)", bg:"rgba(34,197,94,0.08)" },
  { id:"fasal",      label:"FASAL",           icon:Sprout,            accent:"#22c55e", glow:"rgba(34,197,94,0.3)", bg:"rgba(34,197,94,0.08)" },
  { id:"fertilizer", label:"Fertilizer",      icon:Leaf,              accent:"#22c55e", glow:"rgba(34,197,94,0.3)", bg:"rgba(34,197,94,0.08)" },
  { id:"pesticide",  label:"Pesticide",       icon:Bug,               accent:"#22c55e", glow:"rgba(34,197,94,0.3)", bg:"rgba(34,197,94,0.08)" },
  { id:"equipment",  label:"Equipment",       icon:Tractor,           accent:"#22c55e", glow:"rgba(34,197,94,0.3)", bg:"rgba(34,197,94,0.08)" },
];

const PALETTE = [
  "#22c55e","#16a34a","#15803d","#4ade80","#86efac","#14532d",
  "#65a30d","#84cc16","#166534","#052e16","#10b981","#34d399",
  "#2f855a","#3f6212","#4d7c0f","#6ee7b7","#1f7a1f","#0b3d0b"
];

/* ═══════════════════════════════════════════════════════════════
   INJECT STYLES ONCE
═══════════════════════════════════════════════════════════════ */
const STYLE_ID = "mkt-v4-styles";
const MARKET_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Syne:wght@400;600;700;800&family=DM+Serif+Display&display=swap');

    @keyframes shimmer        { 0%{background-position:-800px 0} 100%{background-position:800px 0} }
    @keyframes fadeUp         { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
    @keyframes fadeIn         { from{opacity:0} to{opacity:1} }
    @keyframes slideIn        { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:none} }
    @keyframes pulse-ring     { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.5);opacity:0} }
    @keyframes ticker-scroll  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes spin           { to{transform:rotate(360deg)} }
    @keyframes count-up       { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
    @keyframes bar-grow       { from{transform:scaleY(0)} to{transform:scaleY(1)} }
    @keyframes glow-pulse     { 0%,100%{opacity:0.6} 50%{opacity:1} }
    @keyframes float          { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes scan-line      { 0%{top:0%} 100%{top:100%} }
    @keyframes number-tick    { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }

    .mkt-skeleton { background:linear-gradient(90deg,var(--soft) 25%,var(--soft-strong) 50%,var(--soft) 75%); background-size:800px 100%; animation:shimmer 1.5s ease-in-out infinite; border-radius:8px; }
    .mkt-fade-up  { animation:fadeUp 0.42s cubic-bezier(.16,1,.3,1) both; }
    .mkt-fade-in  { animation:fadeIn 0.28s ease both; }
    .mkt-slide-in { animation:slideIn 0.32s cubic-bezier(.16,1,.3,1) both; }
    .mkt-spin     { animation:spin 1s linear infinite; }
    .mkt-float    { animation:float 3s ease-in-out infinite; }

    .mkt-tab-btn {
      position:relative; display:flex; align-items:center; gap:7px; padding:8px 15px;
      border-radius:9px; font-size:11.5px; font-weight:600; white-space:nowrap;
      flex-shrink:0; cursor:pointer; border:none; font-family:'Syne',sans-serif;
      transition:all 0.2s ease; background:transparent; color:var(--muted);
    }
    .mkt-tab-btn:hover { background:var(--soft-strong); color:var(--text); }
    .mkt-tab-btn.active { color:var(--text); }
    .mkt-tab-btn.active::after {
      content:''; position:absolute; bottom:-1px; left:14px; right:14px; height:2px;
      border-radius:1px; background:var(--tab-accent,#22c55e);
      box-shadow:0 0 8px var(--tab-accent,#22c55e);
    }

    .mkt-btn {
      display:flex; align-items:center; gap:7px; padding:7px 14px; border-radius:9px;
      font-size:11px; font-family:'Syne',sans-serif; cursor:pointer;
      border:1px solid var(--soft-strong); background:var(--soft);
      color:var(--text); transition:all 0.15s; outline:none;
    }
    .mkt-btn:hover { background:var(--soft-strong); border-color:var(--faint); color:var(--text); }
    .mkt-btn.active-btn { background:rgba(34,197,94,0.12); border-color:rgba(34,197,94,0.4); color:#22c55e; }

    .mkt-sel {
      background:var(--surface); color:var(--text); border:1px solid var(--soft-strong);
      border-radius:9px; padding:8px 12px; font-size:11px; font-family:'Syne',sans-serif; outline:none;
      cursor:pointer;
    }
    .mkt-sel:focus { border-color:var(--faint); }
    .mkt-sel option { background:var(--surface-2); color:var(--text); }

    .mkt-inp {
      background:var(--surface); color:var(--text); border:1px solid var(--soft-strong);
      border-radius:9px; padding:8px 10px 8px 33px; font-size:11px;
      font-family:'Syne',sans-serif; outline:none; box-sizing:border-box;
      transition:border-color 0.15s;
    }
    .mkt-inp:focus { border-color:var(--faint); background:var(--surface); }
    .mkt-inp::placeholder { color:var(--faint); }

    .mkt-card {
      background:var(--app-shell-gradient); border:1px solid var(--soft-strong);
      border-radius:14px; transition:border-color 0.2s, box-shadow 0.2s;
      position:relative; overflow:hidden;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    .mkt-card::before {
      content:''; position:absolute; inset:0; pointer-events:none;
      background:rgba(200,230,201,0.08);
    }
    [data-theme="dark"] .mkt-card::before {
      background:rgba(34,197,94,0.08);
    }
    [data-theme="dark"] .mkt-card {
      background:
        linear-gradient(150deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.24) 58%, rgba(0,0,0,0.12) 100%),
        var(--app-shell-gradient);
      border-color:rgba(34,197,94,0.20);
    }
    [data-theme="light"] .mkt-card {
      background:var(--app-shell-gradient);
    }
    .mkt-card:hover { border-color:var(--soft-strong); }
    .mkt-card-glow { box-shadow:0 0 32px var(--card-glow,rgba(0,229,160,0.08)); }

    .mkt-sidebar-toggle {
      background:var(--app-shell-gradient) !important;
      border:1px solid var(--soft-strong) !important;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .mkt-scroll::-webkit-scrollbar { width:3px; height:3px; }
    .mkt-scroll::-webkit-scrollbar-thumb { background:var(--soft-strong); border-radius:2px; }
    .mkt-scroll::-webkit-scrollbar-track { background:transparent; }

    .live-dot { width:7px; height:7px; border-radius:50%; position:relative; flex-shrink:0; display:inline-block; }
    .live-dot::after { content:''; position:absolute; inset:-3px; border-radius:50%; background:inherit; animation:pulse-ring 1.9s ease-out infinite; }

    .data-row { transition:background 0.12s; cursor:pointer; }
    .data-row:hover { background:var(--soft) !important; }
    .data-row.selected { background:var(--soft-strong) !important; }

    .ticker-wrap { overflow:hidden; position:relative; }
    .ticker-inner { display:inline-flex; gap:36px; white-space:nowrap; animation:ticker-scroll 36s linear infinite; }
    .ticker-inner:hover { animation-play-state:paused; }

    .scan-overlay { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
    .scan-line { position:absolute; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--soft),transparent); animation:scan-line 4s linear infinite; }

    .hbar-fill { transition:width 0.9s cubic-bezier(.16,1,.3,1); transform-origin:left; }
    .radial-segment { transition:opacity 0.2s; }
    .radial-segment:hover { opacity:0.85; }

    .kpi-number { animation:count-up 0.6s cubic-bezier(.16,1,.3,1) both; }
    .glow-text { animation:glow-pulse 2.5s ease-in-out infinite; }

    .insight-pill {
      padding:5px 10px; border-radius:20px; font-size:9.5px; font-family:'Syne',sans-serif;
      font-weight:700; letter-spacing:0.05em; text-transform:uppercase;
      border:1px solid; display:inline-flex; align-items:center; gap:5px;
    }
    .heat-cell { border-radius:4px; transition:opacity 0.2s; cursor:default; }
    .heat-cell:hover { opacity:0.75; filter:brightness(1.2); }

    .progress-ring { transform:rotate(-90deg); }
    .progress-ring-circle { transition:stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1); }

    .mkt-chip {
      display:inline-flex; align-items:center; gap:5px; padding:3px 9px;
      border-radius:20px; font-size:9px; font-family:'Syne',sans-serif;
      font-weight:700; text-transform:uppercase; letter-spacing:0.08em;
      background:var(--soft-strong); color:var(--muted);
      border:1px solid var(--soft-strong);
    }
    .mkt-divider { height:1px; background:linear-gradient(90deg,transparent,var(--soft-strong),transparent); }
    .metric-bar { border-radius:3px; transition:width 1s cubic-bezier(.16,1,.3,1); }

    .spotlight-field:last-child { border-bottom:none !important; }
    .section-label { font-size:9px; text-transform:uppercase; letter-spacing:0.16em; color:var(--faint); font-family:'Syne',sans-serif; font-weight:700; }
  `;

const existingMarketStyle = document.getElementById(STYLE_ID);
if (existingMarketStyle) {
  if (existingMarketStyle.textContent !== MARKET_STYLES) {
    existingMarketStyle.textContent = MARKET_STYLES;
  }
} else {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = MARKET_STYLES;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */
const toArr = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  for (const k of ["items","rows","data","prices","mandis","msp_prices","price_points","providers","results","records","schemes","advisories"]) {
    if (Array.isArray(v[k])) return v[k];
  }
  return [];
};
const uniq    = (arr) => [...new Set(arr.map((x) => String(x||"").trim()).filter(Boolean))];
const fmtN    = (v)   => { const n=Number(v); return Number.isFinite(n)?n.toLocaleString("en-IN",{maximumFractionDigits:2}):"—"; };
const fmtM    = (v)   => { const n=Number(v); return(!n||!Number.isFinite(n))?"—":`₹${fmtN(n)}`; };
const fmtD    = (v)   => { if(!v) return "—"; const d=new Date(v); return isNaN(d)?String(v):d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); };
const fmtDX   = (v)   => { if(!v) return ""; const d=new Date(v); return isNaN(d)?String(v):d.toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"2-digit"}); };
const short   = (v,n=60) => { const s=String(v??""); return s.length>n?s.slice(0,n)+"…":s; };
const fL      = (k)   => k.replace(/_/g," ").replace(/\b\w/g,(m)=>m.toUpperCase());
const arrAvg  = (arr) => arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
const arrMax  = (arr) => arr.length?Math.max(...arr):0;
const arrMin  = (arr) => arr.length?Math.min(...arr):0;
const pctChg  = (a,b) => b?((a-b)/Math.abs(b))*100:0;
const countBy = (rows,key) => {
  const m=new Map();
  rows.forEach(r=>{ const v=String(r[key]||r._raw?.[key]||"").trim(); if(v) m.set(v,(m.get(v)||0)+1); });
  return [...m.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
};
const groupAvg = (rows,groupKey,valKey) => {
  const m=new Map();
  rows.forEach(r=>{ const g=r[groupKey]||r._raw?.[groupKey]||""; const v=Number(r[valKey]||0); if(g&&v>0){ const ex=m.get(g)||{sum:0,cnt:0}; m.set(g,{sum:ex.sum+v,cnt:ex.cnt+1}); }});
  return [...m.entries()].map(([name,{sum,cnt}])=>({name,value:Math.round(sum/cnt)})).sort((a,b)=>b.value-a.value);
};

/* ═══════════════════════════════════════════════════════════════
   CUSTOM TOOLTIP
═══════════════════════════════════════════════════════════════ */
const MktTooltip = ({ active, payload, label, accent="#22c55e", isMoney=false, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"var(--surface)",border:`1px solid ${accent}40`,borderRadius:11,padding:"11px 14px",fontSize:11,boxShadow:"var(--shadow-lg)",fontFamily:"'JetBrains Mono',monospace",backdropFilter:"blur(12px)"}}>
      {label&&<div style={{color:"rgba(255,255,255,0.38)",marginBottom:7,fontSize:9,fontFamily:"'Syne',sans-serif",textTransform:"uppercase",letterSpacing:"0.08em"}}>{fmtD(label)||label}</div>}
      {payload.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:9,marginTop:i>0?5:0}}>
          <div style={{width:8,height:8,borderRadius:2,background:p.color||accent,flexShrink:0,boxShadow:`0 0 6px ${p.color||accent}`}}/>
          <span style={{color:"rgba(255,255,255,0.45)",fontSize:9,fontFamily:"'Syne',sans-serif"}}>{p.name}</span>
          <span style={{color:p.color||accent,fontWeight:700,marginLeft:"auto",paddingLeft:14}}>
            {formatter?formatter(p.value):isMoney?fmtM(p.value):fmtN(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   LOADING SKELETON
═══════════════════════════════════════════════════════════════ */
const ChartSkeleton = ({ h=280, label="Loading…", accent="#22c55e" }) => (
  <div style={{height:h,position:"relative",borderRadius:14,background:"var(--soft-subtle)",overflow:"hidden",border:"1px solid var(--soft)"}}>
    <div className="mkt-skeleton" style={{position:"absolute",inset:0}}/>
    <div className="scan-overlay"><div className="scan-line"/></div>
    {[78,52,91,61,84,47,70,88,55,73].map((hv,i)=>(
      <div key={i} className="mkt-skeleton" style={{position:"absolute",bottom:32,left:`${(i/10)*88+6}%`,width:"7%",height:`${hv*0.55}%`,borderRadius:"4px 4px 0 0",animationDelay:`${i*0.08}s`,background:`${accent}22`}}/>
    ))}
    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${accent}30`,borderTop:`2px solid ${accent}`,animation:"spin 1s linear infinite"}}/>
      <span style={{fontSize:11,color:"var(--faint)",fontFamily:"'Syne',sans-serif"}}>{label}</span>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════════════ */
const StatCard = ({ label, value, sub, accent="#22c55e", trend, icon:Icon, delay=0, sparkData }) => {
  const isPos = trend>0;
  return (
    <div className="mkt-card mkt-fade-up" style={{padding:"15px 17px",animationDelay:`${delay}ms`,background:`linear-gradient(135deg,var(--soft-subtle),var(--soft-subtle))`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}>
        <span className="section-label">{label}</span>
        {Icon&&<div style={{width:28,height:28,borderRadius:8,background:`${accent}14`,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${accent}25`}}><Icon size={12} color={accent}/></div>}
      </div>
      <div className="kpi-number" style={{fontSize:24,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:"rgba(255,255,255,0.95)",lineHeight:1,animationDelay:`${delay+80}ms`}}>{value}</div>
      <div style={{display:"flex",alignItems:"center",gap:7,marginTop:8}}>
        {trend!=null&&(
          <span style={{fontSize:10,fontWeight:700,color:isPos?accent:"#16a34a",display:"flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:20,background:isPos?`${accent}14`:"rgba(34,197,94,0.12)",border:`1px solid ${isPos?accent+"30":"rgba(34,197,94,0.3)"}`}}>
            {isPos?<ArrowUpRight size={9}/>:<ArrowDownRight size={9}/>}
            {isPos?"+":""}{Number(trend).toFixed(1)}%
          </span>
        )}
        {sub&&<span style={{fontSize:9.5,color:"var(--faint)",fontFamily:"'Syne',sans-serif"}}>{sub}</span>}
      </div>
      {sparkData&&sparkData.length>1&&(
        <div style={{marginTop:10,height:32}}>
          <ResponsiveContainer width="100%" height={32}>
            <AreaChart data={sparkData.map((v,i)=>({v,i}))}>
              <defs><linearGradient id={`sg${label.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity={0.35}/><stop offset="100%" stopColor={accent} stopOpacity={0}/></linearGradient></defs>
              <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={1.5} fill={`url(#sg${label.replace(/\s/g,"")})`} dot={false} isAnimationActive animationDuration={1200}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div style={{marginTop:sparkData?6:10,height:2,background:"var(--soft)",borderRadius:1}}>
        <div style={{height:"100%",width:"65%",background:`linear-gradient(90deg,${accent},${accent}40)`,borderRadius:1,animation:"fadeUp 0.8s ease both",animationDelay:`${delay+200}ms`}}/>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TICKER TAPE
═══════════════════════════════════════════════════════════════ */
const TickerTape = ({ rows, accent }) => {
  const latestByItem = new Map();
  rows.forEach((row, index) => {
    const name = String(row.commodity || row.market || row.name || "").trim();
    const val = Number(row.modal_price ?? row.msp ?? row.price ?? 0);
    if (!name || !Number.isFinite(val) || val <= 0) return;

    const raw = row._raw || row;
    const tsSource = raw.arrival_date || raw.date || raw.updated_at || raw.created_at || row.arrival_date || row.date;
    const parsed = Date.parse(tsSource);
    const ts = Number.isNaN(parsed) ? index : parsed;

    const prev = latestByItem.get(name);
    if (!prev || ts >= prev.ts) {
      latestByItem.set(name, { name, val, state: row.state || "", ts });
    }
  });

  const items = [...latestByItem.values()]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 20);

  if(!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{background:"linear-gradient(90deg, rgba(34,197,94,0.05) 0%, var(--surface) 24%, var(--surface) 100%)",borderTop:"1px solid rgba(34,197,94,0.18)",borderBottom:"1px solid rgba(34,197,94,0.12)",padding:"5px 0",display:"flex",alignItems:"center",gap:0}}>
      <div className="ticker-wrap" style={{flex:1}}>
        <div className="ticker-inner">
          {doubled.map((item,i)=>(
            <span key={i} style={{fontSize:10.5,color:"var(--muted)",display:"inline-flex",alignItems:"center",gap:7,flexShrink:0}}>
              <span style={{color:accent,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:10}}>{item.name}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",color:"var(--text)",fontWeight:600}}>{fmtM(item.val)}</span>
              {item.state&&<span style={{color:"var(--faint)",fontSize:9,fontFamily:"'Syne',sans-serif"}}>{item.state}</span>}
              <span style={{color:"var(--soft-strong)",fontSize:9}}>◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   HEATMAP
═══════════════════════════════════════════════════════════════ */
const HeatMap = ({ data, label, accent, valueKey="value", nameKey="name" }) => {
  if(!data||!data.length) return null;
  const max = Math.max(...data.map(d=>d[valueKey]||0))||1;
  const rows = [];
  for(let i=0;i<data.length;i+=6) rows.push(data.slice(i,i+6));
  return (
    <div>
      {label&&<div className="section-label" style={{marginBottom:10}}>{label}</div>}
      <div style={{display:"grid",gridTemplateColumns:`repeat(6,1fr)`,gap:4}}>
        {data.slice(0,36).map((d,i)=>{
          const intensity=(d[valueKey]||0)/max;
          return (
            <div key={i} className="heat-cell" title={`${d[nameKey]}: ${fmtN(d[valueKey])}`}
              style={{height:32,borderRadius:5,background:`${accent}${Math.round(intensity*80+10).toString(16).padStart(2,"0")}`,border:`1px solid ${accent}${Math.round(intensity*60+5).toString(16).padStart(2,"0")}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
              <span style={{fontSize:7,color:"var(--muted)",fontFamily:"'Syne',sans-serif",textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap",maxWidth:"90%",textAlign:"center"}}>{short(d[nameKey],6)}</span>
              <span style={{fontSize:8,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:intensity>0.5?`var(--text)`:`${accent}cc`}}>{fmtN(d[valueKey])}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   CIRCULAR PROGRESS
═══════════════════════════════════════════════════════════════ */
const CircularProgress = ({ value, max, size=80, accent, label, sub }) => {
  const r=32; const c=2*Math.PI*r; const pct=Math.min(1,value/max);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <svg width={size} height={size} viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--soft)" strokeWidth="6"/>
        <circle className="progress-ring" cx="36" cy="36" r={r} fill="none" stroke={accent} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-pct)}
          style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)"}}>
        </circle>
        <text x="36" y="37" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontSize="13" fontFamily="'JetBrains Mono',monospace" fontWeight="700">{Math.round(pct*100)}%</text>
      </svg>
      {label&&<div style={{fontSize:10,fontFamily:"'Syne',sans-serif",color:"var(--muted)",textAlign:"center"}}>{label}</div>}
      {sub&&<div style={{fontSize:9,fontFamily:"'Syne',sans-serif",color:"var(--faint)",textAlign:"center"}}>{sub}</div>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SPOTLIGHT PANEL
═══════════════════════════════════════════════════════════════ */
const Spotlight = ({ row, tab, accent }) => {
  if(!row) return (
    <div style={{padding:"32px 20px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <div style={{width:48,height:48,borderRadius:"50%",background:"var(--soft)",border:"1px solid var(--soft-strong)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Eye size={18} color="var(--faint)"/>
      </div>
      <span style={{fontSize:11,color:"rgba(255,255,255,0.22)",fontFamily:"'Syne',sans-serif"}}>Select a row to inspect</span>
    </div>
  );
  const primary = row.market||row.name||row.commodity||row.project_name||row.equipment_name||row.crop||"";
  const secondary = [row.state,row.district].filter(Boolean).join(" · ");
  const pairs = Object.entries(row)
    .filter(([k,v])=>k!=="id"&&k!=="_raw"&&v!==null&&v!==undefined&&v!=="")
    .slice(0,16);
  return (
    <div style={{padding:"14px"}}>
      <div style={{padding:"14px",background:`linear-gradient(135deg,${accent}10,${accent}05)`,border:`1px solid ${accent}22`,borderRadius:11,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,fontFamily:"'Syne',sans-serif",color:"rgba(255,255,255,0.95)",lineHeight:1.4,marginBottom:4}}>{primary||"Record"}</div>
        {secondary&&<div style={{fontSize:10,color:`${accent}99`,fontFamily:"'Syne',sans-serif",display:"flex",alignItems:"center",gap:5}}><MapPin size={9}/>{secondary}</div>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {pairs.map(([k,v])=>{
          const isMoney=k.includes("price")||k==="msp"||k.includes("rate")||k.includes("capacity");
          const isDate=k.includes("date")||k.includes("_at");
          const disp=isDate?fmtD(v):isMoney&&typeof v==="number"?fmtM(v):short(String(v??""),52);
          return (
            <div key={k} className="spotlight-field" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,padding:"8px 0",borderBottom:"1px solid var(--soft)"}}>
              <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:"var(--faint)",flexShrink:0,paddingTop:1,fontFamily:"'Syne',sans-serif"}}>{fL(k)}</span>
              <span style={{fontSize:10.5,fontWeight:isMoney?700:400,color:isMoney?accent:"var(--text)",fontFamily:isMoney?"'JetBrains Mono',monospace":"'Syne',sans-serif",textAlign:"right",maxWidth:160,wordBreak:"break-word"}}>
                {disp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   DATA TABLE
═══════════════════════════════════════════════════════════════ */
const DataTable = ({ rows, cols, selected, onSelect, accent, maxH=340 }) => {
  if(!rows.length) return (
    <div style={{padding:"40px 20px",textAlign:"center",color:"var(--faint)",fontSize:12,fontFamily:"'Syne',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <Database size={24} color="var(--soft-strong)"/>
      No records loaded from backend
    </div>
  );
  return (
    <div style={{overflowX:"auto",overflowY:"auto",maxHeight:maxH}} className="mkt-scroll">
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead>
          <tr>
            {cols.map(c=>(
              <th key={c} style={{position:"sticky",top:0,zIndex:2,padding:"10px 13px",textAlign:"left",background:"var(--surface-2)",fontSize:9,textTransform:"uppercase",letterSpacing:"0.13em",color:"var(--faint)",borderBottom:"1px solid var(--soft-strong)",fontWeight:700,fontFamily:"'Syne',sans-serif",whiteSpace:"nowrap"}}>
                {fL(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>{
            const isSel=row.id===selected?.id;
            return (
              <tr key={row.id||i} className={`data-row${isSel?" selected":""}`} onClick={()=>onSelect?.(row)}
                style={{background:isSel?`${accent}0e`:"transparent",borderLeft:isSel?`2px solid ${accent}`:"2px solid transparent"}}>
                {cols.map(c=>{
                  const v=row[c];
                  const isMoney=c.includes("price")||c==="msp"||c.includes("rate")||c.includes("capacity");
                  const isDate=c.includes("date")||c.includes("_at");
                  const disp=isDate?fmtD(v):isMoney&&typeof v==="number"?fmtM(v):short(String(v??""  ),48);
                  return (
                    <td key={c} style={{padding:"9px 13px",borderBottom:"1px solid var(--soft)",color:isMoney?accent:c==="status"&&String(v).toLowerCase()==="active"?"#4ade80":"rgba(255,255,255,0.72)",fontWeight:isMoney?700:400,fontFamily:isMoney?"'JetBrains Mono',monospace":"'Syne',sans-serif",whiteSpace:"nowrap"}}>
                      {c==="status"?(
                        <span style={{padding:"2px 8px",borderRadius:20,background:String(v).toLowerCase()==="active"?"rgba(74,222,128,0.12)":"var(--soft)",border:`1px solid ${String(v).toLowerCase()==="active"?"rgba(74,222,128,0.3)":"var(--soft-strong)"}`,fontSize:9}}>{disp}</span>
                      ):disp}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TREEMAP CELL
═══════════════════════════════════════════════════════════════ */
const TreemapCell = ({ x, y, width, height, name, value, index }) => {
  const bg=PALETTE[index%PALETTE.length];
  if(width<22||height<16) return <rect x={x} y={y} width={width} height={height} fill={`${bg}18`} stroke={`${bg}35`} strokeWidth={1} rx={3}/>;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={`${bg}1a`} stroke={`${bg}50`} strokeWidth={1} rx={5}/>
      {width>65&&height>36&&<text x={x+9} y={y+18} fill={bg} fontSize={10} fontFamily="'Syne',sans-serif" fontWeight={700}>{short(name,14)}</text>}
      {width>65&&height>52&&<text x={x+9} y={y+32} fill="rgba(255,255,255,0.45)" fontSize={9} fontFamily="'JetBrains Mono',monospace">{fmtN(value)}</text>}
    </g>
  );
};

/* ═══════════════════════════════════════════════════════════════
   NORMALIZERS
═══════════════════════════════════════════════════════════════ */
const normPrices    = (p) => toArr(p?.prices||p?.items||p).map((r,i)=>({id:r.id||r._id||`p${i}`,market:r.market||r.mandi_name||"",commodity:r.commodity||r.crop_name||"",state:r.state||"",district:r.district||"",min_price:Number(r.min_price||0),max_price:Number(r.max_price||0),modal_price:Number(r.modal_price||0),arrival_date:r.arrival_date||r.date||"",source:r.source||"",_raw:r}));
const normMsp       = (p) => {
  if(p?.msp_prices&&typeof p.msp_prices==="object"&&!Array.isArray(p.msp_prices))
    return Object.entries(p.msp_prices).map(([commodity,msp],i)=>({id:`msp${i}`,commodity,msp:Number(msp||0),season:p.season||"2024-25",unit:"INR/quintal",_raw:{commodity,msp}}));
  return toArr(p?.items||p?.rows||p).map((r,i)=>({id:r.id||r._id||`msp${i}`,commodity:r.commodity||r.crop||r.name||"",msp:Number(r.msp||r.price||r.value||0),season:r.season||p?.season||"2024-25",unit:r.unit||"INR/quintal",_raw:r}));
};
const normMandis    = (p) => toArr(p?.mandis||p?.items||p).map((r,i)=>({id:r.id||r._id||`m${i}`,name:r.name||r.mandi_name||"",state:r.state||"",district:r.district||"",address:r.address||"",source:r.source||"",lat:r.latitude??null,lng:r.longitude??null,_raw:r}));
const normTrends    = (p) => toArr(p?.price_points||p?.items||p).map((r,i)=>({id:r.id||`t${i}`,date:r.date||r.arrival_date||"",modal_price:Number(r.modal_price||0),_raw:r}));
const normEquipment = (p) => toArr(p?.items||p?.rows||p?.providers||p).map((r,i)=>({id:r.id||r._id||`eq${i}`,name:r.name||r.equipment_name||"",category:r.category||r.equipment_category||"",state:r.state||"",location:r.location||r.district||"",rate_per_hour:Number(r.rate_per_hour||0),rate_per_day:Number(r.rate_per_day||0),contact:r.contact_phone||r.contact||"",status:r.is_active?"Active":r.status||"Inactive",_raw:r}));
const normGeneric   = (p) => toArr(p?.items||p?.rows||p?.data||p).map((r,i)=>({id:r.id||r._id||`g${i}`,...r,_raw:r}));

/* ═══════════════════════════════════════════════════════════════
   ENDPOINTS
═══════════════════════════════════════════════════════════════ */
const COLL_MAP = {fasal:"ref_fasal_data",fertilizer:"ref_fertilizer_data",pesticide:"ref_pesticide_advisory"};
const getEndpoints = (tab,{state,commodity,district,market,search}) => {
  const q=(base,p)=>withQuery(base,p); const pp=200;
  if(tab==="prices")     return [q("/api/v1/market/live-market/prices",{state:state||undefined,commodity:commodity||undefined,district:district||undefined,limit:1000}),q("/api/v1/admin/data/collection/market_prices",{page:1,per_page:pp,search}),q("/api/v1/admin/data/collection/ref_mandi_prices",{page:1,per_page:pp,search})];
  if(tab==="msp")        return [q("/api/v1/market/live-market/msp",{commodity:commodity||undefined}),"/api/v1/market/live-market/msp/all",q("/api/v1/admin/data/collection/ref_msp_prices",{page:1,per_page:pp})];
  if(tab==="trends")     return [q("/api/v1/market/ref-data/price-trends",{commodity:commodity||undefined,state:state||undefined,market:market||undefined}),q("/api/v1/admin/data/collection/ref_mandi_prices",{page:1,per_page:pp,search})];
  if(tab==="mandis")     return [q("/api/v1/market/live-market/mandis",{state:state||undefined,limit:500}),q("/api/v1/admin/data/collection/mandis",{page:1,per_page:pp,search}),q("/api/v1/admin/data/collection/ref_mandi_directory",{page:1,per_page:pp,search})];
  if(tab==="cold")       return [q("/api/v1/market/ref-data/cold-storage",{state:state||undefined}),q("/api/v1/admin/data/collection/ref_cold_storage",{page:1,per_page:pp,search})];
  if(tab==="reservoir")  return [q("/api/v1/market/ref-data/reservoir",{state:state||undefined}),q("/api/v1/admin/data/collection/ref_reservoir_data",{page:1,per_page:pp,search})];
  if(tab==="equipment") {
    const equipmentQuery = search || commodity || undefined;
    return [
      q("/api/v1/admin/data/collection/ref_equipment_providers",{page:1,per_page:pp,search}),
      q("/api/v1/admin/data/equipment-providers",{state:state||undefined,category:commodity||undefined}),
      ...(equipmentQuery ? [q("/api/v1/equipment/rental-rates/search",{q:equipmentQuery,state:state||undefined,district:district||undefined})] : []),
    ];
  }
  const col=COLL_MAP[tab]||"";
  return [...(col?[q(`/api/v1/admin/data/collection/${col}`,{page:1,per_page:pp,search})]:[]),...(tab==="fertilizer"?["/api/v1/schemes/fertilizer-advisory"]:[]),...(tab==="pesticide"?["/api/v1/schemes/pesticide-advisory"]:[])];
};

const TAB_COLS = {
  prices:    ["arrival_date","market","commodity","state","district","min_price","modal_price","max_price"],
  msp:       ["commodity","msp","season","unit"],
  trends:    ["date","modal_price"],
  mandis:    ["name","state","district","source"],
  cold:      ["state","available_capacity_mt","capacity_required_mt"],
  reservoir: ["state","project_name","current_storage_pct_of_normal","projects_deficiency_pct"],
  fasal:     ["state","crop","season","area"],
  fertilizer:["crop","fertilizer","dose","state"],
  pesticide: ["crop","pest","pesticide","state"],
  equipment: ["name","category","state","location","rate_per_hour","rate_per_day","status"],
};

/* ═══════════════════════════════════════════════════════════════
   MANDI PRICES VIZ
═══════════════════════════════════════════════════════════════ */
const PricesViz = ({ rows, loading, accent, payload }) => {
  const sorted    = useMemo(()=>[...rows].filter(r=>r.arrival_date).sort((a,b)=>String(a.arrival_date).localeCompare(String(b.arrival_date))).slice(-80),[rows]);
  const byState   = useMemo(()=>countBy(rows,"state").slice(0,10),[rows]);
  const byCommodity = useMemo(()=>groupAvg(rows,"commodity","modal_price").slice(0,10),[rows]);
  const priceSpread = useMemo(()=>rows.filter(r=>r.min_price>0&&r.max_price>0).map(r=>({commodity:short(r.commodity,10),spread:r.max_price-r.min_price,modal_price:r.modal_price})).sort((a,b)=>b.spread-a.spread).slice(0,8),[rows]);
  const allVals   = rows.map(r=>r.modal_price).filter(v=>v>0);
  const avgModal  = arrAvg(allVals);
  const maxModal  = arrMax(allVals);
  const minModal  = arrMin(allVals);
  const stateSparklines = useMemo(()=>{
    const m=new Map();
    sorted.forEach(r=>{ if(r.state&&r.modal_price>0){ if(!m.has(r.state)) m.set(r.state,[]); m.get(r.state).push(r.modal_price); }});
    return [...m.entries()].slice(0,6).map(([state,vals])=>({state,vals,avg:arrAvg(vals),trend:pctChg(vals[vals.length-1]||0,vals[0]||0)}));
  },[sorted]);

  if(loading) return <ChartSkeleton h={520} label="Fetching live mandi prices…" accent={accent}/>;

  return (
    <div style={{display:"grid",gap:16}}>
      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <StatCard label="Total Records"  value={rows.length}         icon={Activity}         accent={accent} delay={0}   sub={`${uniq(rows.map(r=>r.market)).filter(Boolean).length} markets`} sparkData={sorted.slice(-20).map(r=>r.modal_price)}/>
        <StatCard label="Avg Modal Price" value={fmtM(avgModal)}     icon={CircleDollarSign} accent={accent} delay={60}  sub="Weighted average" sparkData={sorted.slice(-20).map(r=>r.modal_price)}/>
        <StatCard label="Commodities"    value={uniq(rows.map(r=>r.commodity)).filter(Boolean).length} icon={Layers} accent={accent} delay={120} sub="Unique tracked"/>
        <StatCard label="States"         value={uniq(rows.map(r=>r.state)).filter(Boolean).length}     icon={MapPin}  accent={accent} delay={180} sub="Geographic coverage"/>
      </div>

      {/* Main price chart */}
      <div className="mkt-card" style={{padding:"20px 18px 16px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18}}>
          <div>
            <div className="section-label" style={{marginBottom:6}}>Modal Price Timeline · Min/Max Band</div>
            <div style={{fontSize:17,fontWeight:700,fontFamily:"'Syne',sans-serif"}}>{sorted.length} data points · Live backend</div>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            {payload?.trend&&<span style={{fontSize:9,padding:"3px 10px",borderRadius:20,background:`${accent}18`,color:accent,fontWeight:700,border:`1px solid ${accent}30`,fontFamily:"'Syne',sans-serif",textTransform:"uppercase",letterSpacing:"0.08em"}}>{payload.trend}</span>}
            {payload?.cache_hit!==undefined&&<span className="mkt-chip">{payload.cache_hit?"⚡ Cached":"🔴 Live"}</span>}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={290}>
          <ComposedChart data={sorted} margin={{top:8,right:20,bottom:18,left:4}}>
            <defs>
              <linearGradient id="pgMax2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PALETTE[1]} stopOpacity={0.18}/><stop offset="100%" stopColor={PALETTE[1]} stopOpacity={0}/></linearGradient>
              <linearGradient id="pgModal2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity={0.38}/><stop offset="100%" stopColor={accent} stopOpacity={0.01}/></linearGradient>
              <filter id="glw"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)" vertical={false}/>
            <XAxis dataKey="arrival_date" tickFormatter={v=>fmtDX(v)} tick={{fill:"var(--faint)",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} angle={-18} textAnchor="end" height={40}/>
            <YAxis tickFormatter={v=>`₹${Math.round(v/1000)}k`} tick={{fill:"var(--faint)",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} width={52}/>
            <Tooltip content={<MktTooltip accent={accent} isMoney/>}/>
            <Legend wrapperStyle={{fontSize:9,fontFamily:"'Syne',sans-serif",color:"var(--muted)"}}/>
            <Area type="monotone" dataKey="max_price"   fill="url(#pgMax2)"   stroke="transparent" name="Max Price" isAnimationActive animationDuration={900}/>
            <Area type="monotone" dataKey="modal_price" fill="url(#pgModal2)" stroke={accent} strokeWidth={2.5} dot={false} name="Modal Price" isAnimationActive animationDuration={1100}/>
            <Line type="monotone" dataKey="min_price" stroke="#16a34a" strokeWidth={1.5} dot={false} strokeDasharray="3 4" name="Min Price" isAnimationActive animationDuration={1300}/>
            {avgModal>0&&<ReferenceLine y={avgModal} stroke={`${accent}60`} strokeDasharray="5 4" label={{value:"AVG",position:"insideRight",fill:`${accent}80`,fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}/>}
            <Brush dataKey="arrival_date" height={24} stroke="var(--soft-strong)" fill="var(--soft-subtle)" travellerWidth={8} tickFormatter={v=>fmtD(v)}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 3-column breakdown */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        {/* State distribution */}
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>Records by State</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byState} layout="vertical" margin={{left:-6,right:12,top:0,bottom:0}}>
              <XAxis type="number" tick={{fill:"var(--faint)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} width={80}/>
              <Tooltip content={<MktTooltip accent={accent}/>}/>
              <Bar dataKey="value" radius={[0,5,5,0]} isAnimationActive animationDuration={1000}>
                {byState.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Commodity avg price */}
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>Avg Price by Commodity</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCommodity.slice(0,8)} layout="vertical" margin={{left:-6,right:12,top:0,bottom:0}}>
              <XAxis type="number" tickFormatter={v=>`₹${Math.round(v/1000)}k`} tick={{fill:"var(--faint)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} width={80}/>
              <Tooltip content={<MktTooltip accent={accent} isMoney/>}/>
              <Bar dataKey="value" radius={[0,5,5,0]} isAnimationActive animationDuration={1200}>
                {byCommodity.map((_,i)=><Cell key={i} fill={PALETTE[(i+3)%PALETTE.length]} fillOpacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Price spread (max - min) */}
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>Price Spread (Max−Min)</div>
          {priceSpread.length>0?(
            <div style={{display:"flex",flexDirection:"column",gap:10,paddingTop:4}}>
              {priceSpread.map((r,i)=>{
                const pct=r.spread/Math.max(...priceSpread.map(x=>x.spread));
                const col=PALETTE[(i+6)%PALETTE.length];
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{width:68,fontSize:9,color:"var(--muted)",fontFamily:"'Syne',sans-serif",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.commodity}</span>
                    <div style={{flex:1,height:7,background:"var(--soft)",borderRadius:4,overflow:"hidden"}}>
                      <div className="hbar-fill" style={{height:"100%",width:`${pct*100}%`,background:col,borderRadius:4}}/>
                    </div>
                    <span style={{width:62,fontSize:9,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:col,textAlign:"right"}}>{fmtM(r.spread)}</span>
                  </div>
                );
              })}
            </div>
          ):<div style={{padding:20,textAlign:"center",color:"var(--faint)",fontSize:11}}>No spread data</div>}
        </div>
      </div>

      {/* State sparklines */}
      {stateSparklines.length>0&&(
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:14}}>State Price Trends · Live Sparklines</div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(stateSparklines.length,6)},1fr)`,gap:10}}>
            {stateSparklines.map((s,i)=>{
              const col=PALETTE[i%PALETTE.length]; const isPos=s.trend>=0;
              return (
                <div key={s.state} className="mkt-fade-up" style={{padding:"12px",background:"var(--soft-subtle)",borderRadius:10,border:"1px solid var(--soft-strong)",animationDelay:`${i*50}ms`}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontFamily:"'Syne',sans-serif",marginBottom:4}}>{s.state}</div>
                  <div style={{fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:col}}>{fmtM(s.avg)}</div>
                  <div style={{fontSize:9,color:isPos?accent:"#16a34a",display:"flex",alignItems:"center",gap:3,marginTop:2,fontFamily:"'Syne',sans-serif"}}>{isPos?<ArrowUpRight size={9}/>:<ArrowDownRight size={9}/>}{isPos?"+":""}{s.trend.toFixed(1)}%</div>
                  <div style={{marginTop:8,height:36}}>
                    <ResponsiveContainer width="100%" height={36}>
                      <AreaChart data={s.vals.map((v,idx)=>({v,idx}))}>
                        <defs><linearGradient id={`spk${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity={0.4}/><stop offset="100%" stopColor={col} stopOpacity={0}/></linearGradient></defs>
                        <Area type="monotone" dataKey="v" stroke={col} strokeWidth={1.5} fill={`url(#spk${i})`} dot={false} isAnimationActive animationDuration={1000+i*100}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Heatmap */}
      {byCommodity.length>0&&(
        <div className="mkt-card" style={{padding:"16px"}}>
          <HeatMap data={byCommodity.slice(0,24)} label="Commodity Price Heatmap · Avg Modal" accent={accent} valueKey="value" nameKey="name"/>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MSP VIZ
═══════════════════════════════════════════════════════════════ */
const MspViz = ({ rows, loading, accent }) => {
  const sorted   = useMemo(()=>[...rows].sort((a,b)=>b.msp-a.msp),[rows]);
  const top10    = sorted.slice(0,10);
  const bottom5  = sorted.slice(-5).reverse();
  const maxMsp   = top10[0]?.msp||1;
  const allVals  = sorted.map(r=>r.msp).filter(v=>v>0);
  const buckets  = useMemo(()=>{
    if(!allVals.length) return [];
    const mn=Math.floor(arrMin(allVals)/1000)*1000;
    const mx=Math.ceil(arrMax(allVals)/1000)*1000;
    const step=Math.max(1000,Math.round((mx-mn)/8/1000)*1000);
    const bkts=[];
    for(let v=mn;v<=mx;v+=step) bkts.push({range:`${Math.round(v/1000)}k-${Math.round((v+step)/1000)}k`,count:sorted.filter(r=>r.msp>=v&&r.msp<v+step).length});
    return bkts.filter(b=>b.count>0);
  },[allVals,sorted]);

  if(loading) return <ChartSkeleton h={500} label="Loading MSP reference data…" accent={accent}/>;

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <StatCard label="Total Crops"  value={rows.length}          icon={Sprout}       accent={accent} delay={0}   sub={rows[0]?.season||"Current season"}/>
        <StatCard label="Highest MSP"  value={fmtM(top10[0]?.msp)}  icon={TrendingUp}   accent={accent} delay={60}  sub={top10[0]?.commodity||"—"}/>
        <StatCard label="Lowest MSP"   value={fmtM(sorted.at(-1)?.msp)} icon={TrendingDown} accent={accent} delay={120} sub={sorted.at(-1)?.commodity||"—"}/>
        <StatCard label="Average MSP"  value={fmtM(arrAvg(allVals))} icon={Activity}     accent={accent} delay={180} sub="All crops"/>
      </div>

      {/* Main MSP ladder + radial */}
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:14}}>
        <div className="mkt-card" style={{padding:"18px 16px"}}>
          <div className="section-label" style={{marginBottom:6}}>MSP Ladder · All Crops Ranked</div>
          <div style={{fontSize:14,fontWeight:600,fontFamily:"'Syne',sans-serif",marginBottom:14}}>{rows.length} crops · {sorted[0]?.season||"2024-25"}</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10} layout="vertical" margin={{left:0,right:72,top:0,bottom:0}}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)" horizontal={false}/>
              <XAxis type="number" tickFormatter={v=>`₹${Math.round(v/1000)}k`} tick={{fill:"var(--faint)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="commodity" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} width={80}/>
              <Tooltip content={<MktTooltip accent={accent} isMoney/>}/>
              <Bar dataKey="msp" radius={[0,7,7,0]} isAnimationActive animationDuration={1100}
                label={{position:"right",fill:"var(--muted)",fontSize:8,fontFamily:"'JetBrains Mono',monospace",formatter:v=>fmtM(v)}}>
                {top10.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{display:"grid",gap:14}}>
          {/* Radial */}
          <div className="mkt-card" style={{padding:"16px"}}>
            <div className="section-label" style={{marginBottom:8}}>Distribution · % of Peak</div>
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%"
                data={top10.slice(0,8).map((r,i)=>({...r,val:Math.round((r.msp/maxMsp)*100),fill:PALETTE[i%PALETTE.length]}))}>
                <RadialBar minAngle={12} dataKey="val" isAnimationActive animationDuration={1400} cornerRadius={4}
                  label={{position:"insideStart",fill:"var(--faint)",fontSize:7,fontFamily:"'JetBrains Mono',monospace",formatter:v=>`${v}%`}}/>
                <Tooltip content={({active,payload})=>active&&payload?.length?<div style={{background:"var(--surface)",border:`1px solid ${payload[0]?.payload?.fill}50`,borderRadius:10,padding:"9px 12px",fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}><div style={{color:payload[0]?.payload?.fill,fontWeight:700}}>{payload[0]?.payload?.commodity}</div><div style={{color:"var(--muted)",marginTop:3}}>{fmtM(payload[0]?.payload?.msp)}</div></div>:null}/>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution histogram */}
          <div className="mkt-card" style={{padding:"16px"}}>
            <div className="section-label" style={{marginBottom:8}}>Price Distribution</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={buckets} margin={{left:-16,right:4,top:4,bottom:4}}>
                <XAxis dataKey="range" tick={{fill:"var(--faint)",fontSize:7,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"var(--faint)",fontSize:8}} axisLine={false} tickLine={false}/>
                <Tooltip content={<MktTooltip accent={accent}/>}/>
                <Bar dataKey="count" radius={[4,4,0,0]} isAnimationActive animationDuration={800}>
                  {buckets.map((_,i)=><Cell key={i} fill={accent} fillOpacity={0.5+i*0.05}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MSP Grid cards */}
      <div className="mkt-card" style={{padding:"16px"}}>
        <div className="section-label" style={{marginBottom:14}}>Full MSP Reference · {rows.length} crops</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {sorted.slice(0,20).map((r,i)=>{
            const p=maxMsp?r.msp/maxMsp:0; const c=PALETTE[i%PALETTE.length];
            return (
              <div key={r.id} className="mkt-fade-up" style={{padding:"11px 12px",background:"var(--soft-subtle)",borderRadius:10,border:`1px solid ${c}20`,animationDelay:`${i*25}ms`,cursor:"default"}}>
                <div style={{fontSize:9,color:"var(--muted)",marginBottom:5,fontFamily:"'Syne',sans-serif",fontWeight:600}}>{r.commodity}</div>
                <div style={{fontSize:15,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:c}}>{fmtM(r.msp)}</div>
                <div style={{marginTop:7,height:3,background:"var(--soft)",borderRadius:2}}>
                  <div style={{height:"100%",width:`${p*100}%`,background:c,borderRadius:2,transition:"width 1s cubic-bezier(.16,1,.3,1)"}}/>
                </div>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.22)",marginTop:5,fontFamily:"'JetBrains Mono',monospace"}}>{r.season}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lowest 5 */}
      {bottom5.length>0&&(
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>⚠ Lowest MSP Alert · Bottom 5 Crops</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            {bottom5.map((r,i)=>(
              <div key={r.id} style={{padding:"12px",background:"rgba(34,197,94,0.06)",borderRadius:10,border:"1px solid rgba(34,197,94,0.18)",textAlign:"center"}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontFamily:"'Syne',sans-serif",marginBottom:4}}>{r.commodity}</div>
                <div style={{fontSize:16,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:"#16a34a"}}>{fmtM(r.msp)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PRICE TRENDS VIZ
═══════════════════════════════════════════════════════════════ */
const TrendsViz = ({ rows, loading, accent, payload, commodityF }) => {
  const pts     = useMemo(()=>[...rows].sort((a,b)=>String(a.date).localeCompare(String(b.date))),[rows]);
  const allVals = pts.map(r=>r.modal_price).filter(v=>v>0);
  const trendDir= allVals.length>1?(allVals[allVals.length-1]>allVals[0]?"UP":"DOWN"):null;
  const ma7     = useMemo(()=>pts.map((_,i)=>{if(i<6) return {date:pts[i].date,ma:pts[i].modal_price}; const w=pts.slice(i-6,i+1).map(r=>r.modal_price); return {date:pts[i].date,ma:Math.round(arrAvg(w))};}),[pts]);
  const combined= useMemo(()=>pts.map((p,i)=>({...p,ma:ma7[i]?.ma||p.modal_price})),[pts,ma7]);
  const vol     = useMemo(()=>{const std=Math.sqrt(arrAvg(allVals.map(v=>(v-arrAvg(allVals))**2))); return {std,cv:arrAvg(allVals)?std/arrAvg(allVals)*100:0};},[allVals]);

  if(loading) return <ChartSkeleton h={480} label="Loading price trends…" accent={accent}/>;

  return (
    <div style={{display:"grid",gap:16}}>
      {/* KPIs */}
      {allVals.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
          {[
            {label:"Min Price",  value:fmtM(arrMin(allVals)), icon:TrendingDown, delay:0},
            {label:"Max Price",  value:fmtM(arrMax(allVals)), icon:TrendingUp,   delay:60},
            {label:"Average",    value:fmtM(arrAvg(allVals)), icon:Activity,     delay:120},
            {label:"Volatility", value:`${vol.cv.toFixed(1)}%`,icon:Zap,         delay:180, sub:"Coeff. of variation"},
            {label:"Data Points",value:pts.length,             icon:BarChart2,    delay:240},
          ].map(s=><StatCard key={s.label} {...s} accent={accent}/>)}
        </div>
      )}

      {/* Chart with 7-day MA */}
      <div className="mkt-card" style={{padding:"20px 18px 16px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div className="section-label" style={{marginBottom:6}}>Price History · 7-Day Moving Average</div>
            <div style={{fontSize:18,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>{commodityF||payload?.commodity||"All Commodities"}</div>
            {payload?.market&&<div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:3,fontFamily:"'Syne',sans-serif"}}>📍 {payload.market}</div>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {trendDir&&(
              <div style={{display:"flex",alignItems:"center",gap:7,padding:"7px 14px",borderRadius:20,background:trendDir==="UP"?`${accent}18`:"rgba(34,197,94,0.12)",border:`1px solid ${trendDir==="UP"?accent+"35":"rgba(34,197,94,0.3)"}`}}>
                {trendDir==="UP"?<TrendingUp size={13} color={accent}/>:<TrendingDown size={13} color="#16a34a"/>}
                <span style={{fontSize:11,fontWeight:700,color:trendDir==="UP"?accent:"#16a34a",fontFamily:"'Syne',sans-serif"}}>{trendDir}</span>
              </div>
            )}
            {allVals.length>0&&(
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:26,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:accent}}>{fmtM(allVals[allVals.length-1])}</div>
                <div className="section-label" style={{marginTop:2}}>Latest</div>
              </div>
            )}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={310}>
          <ComposedChart data={combined} margin={{top:8,right:20,bottom:4,left:4}}>
            <defs>
              <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity={0.32}/><stop offset="100%" stopColor={accent} stopOpacity={0.01}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)" vertical={false}/>
            <XAxis dataKey="date" tickFormatter={v=>fmtD(v)} tick={{fill:"rgba(255,255,255,0.22)",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
            <YAxis tickFormatter={v=>`₹${Math.round(v/1000)}k`} tick={{fill:"rgba(255,255,255,0.22)",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} width={50}/>
            <Tooltip content={<MktTooltip accent={accent} isMoney/>}/>
            <Legend wrapperStyle={{fontSize:9,fontFamily:"'Syne',sans-serif",color:"var(--muted)"}}/>
            <Area type="monotone" dataKey="modal_price" fill="url(#tg2)" stroke={accent} strokeWidth={2.5} dot={false} name="Modal Price" isAnimationActive animationDuration={1400}/>
            <Line type="monotone" dataKey="ma" stroke={PALETTE[1]} strokeWidth={1.5} dot={false} strokeDasharray="6 3" name="7-Day MA" isAnimationActive animationDuration={1600}/>
            {allVals.length>0&&<ReferenceLine y={arrAvg(allVals)} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" label={{value:"AVG",position:"insideRight",fill:"rgba(255,255,255,0.28)",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}/>}
            <Brush dataKey="date" height={24} stroke="var(--soft-strong)" fill="var(--soft-subtle)" travellerWidth={8} tickFormatter={v=>fmtD(v)}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Volatility + Pct change */}
      {pts.length>3&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div className="mkt-card" style={{padding:"16px"}}>
            <div className="section-label" style={{marginBottom:12}}>Month-over-Month % Change</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pts.filter((_,i)=>i>0&&i%Math.max(1,Math.floor(pts.length/20))===0).map((p,i,arr)=>({date:p.date,chg:i>0?pctChg(p.modal_price,arr[i-1]?.modal_price||p.modal_price):0}))} margin={{left:-10,right:8,top:4,bottom:4}}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)" vertical={false}/>
                <XAxis dataKey="date" tickFormatter={v=>fmtD(v)} tick={{fill:"var(--faint)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                <YAxis tick={{fill:"var(--faint)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(0)}%`}/>
                <Tooltip content={<MktTooltip accent={accent} formatter={v=>`${v.toFixed(2)}%`}/>}/>
                <Bar dataKey="chg" radius={[3,3,0,0]} isAnimationActive animationDuration={900}>
                  {pts.filter((_,i)=>i>0&&i%Math.max(1,Math.floor(pts.length/20))===0).map((_,i)=>{
                    const chg=_?.chg||0; return <Cell key={i} fill={chg>=0?accent:"#16a34a"} fillOpacity={0.8}/>;
                  })}
                </Bar>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mkt-card" style={{padding:"16px"}}>
            <div className="section-label" style={{marginBottom:14}}>Volatility Analysis</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              {[
                {label:"Std Dev", value:fmtM(vol.std), col:accent},
                {label:"CV %", value:`${vol.cv.toFixed(1)}%`, col:vol.cv>20?"#16a34a":vol.cv>10?PALETTE[3]:accent},
                {label:"Range",value:`${fmtM(arrMin(allVals))} – ${fmtM(arrMax(allVals))}`,col:"var(--text)"},
                {label:"Sample",value:allVals.length,col:"var(--text)"},
              ].map((item,i)=>(
                <div key={i} style={{padding:"10px",background:"var(--soft-subtle)",borderRadius:8,border:"1px solid var(--soft)"}}>
                  <div style={{fontSize:8,color:"var(--faint)",fontFamily:"'Syne',sans-serif",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>{item.label}</div>
                  <div style={{fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:item.col}}>{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mkt-divider"/>
            <div style={{marginTop:12,fontSize:10,color:"var(--muted)",fontFamily:"'Syne',sans-serif",lineHeight:1.6}}>
              {vol.cv<10?"✅ Low volatility — stable market conditions"
               :vol.cv<20?"⚠ Moderate volatility — normal price movement"
               :"🔴 High volatility — monitor price risks closely"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MANDIS VIZ
═══════════════════════════════════════════════════════════════ */
const MandisViz = ({ rows, loading, accent }) => {
  const byState    = useMemo(()=>countBy(rows,"state").slice(0,16),[rows]);
  const byDistrict = useMemo(()=>countBy(rows,"district").slice(0,14),[rows]);
  const scatterData= useMemo(()=>rows.filter(r=>r.lat&&r.lng).map(r=>({x:Number(r.lng),y:Number(r.lat),name:r.name,state:r.state})),[rows]);
  const srcBreakdown = useMemo(()=>countBy(rows,"source").slice(0,8),[rows]);

  if(loading) return <ChartSkeleton h={500} label="Loading mandi directory…" accent={accent}/>;

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <StatCard label="Total Mandis"  value={rows.length}              icon={MapPin}  accent={accent} delay={0}   sub="Backend directory"/>
        <StatCard label="States"        value={uniq(rows.map(r=>r.state)).filter(Boolean).length} icon={Globe} accent={accent} delay={60}  sub="Geographic coverage"/>
        <StatCard label="Districts"     value={uniq(rows.map(r=>r.district)).filter(Boolean).length} icon={Layers} accent={accent} delay={120} sub="Area coverage"/>
        <StatCard label="Geo-tagged"    value={scatterData.length}        icon={Activity} accent={accent} delay={180} sub="With coordinates"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
        {/* Treemap */}
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:6}}>State Coverage · Treemap</div>
          <div style={{fontSize:13,fontWeight:600,fontFamily:"'Syne',sans-serif",marginBottom:12}}>{byState.length} states represented</div>
          <ResponsiveContainer width="100%" height={260}>
            <Treemap data={byState} dataKey="value" nameKey="name" isAnimationActive animationDuration={1100} content={<TreemapCell/>}>
              <Tooltip content={<MktTooltip accent={accent}/>}/>
            </Treemap>
          </ResponsiveContainer>
        </div>

        {/* Scatter geo */}
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:6}}>Geographic Distribution</div>
          <div style={{fontSize:11,color:"var(--faint)",marginBottom:12,fontFamily:"'Syne',sans-serif"}}>{scatterData.length} geo-tagged mandis across India</div>
          {scatterData.length>0?(
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{top:4,right:8,bottom:4,left:-12}}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)"/>
                <XAxis dataKey="x" name="Longitude" domain={[68,98]} tick={{fill:"rgba(255,255,255,0.18)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                <YAxis dataKey="y" name="Latitude" domain={[8,38]} tick={{fill:"rgba(255,255,255,0.18)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                <Tooltip cursor={{strokeDasharray:"2 3",stroke:"var(--soft-strong)"}} content={({active,payload})=>active&&payload?.length?<div style={{background:"var(--surface)",border:`1px solid ${accent}40`,borderRadius:9,padding:"9px 12px",fontSize:10,fontFamily:"'Syne',sans-serif"}}><div style={{color:accent,fontWeight:700,marginBottom:3}}>{payload[0]?.payload?.name}</div><div style={{color:"var(--muted)"}}>{payload[0]?.payload?.state}</div></div>:null}/>
                <Scatter name="Mandis" data={scatterData} fill={accent} fillOpacity={0.65} r={3}/>
              </ScatterChart>
            </ResponsiveContainer>
          ):<div style={{height:240,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.18)",fontSize:11,fontFamily:"'Syne',sans-serif",flexDirection:"column",gap:8}}><MapPin size={24} color="var(--soft-strong)"/>No coordinates available</div>}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:14}}>
        {/* District bar */}
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>Top Districts by Mandi Count</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byDistrict} margin={{left:0,right:12,top:4,bottom:36}}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)" vertical={false}/>
              <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end"/>
              <YAxis tick={{fill:"rgba(255,255,255,0.18)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <Tooltip content={<MktTooltip accent={accent}/>}/>
              <Bar dataKey="value" radius={[6,6,0,0]} isAnimationActive animationDuration={950}>
                {byDistrict.map((_,i)=><Cell key={i} fill={PALETTE[(i+4)%PALETTE.length]} fillOpacity={0.82}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source breakdown */}
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>Data Source Breakdown</div>
          {srcBreakdown.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={srcBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" isAnimationActive animationDuration={1200} label={({name,percent})=>`${short(name,8)} ${(percent*100).toFixed(0)}%`} labelLine={{stroke:"var(--faint)",strokeWidth:1}} fontSize={8} fontFamily="'Syne',sans-serif" fill="var(--muted)">
                  {srcBreakdown.map((_,i)=><Cell key={i} fill={PALETTE[(i+2)%PALETTE.length]}/>)}
                </Pie>
                <Tooltip content={<MktTooltip accent={accent}/>}/>
              </PieChart>
            </ResponsiveContainer>
          ):<div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--faint)",fontSize:11,fontFamily:"'Syne',sans-serif"}}>No source data</div>}
        </div>
      </div>

      {/* State count heatmap */}
      {byState.length>0&&(
        <div className="mkt-card" style={{padding:"16px"}}>
          <HeatMap data={byState.slice(0,30)} label="Mandi Density Heatmap by State" accent={accent} valueKey="value" nameKey="name"/>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   COLD STORAGE VIZ
═══════════════════════════════════════════════════════════════ */
const ColdViz = ({ rows, loading, accent }) => {
  const stateData = useMemo(()=>rows.map(r=>({
    state:r._raw?.state||r.state||"—",
    available:Number(r._raw?.available_capacity_mt||r._raw?.available||0),
    required:Number(r._raw?.capacity_required_mt||r._raw?.required||0),
    utilization:0,
  })).map(r=>({...r,utilization:r.available>0?Math.min(100,Math.round((r.required/r.available)*100)):0}))
   .filter(r=>r.available>0||r.required>0).slice(0,16),[rows]);

  const totAvail = stateData.reduce((s,r)=>s+r.available,0);
  const totReq   = stateData.reduce((s,r)=>s+r.required,0);
  const surplus  = totAvail-totReq;
  const avgUtil  = stateData.length?arrAvg(stateData.map(r=>r.utilization)):0;
  const critical = stateData.filter(r=>r.utilization>85);

  if(loading) return <ChartSkeleton h={500} label="Loading cold storage data…" accent={accent}/>;

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <StatCard label="Total Available" value={`${fmtN(Math.round(totAvail/1000))}K MT`} icon={Warehouse} accent={accent} delay={0}  sub="Cold storage capacity"/>
        <StatCard label="Total Required"  value={`${fmtN(Math.round(totReq/1000))}K MT`}   icon={Package}   accent={accent} delay={60} sub="Demand estimate"/>
        <StatCard label="Surplus / Gap"   value={`${surplus>=0?"+":""}${fmtN(Math.round(surplus/1000))}K MT`} icon={surplus>=0?TrendingUp:TrendingDown} accent={surplus>=0?accent:"#16a34a"} delay={120} sub={surplus>=0?"National surplus":"National deficit"}/>
        <StatCard label="Avg Utilization" value={`${avgUtil.toFixed(0)}%`} icon={Activity} accent={avgUtil>80?"#16a34a":avgUtil>60?PALETTE[3]:accent} delay={180} sub={`${critical.length} states critical`}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:14}}>
        {/* Grouped bar */}
        <div className="mkt-card" style={{padding:"18px 16px"}}>
          <div className="section-label" style={{marginBottom:6}}>Available vs Required Capacity by State</div>
          <div style={{fontSize:12,fontWeight:600,fontFamily:"'Syne',sans-serif",marginBottom:14}}>(Metric Tonnes)</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stateData} margin={{left:0,right:12,top:4,bottom:52}}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)" vertical={false}/>
              <XAxis dataKey="state" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end"/>
              <YAxis tickFormatter={v=>`${Math.round(v/1000)}K`} tick={{fill:"rgba(255,255,255,0.18)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <Tooltip content={<MktTooltip accent={accent}/>}/>
              <Legend wrapperStyle={{fontSize:9,fontFamily:"'Syne',sans-serif",color:"rgba(255,255,255,0.45)"}}/>
              <Bar dataKey="available" name="Available MT" fill={accent} fillOpacity={0.8} radius={[4,4,0,0]} isAnimationActive/>
              <Bar dataKey="required"  name="Required MT"  fill="#16a34a" fillOpacity={0.7} radius={[4,4,0,0]} isAnimationActive/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Utilization + ring chart */}
        <div style={{display:"grid",gap:14}}>
          <div className="mkt-card" style={{padding:"16px"}}>
            <div className="section-label" style={{marginBottom:12}}>Utilization Gauge · National</div>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
              <CircularProgress value={totReq} max={totAvail||1} size={100} accent={avgUtil>80?"#16a34a":avgUtil>60?PALETTE[3]:accent} label="National Utilization" sub={`${fmtN(Math.round(totReq/1000))}K / ${fmtN(Math.round(totAvail/1000))}K MT`}/>
            </div>
            <div className="mkt-divider"/>
            <div style={{marginTop:12,fontSize:10,color:"var(--muted)",fontFamily:"'Syne',sans-serif",textAlign:"center",lineHeight:1.6}}>
              {avgUtil>85?"🔴 Critical — storage nearing capacity":avgUtil>65?"⚠ Moderate — watch demand pressure":"✅ Adequate — supply buffer available"}
            </div>
          </div>

          <div className="mkt-card" style={{padding:"16px"}}>
            <div className="section-label" style={{marginBottom:12}}>State Utilization Bands</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {stateData.slice(0,8).map((r,i)=>{
                const col=r.utilization>85?"#16a34a":r.utilization>65?PALETTE[3]:accent;
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:9}}>
                    <span style={{width:68,fontSize:9,color:"var(--muted)",fontFamily:"'Syne',sans-serif",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.state}</span>
                    <div style={{flex:1,height:7,background:"var(--soft)",borderRadius:4,overflow:"hidden"}}>
                      <div className="hbar-fill" style={{height:"100%",width:`${r.utilization}%`,background:col,borderRadius:4}}/>
                    </div>
                    <span style={{width:36,fontSize:9,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:col,textAlign:"right"}}>{r.utilization}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Surplus/deficit table */}
      {stateData.length>0&&(
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>State-level Surplus / Deficit Analysis</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {stateData.slice(0,12).map((r,i)=>{
              const s=r.available-r.required; const isSurplus=s>=0; const col=isSurplus?accent:"#16a34a";
              return (
                <div key={i} style={{padding:"11px",background:`${col}08`,borderRadius:9,border:`1px solid ${col}20`}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontFamily:"'Syne',sans-serif",marginBottom:4}}>{short(r.state,12)}</div>
                  <div style={{fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:col}}>{isSurplus?"+":""}{fmtN(Math.round(s/1000))}K MT</div>
                  <div style={{fontSize:8,color:"var(--faint)",marginTop:3,fontFamily:"'Syne',sans-serif"}}>{r.utilization}% utilized</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   RESERVOIR VIZ
═══════════════════════════════════════════════════════════════ */
const ReservoirViz = ({ rows, loading, accent }) => {
  const sd = useMemo(()=>rows.map(r=>({
    state:r._raw?.state||r.state||"—",
    storage:Number(r._raw?.current_storage_pct_of_normal||0),
    deficiency:Number(r._raw?.projects_deficiency_pct||0),
    name:r._raw?.project_name||r._raw?.name||"—",
  })).filter(r=>r.storage>0||r.deficiency>0).slice(0,18),[rows]);
  const avgStorage = arrAvg(sd.map(r=>r.storage));
  const critical = sd.filter(r=>r.storage<30);
  const healthy = sd.filter(r=>r.storage>=70);
  const radarData = sd.slice(0,8).map(r=>({state:short(r.state,10),storage:r.storage,deficiency:r.deficiency}));

  if(loading) return <ChartSkeleton h={500} label="Loading reservoir data…" accent={accent}/>;

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <StatCard label="States Tracked"    value={sd.length}                   icon={Droplets}    accent={accent} delay={0}   sub="Reservoir monitoring"/>
        <StatCard label="Avg Storage"       value={`${avgStorage.toFixed(1)}%`} icon={Activity}    accent={accent} delay={60}  sub="% of normal"/>
        <StatCard label="Critical States"   value={critical.length}             icon={AlertCircle} accent="#16a34a" delay={120} sub="Below 30% storage"/>
        <StatCard label="Healthy States"    value={healthy.length}              icon={Shield}      accent="#4ade80" delay={180} sub="Above 70% storage"/>
      </div>

      {/* Composed chart */}
      <div className="mkt-card" style={{padding:"20px 18px 16px"}}>
        <div className="section-label" style={{marginBottom:6}}>Reservoir Storage vs Deficiency</div>
        <div style={{fontSize:14,fontWeight:600,fontFamily:"'Syne',sans-serif",marginBottom:14}}>% of normal capacity · {sd.length} states</div>
        <ResponsiveContainer width="100%" height={290}>
          <ComposedChart data={sd} margin={{left:0,right:12,top:8,bottom:52}}>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)" vertical={false}/>
            <XAxis dataKey="state" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end"/>
            <YAxis tick={{fill:"var(--faint)",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
            <Tooltip content={<MktTooltip accent={accent} formatter={v=>`${fmtN(v)}%`}/>}/>
            <Legend wrapperStyle={{fontSize:9,fontFamily:"'Syne',sans-serif",color:"var(--muted)"}}/>
            <Bar dataKey="storage" name="Storage %" radius={[5,5,0,0]} isAnimationActive animationDuration={1000}>
              {sd.map((r,i)=><Cell key={i} fill={r.storage<30?"#16a34a":r.storage<60?PALETTE[3]:accent} fillOpacity={0.82}/>)}
            </Bar>
            <Line type="monotone" dataKey="deficiency" name="Deficiency %" stroke={PALETTE[10]} strokeWidth={2.5} dot={{fill:PALETTE[10],r:3,strokeWidth:0}} isAnimationActive animationDuration={1300}/>
            <ReferenceLine y={100} stroke="var(--soft-strong)" strokeDasharray="4 4" label={{value:"100%",position:"insideRight",fill:"var(--faint)",fontSize:9}}/>
            <ReferenceLine y={30} stroke="rgba(34,197,94,0.4)" strokeDasharray="3 3" label={{value:"CRITICAL",position:"insideRight",fill:"#16a34a",fontSize:8}}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* Radar */}
        {radarData.length>2&&(
          <div className="mkt-card" style={{padding:"16px"}}>
            <div className="section-label" style={{marginBottom:12}}>State Comparison · Radar</div>
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--soft-strong)"/>
                <PolarAngleAxis dataKey="state" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}}/>
                <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fill:"var(--faint)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false}/>
                <Radar name="Storage %" dataKey="storage" stroke={accent} fill={accent} fillOpacity={0.2} isAnimationActive animationDuration={1300}/>
                <Radar name="Deficiency %" dataKey="deficiency" stroke={PALETTE[10]} fill={PALETTE[10]} fillOpacity={0.12} isAnimationActive animationDuration={1500}/>
                <Legend wrapperStyle={{fontSize:9,fontFamily:"'Syne',sans-serif",color:"var(--muted)"}}/>
                <Tooltip content={<MktTooltip accent={accent} formatter={v=>`${fmtN(v)}%`}/>}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* State health matrix */}
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>Health Matrix · All States</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
            {sd.slice(0,12).map((r,i)=>{
              const col=r.storage<30?"#16a34a":r.storage<60?PALETTE[3]:accent;
              return (
                <div key={i} style={{padding:"10px 8px",background:`${col}0c`,borderRadius:8,border:`1px solid ${col}22`,textAlign:"center"}}>
                  <div style={{fontSize:8,color:"var(--muted)",fontFamily:"'Syne',sans-serif",marginBottom:4}}>{short(r.state,9)}</div>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:col}}>{r.storage.toFixed(0)}%</div>
                  <div style={{height:3,background:"var(--soft)",borderRadius:2,marginTop:5}}>
                    <div style={{height:"100%",width:`${r.storage}%`,background:col,borderRadius:2,transition:"width 1s cubic-bezier(.16,1,.3,1)"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   GENERIC VIZ (FASAL / FERTILIZER / PESTICIDE)
═══════════════════════════════════════════════════════════════ */
const GenericViz = ({ rows, loading, accent, tab }) => {
  const groupField = useMemo(()=>["state","crop","commodity","topic","category","language","language_code","season","ministry"].find(f=>rows.some(r=>r[f]||r._raw?.[f])),[rows]);
  const grouped    = useMemo(()=>groupField?countBy(rows,groupField).slice(0,14):[]                                                                               ,[rows,groupField]);
  const numField   = useMemo(()=>["area","dose","price","value","msp","modal_price"].find(f=>rows.some(r=>Number(r[f]||r._raw?.[f])>0)),[rows]);
  const numData    = useMemo(()=>numField?groupAvg(rows,groupField||"state",numField).slice(0,12):[]                                                             ,[rows,groupField,numField]);
  const cropBreakdown = useMemo(()=>countBy(rows,"crop").slice(0,16),[rows]);

  const tabMeta = TABS.find(t=>t.id===tab)||TABS[0];

  if(loading) return <ChartSkeleton h={480} label={`Loading ${tabMeta.label} data…`} accent={accent}/>;

  return (
    <div style={{display:"grid",gap:16}}>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <StatCard label="Total Records"  value={rows.length}                                              icon={Database}    accent={accent} delay={0}/>
        <StatCard label="States"         value={uniq(rows.map(r=>r.state||r._raw?.state||"")).filter(Boolean).length}         icon={MapPin}  accent={accent} delay={60}/>
        <StatCard label={groupField?fL(groupField):"Groups"} value={grouped.length}                      icon={Layers}      accent={accent} delay={120}/>
        {numField&&<StatCard label={`Avg ${fL(numField)}`} value={fmtN(arrAvg(rows.map(r=>Number(r[numField]||r._raw?.[numField]||0)).filter(v=>v>0)))} icon={Activity} accent={accent} delay={180}/>}
        {!numField&&<StatCard label="Data Sources" value={uniq(rows.map(r=>r.source||"")).filter(Boolean).length||"—"} icon={Wifi} accent={accent} delay={180}/>}
      </div>

      {grouped.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
          {/* Grouped bar */}
          <div className="mkt-card" style={{padding:"16px"}}>
            <div className="section-label" style={{marginBottom:6}}>Distribution by {groupField?fL(groupField):"Group"}</div>
            <div style={{fontSize:13,fontWeight:600,fontFamily:"'Syne',sans-serif",marginBottom:14}}>{grouped.length} unique values</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={grouped} layout="vertical" margin={{left:-4,right:56,top:0,bottom:0}}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)" horizontal={false}/>
                <XAxis type="number" tick={{fill:"rgba(255,255,255,0.18)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} width={90}/>
                <Tooltip content={<MktTooltip accent={accent}/>}/>
                <Bar dataKey="value" radius={[0,6,6,0]} isAnimationActive animationDuration={1000}
                  label={{position:"right",fill:"var(--faint)",fontSize:8,fontFamily:"'JetBrains Mono',monospace",formatter:v=>v}}>
                  {grouped.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.85}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut */}
          <div className="mkt-card" style={{padding:"16px"}}>
            <div className="section-label" style={{marginBottom:6}}>Share Breakdown</div>
            <div style={{fontSize:11,color:"var(--faint)",marginBottom:12,fontFamily:"'Syne',sans-serif"}}>Top {Math.min(8,grouped.length)} categories</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={grouped.slice(0,8)} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={4} dataKey="value" isAnimationActive animationDuration={1200}>
                  {grouped.slice(0,8).map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
                </Pie>
                <Tooltip content={<MktTooltip accent={accent}/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
              {grouped.slice(0,8).map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:"var(--muted)",fontFamily:"'Syne',sans-serif"}}>
                  <div style={{width:8,height:8,borderRadius:2,background:PALETTE[i%PALETTE.length],flexShrink:0}}/>
                  {short(d.name,12)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Crop breakdown if available */}
      {cropBreakdown.length>1&&groupField!=="crop"&&(
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>Crop Coverage Heatmap</div>
          <HeatMap data={cropBreakdown.slice(0,36)} accent={accent} valueKey="value" nameKey="name"/>
        </div>
      )}

      {/* Numeric distribution */}
      {numData.length>1&&(
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>Avg {fL(numField)} by {groupField?fL(groupField):"Group"}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={numData} margin={{left:0,right:12,top:4,bottom:36}}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)" vertical={false}/>
              <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end"/>
              <YAxis tick={{fill:"rgba(255,255,255,0.18)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <Tooltip content={<MktTooltip accent={accent}/>}/>
              <Bar dataKey="value" radius={[5,5,0,0]} isAnimationActive animationDuration={1100}>
                {numData.map((_,i)=><Cell key={i} fill={PALETTE[(i+5)%PALETTE.length]} fillOpacity={0.82}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Treemap of groups */}
      {grouped.length>4&&(
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>{fL(groupField||"group")} Treemap</div>
          <ResponsiveContainer width="100%" height={180}>
            <Treemap data={grouped.slice(0,20)} dataKey="value" nameKey="name" isAnimationActive animationDuration={1000} content={<TreemapCell/>}>
              <Tooltip content={<MktTooltip accent={accent}/>}/>
            </Treemap>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   EQUIPMENT VIZ
═══════════════════════════════════════════════════════════════ */
const EquipmentViz = ({ rows, loading, accent }) => {
  const byCategory  = useMemo(()=>countBy(rows,"category").slice(0,12),[rows]);
  const byState     = useMemo(()=>countBy(rows,"state").slice(0,12),[rows]);
  const rateData    = useMemo(()=>groupAvg(rows,"category","rate_per_day").slice(0,10),[rows]);
  const hourlyData  = useMemo(()=>groupAvg(rows,"category","rate_per_hour").slice(0,10),[rows]);
  const activeCount = rows.filter(r=>r.status==="Active").length;
  const avgDay      = arrAvg(rows.map(r=>r.rate_per_day).filter(v=>v>0));
  const avgHour     = arrAvg(rows.map(r=>r.rate_per_hour).filter(v=>v>0));
  const stateRates  = useMemo(()=>groupAvg(rows,"state","rate_per_day").slice(0,12),[rows]);

  if(loading) return <ChartSkeleton h={500} label="Loading equipment rental data…" accent={accent}/>;

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <StatCard label="Total Providers"  value={rows.length}              icon={Tractor}     accent={accent} delay={0}   sub={`${uniq(rows.map(r=>r.state)).filter(Boolean).length} states`}/>
        <StatCard label="Active"           value={activeCount}              icon={Activity}    accent="#4ade80" delay={60} sub={`${rows.length-activeCount} inactive`}/>
        <StatCard label="Avg Daily Rate"   value={fmtM(avgDay)}             icon={CircleDollarSign} accent={accent} delay={120} sub="Market average"/>
        <StatCard label="Categories"       value={byCategory.length}        icon={Layers}      accent={accent} delay={180} sub="Equipment types"/>
      </div>

      {/* Category treemap + state distribution */}
      <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:14}}>
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:6}}>Category Distribution · Treemap</div>
          <div style={{fontSize:12,fontWeight:600,fontFamily:"'Syne',sans-serif",marginBottom:12}}>{byCategory.length} equipment categories</div>
          <ResponsiveContainer width="100%" height={230}>
            <Treemap data={byCategory} dataKey="value" nameKey="name" isAnimationActive animationDuration={1100} content={<TreemapCell/>}>
              <Tooltip content={<MktTooltip accent={accent}/>}/>
            </Treemap>
          </ResponsiveContainer>
        </div>

        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>Active vs Inactive by State</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byState} layout="vertical" margin={{left:-4,right:12,top:0,bottom:0}}>
              <XAxis type="number" tick={{fill:"rgba(255,255,255,0.18)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} width={80}/>
              <Tooltip content={<MktTooltip accent={accent}/>}/>
              <Bar dataKey="value" radius={[0,5,5,0]} isAnimationActive animationDuration={1000}>
                {byState.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.82}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rate comparison */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:6}}>Daily Rental Rate by Category</div>
          <div style={{fontSize:11,color:"var(--faint)",marginBottom:12,fontFamily:"'Syne',sans-serif"}}>Average ₹ per day</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={rateData} layout="vertical" margin={{left:-4,right:72,top:0,bottom:0}}>
              <XAxis type="number" tickFormatter={v=>`₹${Math.round(v/1000)}k`} tick={{fill:"rgba(255,255,255,0.18)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} width={90}/>
              <Tooltip content={<MktTooltip accent={accent} isMoney/>}/>
              <Bar dataKey="value" radius={[0,6,6,0]} isAnimationActive animationDuration={1100}
                label={{position:"right",fill:"var(--faint)",fontSize:8,fontFamily:"'JetBrains Mono',monospace",formatter:v=>fmtM(v)}}>
                {rateData.map((_,i)=><Cell key={i} fill={PALETTE[(i+2)%PALETTE.length]} fillOpacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:6}}>State-wise Avg Daily Rate</div>
          <div style={{fontSize:11,color:"var(--faint)",marginBottom:12,fontFamily:"'Syne',sans-serif"}}>Rental cost comparison</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={stateRates} margin={{left:0,right:12,top:4,bottom:40}}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--soft)" vertical={false}/>
              <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"'Syne',sans-serif"}} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end"/>
              <YAxis tickFormatter={v=>`₹${Math.round(v/1000)}k`} tick={{fill:"rgba(255,255,255,0.18)",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <Tooltip content={<MktTooltip accent={accent} isMoney/>}/>
              {avgDay>0&&<ReferenceLine y={avgDay} stroke={`${accent}55`} strokeDasharray="4 4" label={{value:"AVG",position:"insideRight",fill:`${accent}80`,fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}/>}
              <Bar dataKey="value" radius={[5,5,0,0]} isAnimationActive animationDuration={1000}>
                {stateRates.map((r,i)=><Cell key={i} fill={r.value>avgDay?accent:PALETTE[3]} fillOpacity={0.82}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rate vs hourly scatter */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* Hourly rates */}
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:12}}>Hourly Rate by Category</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {hourlyData.map((r,i)=>{
              const pct=r.value/(Math.max(...hourlyData.map(d=>d.value))||1);
              const col=PALETTE[(i+7)%PALETTE.length];
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{width:80,fontSize:9,color:"var(--muted)",fontFamily:"'Syne',sans-serif",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</span>
                  <div style={{flex:1,height:7,background:"var(--soft)",borderRadius:4,overflow:"hidden"}}>
                    <div className="hbar-fill" style={{height:"100%",width:`${pct*100}%`,background:col,borderRadius:4}}/>
                  </div>
                  <span style={{width:60,fontSize:9,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:col,textAlign:"right"}}>{fmtM(r.value)}/hr</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Provider status donut */}
        <div className="mkt-card" style={{padding:"16px"}}>
          <div className="section-label" style={{marginBottom:10}}>Provider Status Distribution</div>
          {rows.length>0?(
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[{name:"Active",value:activeCount},{name:"Inactive",value:rows.length-activeCount}]} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={4} dataKey="value" isAnimationActive animationDuration={1200}>
                    <Cell fill={accent}/>
                    <Cell fill="var(--soft-strong)"/>
                  </Pie>
                  <Tooltip content={<MktTooltip accent={accent}/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:8}}>
                {[{label:"Active",val:activeCount,col:accent},{label:"Inactive",val:rows.length-activeCount,col:"var(--faint)"}].map(s=>(
                  <div key={s.label} style={{textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:s.col}}>{s.val}</div>
                    <div style={{fontSize:9,color:"var(--faint)",fontFamily:"'Syne',sans-serif"}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          ):<div style={{height:180,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--faint)",fontSize:11}}>No status data</div>}
        </div>
      </div>

      {/* Equipment heatmap */}
      {byCategory.length>0&&(
        <div className="mkt-card" style={{padding:"16px"}}>
          <HeatMap data={byCategory.slice(0,24)} label="Equipment Category Density Heatmap" accent={accent} valueKey="value" nameKey="name"/>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   QUICK INSIGHTS PANEL
═══════════════════════════════════════════════════════════════ */
const QuickInsights = ({ rows, tab, accent, payload }) => {
  const insights = useMemo(()=>{
    if(!rows.length) return [];
    if(tab==="prices"||tab==="trends"){
      const vals=rows.map(r=>r.modal_price).filter(v=>v>0);
      const avg=arrAvg(vals); const max=arrMax(vals); const min=arrMin(vals);
      const topRow=rows.find(r=>r.modal_price===max);
      return [
        `Average modal price: ${fmtM(avg)}`,
        topRow?`Highest: ${topRow.commodity||topRow.market||"—"} @ ${fmtM(max)}`:"",
        `Price range: ${fmtM(min)} – ${fmtM(max)}`,
        `${uniq(rows.map(r=>r.market)).filter(Boolean).length} markets tracked`,
        `${uniq(rows.map(r=>r.state)).filter(Boolean).length} states covered`,
      ].filter(Boolean);
    }
    if(tab==="msp"){
      const sorted=[...rows].sort((a,b)=>b.msp-a.msp);
      return [
        sorted[0]?`Highest MSP: ${sorted[0].commodity} @ ${fmtM(sorted[0].msp)}`:"",
        sorted.at(-1)?`Lowest MSP: ${sorted.at(-1).commodity} @ ${fmtM(sorted.at(-1).msp)}`:"",
        `${rows.length} crops with MSP support`,
        rows[0]?.season?`Season: ${rows[0].season}`:"",
        `Avg MSP: ${fmtM(arrAvg(rows.map(r=>r.msp).filter(v=>v>0)))}`,
      ].filter(Boolean);
    }
    if(tab==="mandis"){
      return [
        `${rows.length} mandis in database`,
        `${uniq(rows.map(r=>r.state)).filter(Boolean).length} states represented`,
        `${rows.filter(r=>r.lat&&r.lng).length} with geo coordinates`,
        `${uniq(rows.map(r=>r.district)).filter(Boolean).length} districts covered`,
      ];
    }
    if(tab==="equipment"){
      const avgDay=arrAvg(rows.map(r=>r.rate_per_day).filter(v=>v>0));
      return [
        `${rows.length} equipment providers`,
        `${rows.filter(r=>r.status==="Active").length} active providers`,
        `Avg daily rate: ${fmtM(avgDay)}`,
        `${uniq(rows.map(r=>r.category)).filter(Boolean).length} equipment types`,
        `${uniq(rows.map(r=>r.state)).filter(Boolean).length} states covered`,
      ];
    }
    if(tab==="cold"){
      const avail=rows.reduce((s,r)=>s+Number(r._raw?.available_capacity_mt||0),0);
      const req=rows.reduce((s,r)=>s+Number(r._raw?.capacity_required_mt||0),0);
      return [`Available: ${fmtN(Math.round(avail/1000))}K MT`,`Required: ${fmtN(Math.round(req/1000))}K MT`,`${rows.length} states tracked`];
    }
    return [`${rows.length} records loaded`,...(payload?.source?[`Source: ${payload.source}`]:[])];
  },[rows,tab,payload]);

  if(!insights.length) return null;
  return (
    <div style={{padding:"14px 16px"}}>
      <div className="section-label" style={{marginBottom:10}}>Quick Insights</div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {insights.map((ins,i)=>(
          <div key={i} className="mkt-fade-up" style={{fontSize:10.5,color:"var(--muted)",lineHeight:1.5,paddingLeft:10,borderLeft:`2px solid ${accent}45`,animationDelay:`${i*40}ms`,fontFamily:"'Syne',sans-serif"}}>
            {ins}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN MARKET PAGE
═══════════════════════════════════════════════════════════════ */
const Market = () => {
  const [activeTab,    setActiveTab]    = useState("prices");
  const [rows,         setRows]         = useState([]);
  const [payload,      setPayload]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [stateF,       setStateF]       = useState("");
  const [commodityF,   setCommodityF]   = useState("");
  const [districtF,    setDistrictF]    = useState("");
  const [marketF,      setMarketF]      = useState("");
  const [selectedRow,  setSelectedRow]  = useState(null);
  const [viewMode,     setViewMode]     = useState("split");   // split | viz | table
  const [allStates,    setAllStates]    = useState([]);
  const [allCommodities,setAllCommodities]=useState([]);
  const [tick,         setTick]         = useState(0);
  const [updatedAt,    setUpdatedAt]    = useState("");
  const [showRight,    setShowRight]    = useState(true);

  const tabMeta = TABS.find(t=>t.id===activeTab)||TABS[0];
  const accent  = tabMeta.accent;
  const pageBg = "transparent";
  const panelBg = "transparent";

  /* bootstrap filter lists */
  useEffect(()=>{
    let alive=true;
    Promise.all([apiTry(["/api/v1/market/live-market/states"]),apiTry(["/api/v1/market/live-market/commodities"])])
      .then(([s,c])=>{ if(!alive) return; setAllStates(uniq(s?.states||[])); setAllCommodities(uniq(c?.commodities||[])); })
      .catch(()=>{});
    return ()=>{ alive=false; };
  },[]);

  /* load tab data */
  const load = useCallback(async()=>{
    setLoading(true); setError("");
    const filters={state:stateF,commodity:commodityF,district:districtF,market:marketF,search};
    if(activeTab==="trends"&&!commodityF) filters.commodity=allCommodities[0]||"Wheat";
    try {
      const res=await apiTry(getEndpoints(activeTab,filters))||{};
      let norm;
      if(activeTab==="prices")    norm=normPrices(res);
      else if(activeTab==="msp")  norm=normMsp(res);
      else if(activeTab==="mandis") norm=normMandis(res);
      else if(activeTab==="trends") norm=normTrends(res);
      else if(activeTab==="equipment") norm=normEquipment(res);
      else norm=normGeneric(res);
      setPayload(res); setRows(norm); setSelectedRow(null);
      setUpdatedAt(new Date().toISOString());
    } catch(e) {
      setRows([]); setPayload(null);
      setError(e?.message||"Backend request failed");
    } finally { setLoading(false); }
  },[activeTab,stateF,commodityF,districtF,marketF,search,allCommodities]);

  useEffect(()=>{ load(); },[load,tick]);

  /* auto-set commodity for trends */
  useEffect(()=>{
    if(activeTab==="trends"&&!commodityF&&allCommodities.length) setCommodityF(allCommodities[0]);
  },[activeTab,allCommodities]);

  /* reset on tab change */
  useEffect(()=>{ setSelectedRow(null); setSearch(""); setStateF(""); setCommodityF(""); setDistrictF(""); setMarketF(""); },[activeTab]);

  /* derived */
  const visibleRows = useMemo(()=>{
    if(!search.trim()) return rows;
    const q=search.toLowerCase();
    return rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q));
  },[rows,search]);

  const tableCols = useMemo(()=>{
    const preferred=TAB_COLS[activeTab]||[];
    if(!visibleRows.length) return preferred;
    const dynamic=Object.keys(visibleRows[0]||{}).filter(k=>!["id","_raw"].includes(k)&&typeof visibleRows[0][k]!=="object");
    return uniq([...preferred,...dynamic]).slice(0,8);
  },[activeTab,visibleRows]);

  const stateOpts = useMemo(()=>uniq([...allStates,...rows.map(r=>r.state||r._raw?.state||"")]).filter(Boolean).sort(),[allStates,rows]);
  const commOpts  = useMemo(()=>uniq([...allCommodities,...rows.map(r=>r.commodity||r._raw?.commodity||r.crop||"")]).filter(Boolean).sort(),[allCommodities,rows]);
  const distOpts  = useMemo(()=>uniq(rows.map(r=>r.district||r._raw?.district||"")).filter(Boolean).sort(),[rows]);
  const mktOpts   = useMemo(()=>uniq(rows.map(r=>r.market||r.name||"")).filter(Boolean).sort(),[rows]);

  /* price change for header */
  const priceChgPct = useMemo(()=>{
    if(activeTab!=="prices"&&activeTab!=="trends") return null;
    const vals=(activeTab==="prices"?visibleRows.map(r=>r.modal_price):visibleRows.map(r=>r.modal_price)).filter(v=>v>0);
    if(vals.length<2) return null;
    return pctChg(vals[vals.length-1],vals[0]);
  },[activeTab,visibleRows]);

  const renderViz = ()=>{
    const p={rows:visibleRows,loading,accent,payload,tab:activeTab,commodityF};
    switch(activeTab){
      case "prices":     return <PricesViz {...p}/>;
      case "msp":        return <MspViz {...p}/>;
      case "trends":     return <TrendsViz {...p}/>;
      case "mandis":     return <MandisViz {...p}/>;
      case "cold":       return <ColdViz {...p}/>;
      case "reservoir":  return <ReservoirViz {...p}/>;
      case "equipment":  return <EquipmentViz {...p}/>;
      default:           return <GenericViz {...p}/>;
    }
  };

  /* ── RENDER ── */
  return (
    <div style={{fontFamily:"'Syne','Inter',system-ui,sans-serif",display:"flex",flexDirection:"column",height:"calc(100vh - 68px)",overflow:"hidden",background:pageBg,color:"var(--text)",marginTop:"-24px",marginLeft:"-24px",marginRight:"-24px",width:"calc(100% + 48px)"}}>

      {/* ── STICKY HEADER ── */}
      <div style={{position:"sticky",top:0,zIndex:50,flexShrink:0,background:panelBg,borderBottom:"1px solid var(--border)"}}>

        {/* Top bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {updatedAt&&(
              <span style={{fontSize:9.5,color:"var(--muted)",fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",gap:5}}>
                <Clock size={9}/>{new Date(updatedAt).toLocaleTimeString("en-IN")}
              </span>
            )}
            {priceChgPct!==null&&(
              <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20,background:priceChgPct>=0?`${accent}18`:"rgba(34,197,94,0.12)",color:priceChgPct>=0?accent:"#16a34a",display:"flex",alignItems:"center",gap:4,fontFamily:"'JetBrains Mono',monospace",border:`1px solid ${priceChgPct>=0?accent+"30":"rgba(34,197,94,0.3)"}`}}>
                {priceChgPct>=0?<ArrowUpRight size={11}/>:<ArrowDownRight size={11}/>}{priceChgPct>=0?"+":""}{priceChgPct.toFixed(2)}%
              </span>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* View toggles */}
            <div style={{display:"flex",gap:2,background:"var(--soft)",borderRadius:9,padding:"3px"}}>
              {[["split","Split",LayoutGrid],["viz","Viz",BarChart3],["table","Table",Table]].map(([mode,title,Icon])=>(
                <button key={mode} title={title} className={`mkt-btn${viewMode===mode?" active-btn":""}`}
                  onClick={()=>setViewMode(mode)} type="button" style={{padding:"5px 10px",border:"none",borderRadius:6}}>
                  <Icon size={13}/>
                </button>
              ))}
            </div>
            <button className={`mkt-btn mkt-sidebar-toggle${showRight?"":" active-btn"}`} type="button" onClick={()=>setShowRight(v=>!v)} title="Toggle sidebar"><Eye size={12}/></button>
            <button className="mkt-btn" type="button" onClick={()=>setTick(v=>v+1)}>
              <RefreshCw size={12} className={loading?"mkt-spin":""}/>Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:2,padding:"0 16px",borderTop:"1px solid var(--soft)",overflowX:"auto"}} className="mkt-scroll">
          {TABS.map(tab=>{
            const Icon=tab.icon; const active=activeTab===tab.id;
            return (
              <button key={tab.id} type="button" className={`mkt-tab-btn${active?" active":""}`}
                style={{"--tab-accent":tab.accent,background:active?tab.bg:"transparent"}}
                onClick={()=>setActiveTab(tab.id)}>
                <Icon size={12}/>{tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mkt-fade-in" style={{padding:"12px 20px",background:panelBg,borderTop:"1px solid var(--border)",display:"flex",gap:9,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{position:"relative",minWidth:190}}>
              <Search size={11} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--faint)"}}/>
              <input className="mkt-inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search rows…" style={{width:190}}/>
            </div>
            {stateOpts.length>0&&(
              <select className="mkt-sel" value={stateF} onChange={e=>setStateF(e.target.value)} style={{minWidth:140}}>
                <option value="">All States</option>
                {stateOpts.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {["prices","msp","trends","mandis"].includes(activeTab)&&commOpts.length>0&&(
              <select className="mkt-sel" value={commodityF} onChange={e=>setCommodityF(e.target.value)} style={{minWidth:140}}>
                <option value="">All Commodities</option>
                {commOpts.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {["prices","mandis","trends"].includes(activeTab)&&distOpts.length>0&&(
              <select className="mkt-sel" value={districtF} onChange={e=>setDistrictF(e.target.value)} style={{minWidth:130}}>
                <option value="">All Districts</option>
                {distOpts.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            )}
            {["prices","trends"].includes(activeTab)&&mktOpts.length>0&&(
              <select className="mkt-sel" value={marketF} onChange={e=>setMarketF(e.target.value)} style={{minWidth:140}}>
                <option value="">All Markets</option>
                {mktOpts.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <button className="mkt-btn" type="button" onClick={()=>{setSearch("");setStateF("");setCommodityF("");setDistrictF("");setMarketF("");}}>
              <X size={11}/> Clear
            </button>
            <span style={{fontSize:10,color:"var(--faint)",fontFamily:"'Syne',sans-serif",alignSelf:"center"}}>
              {visibleRows.length} of {rows.length} rows
            </span>
        </div>
      </div>

      {/* ── TICKER TAPE (prices/msp only) ── */}
      {(activeTab==="prices"||activeTab==="msp")&&visibleRows.length>4&&(
        <TickerTape rows={visibleRows} accent={accent}/>
      )}

      {/* ── ERROR ── */}
      {error&&(
        <div style={{margin:"12px 20px",padding:"12px 16px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.22)",borderRadius:11,fontSize:11,color:"#86efac",display:"flex",gap:9,alignItems:"center",fontFamily:"'Syne',sans-serif"}}>
          <AlertCircle size={14} color="#16a34a"/> {error}
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{display:"grid",gridTemplateColumns:viewMode==="table"?"1fr":`1fr${showRight?" 280px":""}`,flex:1,minHeight:0}}>

        {/* ── LEFT: VIZ + TABLE ── */}
        <div style={{borderRight:showRight&&viewMode!=="table"?"1px solid var(--soft)":"none",overflowY:"auto"}} className="mkt-scroll">
          <div style={{padding:"10px 20px 20px"}}>

            {/* VIZ section */}
            {viewMode!=="table"&&renderViz()}

            {/* TABLE section */}
            {(viewMode==="table"||viewMode==="split")&&(
              <div style={{marginTop:viewMode==="split"?20:0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div>
                    <div style={{fontSize:10,color:"var(--faint)",textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:"'Syne',sans-serif",marginBottom:4}}>Raw Data Table</div>
                    <div style={{fontSize:14,fontWeight:600,fontFamily:"'Syne',sans-serif"}}>{tabMeta.label} · {visibleRows.length} rows</div>
                  </div>
                  {viewMode==="table"&&(
                    <div style={{position:"relative"}}>
                      <Search size={11} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--faint)"}}/>
                      <input className="mkt-inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{width:200}}/>
                    </div>
                  )}
                </div>
                <div className="mkt-card" style={{overflow:"hidden"}}>
                  <DataTable rows={visibleRows} cols={tableCols} selected={selectedRow} onSelect={setSelectedRow} accent={accent} maxH={viewMode==="table"?"calc(100vh - 260px)":340}/>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        {showRight&&viewMode!=="table"&&(
          <div style={{display:"flex",flexDirection:"column",overflowY:"auto",background:panelBg,borderLeft:"1px solid var(--border)"}} className="mkt-scroll">

            {/* Tab meta */}
            <div style={{padding:"16px 16px 12px",borderBottom:"1px solid var(--soft)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                {(()=>{ const I=tabMeta.icon; return <I size={13} color={accent}/>; })()}
                <span className="section-label">{tabMeta.label}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  ["Records",  visibleRows.length],
                  ["Source",   payload?.source||"backend"],
                  ["Cache",    payload?.cache_hit?"⚡ Hit":"🔴 Live"],
                  ["Updated",  updatedAt?new Date(updatedAt).toLocaleTimeString("en-IN"):"—"],
                  ["Filters",  [stateF,commodityF,districtF,marketF].filter(Boolean).join(", ")||"None"],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0"}}>
                    <span style={{fontSize:9,color:"var(--faint)",fontFamily:"'Syne',sans-serif",textTransform:"uppercase",letterSpacing:"0.08em"}}>{k}</span>
                    <span style={{fontSize:9.5,color:"var(--muted)",fontFamily:"'JetBrains Mono',monospace",maxWidth:130,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Accent progress bar for rows */}
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--soft)"}}>
              <div style={{fontSize:9,color:"var(--faint)",marginBottom:6,fontFamily:"'Syne',sans-serif",textTransform:"uppercase",letterSpacing:"0.08em"}}>Data Load Quality</div>
              <div style={{height:5,background:"var(--soft)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:rows.length>0?"100%":"0%",background:`linear-gradient(90deg,${accent},${accent}80)`,borderRadius:3,transition:"width 0.8s ease"}}/>
              </div>
              <div style={{fontSize:9,color:`${accent}99`,marginTop:5,fontFamily:"'Syne',sans-serif"}}>{rows.length>0?"Loaded successfully":"No data"}</div>
            </div>

            {/* Spotlight */}
            <div style={{borderBottom:"1px solid var(--soft)"}}>
              <div style={{padding:"12px 16px 4px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span className="section-label">Record Spotlight</span>
                {selectedRow&&<button className="mkt-btn" style={{padding:"2px 7px",fontSize:9}} onClick={()=>setSelectedRow(null)} type="button"><X size={9}/></button>}
              </div>
              <Spotlight row={selectedRow} tab={activeTab} accent={accent}/>
            </div>

            {/* Quick insights */}
            <div style={{borderBottom:"1px solid var(--soft)"}}>
              <QuickInsights rows={visibleRows} tab={activeTab} accent={accent} payload={payload}/>
            </div>

            {/* Tab navigation shortcuts */}
            <div style={{padding:"14px 16px"}}>
              <div className="section-label" style={{marginBottom:10}}>Jump to Tab</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {TABS.filter(t=>t.id!==activeTab).slice(0,5).map(t=>{
                  const I=t.icon;
                  return (
                    <button key={t.id} type="button" onClick={()=>setActiveTab(t.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,background:"var(--soft-subtle)",border:"1px solid var(--soft)",cursor:"pointer",color:"var(--muted)",fontSize:10,fontFamily:"'Syne',sans-serif",transition:"all 0.15s",textAlign:"left"}}>
                      <I size={11} color={t.accent}/>{t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Market;
