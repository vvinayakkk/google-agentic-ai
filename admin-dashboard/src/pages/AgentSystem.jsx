import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot, Database, Landmark, Mic, MessageCircle, Wrench, Cloud,
  MapPin, Wheat, ListChecks, Volume2, Smartphone, FileText,
  KeyRound, RefreshCw, Download, ChevronDown, ChevronUp,
  Activity, Zap, Clock, Hash, Layers, ArrowRight,
} from "lucide-react";
import { apiTry } from "../api/client";
import Badge from "../components/ui/Badge";

/* ─── node graph data ─────────────────────────────────────────────── */

const NODE_ICON = {
  farmer: Smartphone, stt: Mic, orchestrator: Bot, market: Landmark,
  schemes: ListChecks, crop: Wheat, equipment: Wrench, weather: Cloud,
  geo: MapPin, memory: Database, response: FileText, tts: Volume2, text: MessageCircle,
};

const NODE_COLOR = {
  farmer: "#60A5FA", stt: "#22C55E", orchestrator: "#BFDBFE",
  market: "#FB923C", schemes: "#A78BFA", crop: "#34D399",
  equipment: "#F87171", weather: "#38BDF8", geo: "#2DD4BF",
  memory: "#C084FC", response: "#F1F5F9", tts: "#F97316", text: "#67E8F9",
};

const NODE_DESCRIPTIONS = {
  farmer:       { short: "User input entry point", detail: "Receives raw voice or text from the farmer's app/chat UI and routes into the pipeline.", service: "chat-gateway", type: "input" },
  stt:          { short: "Speech-to-text (Sarvam AI)", detail: "Transcribes farmer audio into normalized text using Sarvam's multilingual STT model.", service: "voice:8007", type: "transform" },
  orchestrator: { short: "Intent router & tool planner", detail: "Central brain — classifies intent, selects tools, coordinates parallel execution and result merging.", service: "agent:8006", type: "core" },
  market:       { short: "Mandi & commodity intelligence", detail: "Pulls live and historical price data, trend analysis, and mandi directory information.", service: "market:8004", type: "tool" },
  schemes:      { short: "Government scheme lookup", detail: "Searches eligibility, benefit details and application links from the schemes knowledge base.", service: "schemes:8009", type: "tool" },
  crop:         { short: "Crop advisory engine", detail: "Provides agronomy recommendations, crop-stage guidance, and disease detection outputs.", service: "crop:8003", type: "tool" },
  equipment:    { short: "Equipment & rental data", detail: "Resolves equipment availability, rental rates, and booking options for a farmer's location.", service: "equipment:8005", type: "tool" },
  weather:      { short: "Weather signal enrichment", detail: "Injects current and forecast weather context into advisory responses via OpenWeather.", service: "market:8004", type: "tool" },
  geo:          { short: "Village & district lookup", detail: "Resolves pincode, village, district hierarchy for location-aware personalisation.", service: "geo:8010", type: "tool" },
  memory:       { short: "Session context store", detail: "Persists conversation state in Redis so follow-up turns stay coherent within a session.", service: "redis", type: "infra" },
  response:     { short: "Response aggregator", detail: "Collects all tool outputs, resolves conflicts, and builds the final structured response object.", service: "agents+tools", type: "transform" },
  tts:          { short: "Text-to-speech synthesis", detail: "Converts the final text answer into base64 audio for voice-first app playback.", service: "voice:8007", type: "output" },
  text:         { short: "Text response delivery", detail: "Returns the final textual payload to the client gateway for display in chat UI.", service: "gateway", type: "output" },
};

const TYPE_COLORS = {
  input:     { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  text: "#60A5FA" },
  core:      { bg: "rgba(191,219,254,0.12)", border: "rgba(191,219,254,0.3)", text: "#BFDBFE" },
  tool:      { bg: "rgba(167,139,250,0.1)",  border: "rgba(167,139,250,0.25)", text: "#A78BFA" },
  transform: { bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.25)",  text: "#34D399" },
  infra:     { bg: "rgba(192,132,252,0.1)",  border: "rgba(192,132,252,0.25)", text: "#C084FC" },
  output:    { bg: "rgba(251,146,60,0.1)",   border: "rgba(251,146,60,0.25)",  text: "#FB923C" },
};

const NODES = [
  { id: "farmer",       x: 60,   y: 190, label: "Farmer Input",         sublabel: "chat-gateway"  },
  { id: "stt",          x: 260,  y: 80,  label: "Voice STT",            sublabel: "voice:8007"    },
  { id: "orchestrator", x: 500,  y: 190, label: "Agent Orchestrator",   sublabel: "agent:8006"    },
  { id: "market",       x: 760,  y: 20,  label: "Market Tool",          sublabel: "market:8004"   },
  { id: "schemes",      x: 760,  y: 105, label: "Schemes Tool",         sublabel: "schemes:8009"  },
  { id: "crop",         x: 760,  y: 190, label: "Crop Advisory",        sublabel: "crop:8003"     },
  { id: "equipment",    x: 760,  y: 275, label: "Equipment Tool",       sublabel: "equipment:8005"},
  { id: "weather",      x: 760,  y: 360, label: "Weather Tool",         sublabel: "market:8004"   },
  { id: "geo",          x: 760,  y: 445, label: "Geo Tool",             sublabel: "geo:8010"      },
  { id: "memory",       x: 500,  y: 360, label: "Session Memory",       sublabel: "redis"         },
  { id: "response",     x: 1000, y: 220, label: "Response Builder",     sublabel: "agents+tools"  },
  { id: "tts",          x: 1230, y: 140, label: "TTS Output",           sublabel: "voice:8007"    },
  { id: "text",         x: 1230, y: 300, label: "Text Response",        sublabel: "gateway"       },
];

const EDGES = [
  ["farmer","stt"],["stt","orchestrator"],
  ["orchestrator","market"],["orchestrator","schemes"],["orchestrator","crop"],
  ["orchestrator","equipment"],["orchestrator","weather"],["orchestrator","geo"],
  ["orchestrator","memory"],
  ["market","response"],["schemes","response"],["crop","response"],
  ["equipment","response"],["weather","response"],["geo","response"],
  ["response","tts"],["response","text"],
];

const NODE_W = 160, NODE_H = 58;
const byId = Object.fromEntries(NODES.map(n => [n.id, n]));

/* ─── pannable canvas ─────────────────────────────────────────────── */

const PannableNodeGraph = ({ activeNodes = [] }) => {
  const svgRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const activeSet = useMemo(() => new Set(activeNodes), [activeNodes]);

  const onMouseDown = (e) => {
    if (e.target.closest(".graph-node")) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const onMouseMove = (e) => {
    if (dragging && dragStart) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const onMouseUp = () => { setDragging(false); setDragStart(null); };

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setScale(s => {
      const next = Math.min(2.5, Math.max(0.3, s * delta));
      const ratio = next / s;
      setPan(p => ({ x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }));
      return next;
    });
  };

  const resetView = () => { setPan({ x: 0, y: 0 }); setScale(1); };

  const hoverInfo = hoveredNode ? NODE_DESCRIPTIONS[hoveredNode] : null;
  const hoverNode = hoveredNode ? byId[hoveredNode] : null;
  const tooltipX = tooltipPos.x + 16;
  const tooltipY = tooltipPos.y - 10;

  return (
    <div style={{ position: "relative" }}>
      {/* controls */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10, display: "flex", gap: 6 }}>
        <button onClick={() => setScale(s => Math.min(2.5, s * 1.2))}
          style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--muted)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        <button onClick={() => setScale(s => Math.max(0.3, s * 0.85))}
          style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--muted)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <button onClick={resetView}
          style={{ height: 28, padding: "0 10px", borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--muted)", cursor: "pointer", fontSize: 11 }}>Reset</button>
      </div>

      {/* hint */}
      <div style={{ position: "absolute", bottom: 10, left: 10, zIndex: 10, fontSize: 10, color: "rgba(255,255,255,0.2)", pointerEvents: "none" }}>
        Drag to pan · Scroll to zoom · Hover nodes for details
      </div>

      <div
        ref={svgRef}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onWheel={onWheel}
        style={{ width: "100%", height: 540, overflow: "hidden", borderRadius: 10, cursor: dragging ? "grabbing" : "grab",
          background: "radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.06) 0%, transparent 60%), rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.07)", position: "relative" }}>

        {/* dot grid */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <defs>
            <pattern id="dot-grid" x={pan.x % (20 * scale)} y={pan.y % (20 * scale)} width={20 * scale} height={20 * scale} patternUnits="userSpaceOnUse">
              <circle cx={10 * scale} cy={10 * scale} r={0.8} fill="rgba(255,255,255,0.12)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        {/* main SVG */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            <marker id="arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M1 1L9 5L1 9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M1 1L9 5L1 9" fill="none" stroke="rgba(167,139,250,0.9)" strokeWidth="1.5" strokeLinecap="round" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            {/* edges */}
            {EDGES.map(([a, b]) => {
              const A = byId[a], B = byId[b];
              const isActive = activeSet.has(a) && activeSet.has(b);
              const x1 = A.x + NODE_W, y1 = A.y + NODE_H / 2;
              const x2 = B.x, y2 = B.y + NODE_H / 2;
              const cx = (x1 + x2) / 2;
              return (
                <path
                  key={`${a}-${b}`}
                  d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={isActive ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.12)"}
                  strokeWidth={isActive ? 1.8 : 1.2}
                  strokeDasharray={isActive ? "none" : "5 4"}
                  markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow-head)"}
                  style={{ transition: "stroke 0.3s" }}
                />
              );
            })}

            {/* nodes */}
            {NODES.map((node) => {
              const Icon = NODE_ICON[node.id] || Bot;
              const iconColor = NODE_COLOR[node.id] || "#fff";
              const desc = NODE_DESCRIPTIONS[node.id] || {};
              const tc = TYPE_COLORS[desc.type] || TYPE_COLORS.tool;
              const active = activeSet.has(node.id);
              const hovered = hoveredNode === node.id;

              return (
                <g
                  key={node.id}
                  className="graph-node"
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* glow ring when active */}
                  {active && (
                    <rect width={NODE_W} height={NODE_H} rx={12}
                      fill="none" stroke={iconColor} strokeWidth={2.5} opacity={0.2}
                      style={{ filter: `drop-shadow(0 0 6px ${iconColor}40)` }} />
                  )}

                  {/* card bg */}
                  <rect width={NODE_W} height={NODE_H} rx={12}
                    fill={hovered ? "rgba(255,255,255,0.07)" : active ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.025)"}
                    stroke={hovered ? "rgba(255,255,255,0.5)" : active ? iconColor : "rgba(255,255,255,0.12)"}
                    strokeWidth={hovered || active ? 1.5 : 1}
                    style={{ transition: "all 0.15s" }}
                  />

                  {/* left accent bar */}
                  <rect x={0} y={12} width={3} height={NODE_H - 24} rx={2} fill={iconColor} opacity={active || hovered ? 1 : 0.4} />

                  {/* icon background */}
                  <rect x={12} y={14} width={28} height={28} rx={7}
                    fill={`${iconColor}18`} stroke={`${iconColor}30`} strokeWidth={1} />

                  {/* icon (via foreignObject) */}
                  <foreignObject x={19} y={21} width={16} height={16}>
                    <Icon size={14} color={iconColor} />
                  </foreignObject>

                  {/* label */}
                  <foreignObject x={48} y={10} width={104} height={24}>
                    <div xmlns="http://www.w3.org/1999/xhtml"
                      style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.92)", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {node.label}
                    </div>
                  </foreignObject>

                  {/* sublabel */}
                  <foreignObject x={48} y={36} width={108} height={16}>
                    <div xmlns="http://www.w3.org/1999/xhtml"
                      style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", letterSpacing: "0.02em", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {node.sublabel}
                    </div>
                  </foreignObject>

                  {/* type pill */}
                  <foreignObject x={NODE_W - 44} y={8} width={40} height={14}>
                    <div xmlns="http://www.w3.org/1999/xhtml"
                      style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                        background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text,
                        whiteSpace: "nowrap", textAlign: "center" }}>
                      {(desc.type || "").toUpperCase()}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </g>
        </svg>

        {/* floating tooltip bubble */}
        {hoveredNode && hoverInfo && hoverNode && (
          <div style={{
            position: "absolute",
            left: Math.min(tooltipX, (svgRef.current?.offsetWidth || 800) - 240),
            top: Math.max(8, tooltipY - 80),
            width: 220, pointerEvents: "none", zIndex: 20,
            background: "rgba(18,18,22,0.97)",
            border: `1px solid ${NODE_COLOR[hoveredNode]}40`,
            borderRadius: 10, padding: "10px 12px",
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${NODE_COLOR[hoveredNode]}20`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: `${NODE_COLOR[hoveredNode]}18`, border: `1px solid ${NODE_COLOR[hoveredNode]}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {(() => { const I = NODE_ICON[hoveredNode] || Bot; return <I size={11} color={NODE_COLOR[hoveredNode]} />; })()}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{hoverNode.label}</div>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{hoverNode.sublabel}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, marginBottom: 8 }}>{hoverInfo.detail}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {(() => { const tc = TYPE_COLORS[hoverInfo.type] || TYPE_COLORS.tool; return (
                <span style={{ fontSize: 8.5, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text }}>
                  {(hoverInfo.type || "").toUpperCase()}
                </span>
              ); })()}
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{hoverInfo.service}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── pipeline arch table ──────────────────────────────────────────── */

const PIPELINE_ROWS = [
  { node: "NODE_ALPHA_01", service: "Semantic_Router",  role: "Query Classification",    output: "JSON_STREAM", healthy: true },
  { node: "NODE_GAMMA_09", service: "Vector_RAG_Service", role: "Knowledge Retrieval",  output: "VECTOR_EMBED", healthy: true },
  { node: "NODE_DELTA_12", service: "Inference_Engine",  role: "Natural Lang Generation", output: "TEXT_PLAIN",  healthy: true },
];

const OUTPUT_COLORS = {
  JSON_STREAM:  "#fb923c",
  VECTOR_EMBED: "#a78bfa",
  TEXT_PLAIN:   "#22c55e",
};

/* ─── main ────────────────────────────────────────────────────────── */

const AgentSystem = () => {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [keyPool, setKeyPool] = useState(null);
  const [keyPoolOpen, setKeyPoolOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiTry(["/api/v1/agent/sessions", "/api/v1/agent/conversations/"]);
      const list = data.sessions || data.conversations || data.items || [];
      setSessions(list);
      if (list.length && !selected) setSelected(list[0]);
    } catch {}
    setLoading(false);
  }, [selected]);

  const loadDetail = useCallback(async (session) => {
    if (!session) return;
    setLoadingDetail(true);
    try {
      const id = session.session_id || session.id;
      const data = await apiTry([`/api/v1/agent/sessions/${id}`, `/api/v1/agent/conversations/${id}`, `/api/v1/agent/conversations/${id}/`]);
      setDetail(data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  }, []);

  const fetchKeyPool = async () => {
    try {
      const data = await apiTry(["/api/v1/agent/key-pool/status", "/api/v1/agent/keys/status"]);
      setKeyPool(data);
      setKeyPoolOpen(true);
    } catch { setKeyPool(null); }
  };

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { if (selected) loadDetail(selected); }, [selected]);

  const activeNodes = useMemo(() => {
    const tools = (detail?.tools_called || []).map(x => String(x).toLowerCase());
    const nodes = ["orchestrator", "response", "text"];
    if (tools.some(t => t.includes("market")))   nodes.push("market");
    if (tools.some(t => t.includes("scheme")))   nodes.push("schemes");
    if (tools.some(t => t.includes("crop")))     nodes.push("crop");
    if (tools.some(t => t.includes("weather")))  nodes.push("weather");
    if (tools.some(t => t.includes("geo")))      nodes.push("geo");
    if (tools.some(t => t.includes("equipment"))) nodes.push("equipment");
    return nodes;
  }, [detail]);

  const selectedId = selected?.session_id || selected?.id;

  const keyPoolKeys = keyPool
    ? Array.isArray(keyPool.keys) ? keyPool.keys
      : Array.isArray(keyPool) ? keyPool
      : Object.entries(keyPool).slice(0, 8).map(([k, v]) => ({ key: k, ...v }))
    : [];
  const activeKeyCount = keyPoolKeys.filter(k => !k.exhausted && k.active !== false).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── top row: sessions + session detail ── */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 14 }}>

        {/* sessions list */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Sessions</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {loading && <RefreshCw size={11} color="var(--muted)" style={{ animation: "spin 1s linear infinite" }} />}
              <button onClick={loadSessions} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4, maxHeight: 480 }}>
            {sessions.length === 0 && !loading && (
              <div style={{ padding: "30px 0", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>No sessions found</div>
            )}
            {sessions.map((s) => {
              const id = s.session_id || s.id;
              const isActive = selectedId === id;
              const shortId = id ? id.slice(0, 10).toUpperCase() : "—";
              const farmerName = s.farmer_name || s.user_name || null;
              const farmerId = s.farmer_id || s.user_id || null;
              return (
                <button key={id} onClick={() => setSelected(s)} style={{
                  width: "100%", textAlign: "left", padding: "10px 10px", borderRadius: 8, cursor: "pointer",
                  background: isActive ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? "#22c55e" : "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
                      SES-{shortId}
                    </span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
                      {s.language || "hi"} · {s.message_count || 0} msgs
                    </span>
                  </div>
                  {farmerName && <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 1 }}>{farmerName}</div>}
                  {farmerId && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>ID: {farmerId}</div>}
                  {s.updated_at && <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.2)", marginTop: 3, fontFamily: "monospace" }}>{new Date(s.updated_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* session detail */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* detail header - stats bar */}
          {detail && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "STATUS",  value: detail.status || "Active",     accent: "#22c55e", dot: true },
                { label: "MODEL",   value: detail.model || "GPT-4-AGRI-V2", accent: "var(--text)" },
                { label: "LATENCY", value: detail.avg_latency_ms ? `${detail.avg_latency_ms}ms` : (detail.messages?.[0]?.latency_ms ? `${detail.messages[0].latency_ms}ms` : "—"), accent: "var(--text)" },
                { label: "TOKENS",  value: detail.total_tokens ?? detail.token_count ?? "—", accent: "var(--text)" },
              ].map(({ label, value, accent, dot }) => (
                <div key={label}>
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {dot && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: accent }}>{String(value)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: "12px 14px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Messages</span>
            {loadingDetail && <RefreshCw size={11} color="var(--muted)" style={{ animation: "spin 1s linear infinite" }} />}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 380 }}>
            {!detail && !loadingDetail && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>Select a session to view messages</div>
            )}
            {(detail?.messages || []).map((m, idx) => {
              const isAssistant = m.role === "assistant";
              return (
                <div key={idx} style={{
                  alignSelf: isAssistant ? "flex-start" : "flex-end",
                  maxWidth: "85%", padding: "10px 14px", borderRadius: isAssistant ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                  background: isAssistant ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isAssistant ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.08)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 10 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                      background: isAssistant ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.08)",
                      color: isAssistant ? "#818cf8" : "rgba(255,255,255,0.5)",
                      border: isAssistant ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.1)",
                      textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {m.role || "message"}
                    </span>
                    {m.latency_ms && <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{m.latency_ms}ms</span>}
                  </div>
                  <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.88)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {m.content || m.message || ""}
                  </p>
                  {(m.tools_called || []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {m.tools_called.map(t => (
                        <span key={t} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa", fontFamily: "monospace" }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {m.timestamp && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", marginTop: 6, textAlign: isAssistant ? "left" : "right", fontFamily: "monospace" }}>
                    {new Date(m.timestamp).toLocaleTimeString("en-IN")}
                  </div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── node graph canvas ── */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Node Flow</span>
            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 10 }}>Multi-agent pipeline architecture</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(TYPE_COLORS).map(([type, c]) => (
              <span key={type} style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>{type.toUpperCase()}</span>
            ))}
          </div>
        </div>
        <div style={{ padding: 12 }}>
          <PannableNodeGraph activeNodes={activeNodes} />
        </div>
      </div>

      {/* ── pipeline architecture table ── */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pipeline Architecture</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["NODE","SERVICE","ROLE","OUTPUT TYPE","HEALTH"].map(h => (
                  <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PIPELINE_ROWS.map((row, i) => (
                <tr key={row.node} style={{ borderBottom: i < PIPELINE_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <td style={{ padding: "11px 16px", color: "rgba(255,255,255,0.9)", fontFamily: "monospace", fontSize: 12 }}>{row.node}</td>
                  <td style={{ padding: "11px 16px", color: "rgba(255,255,255,0.6)", fontFamily: "monospace", fontSize: 12 }}>{row.service}</td>
                  <td style={{ padding: "11px 16px", color: "rgba(255,255,255,0.75)" }}>{row.role}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: OUTPUT_COLORS[row.output] || "#888" }}>{row.output}</span>
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.healthy ? "#22c55e" : "#ef4444", boxShadow: row.healthy ? "0 0 5px #22c55e" : "none" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── api key pool ── */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
        <button
          onClick={() => { fetchKeyPool(); setKeyPoolOpen(p => keyPool ? !p : true); }}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KeyRound size={13} color="#f59e0b" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>API Key Pool</span>
            {keyPool && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
                ACTIVE KEYS: {activeKeyCount} / {keyPoolKeys.length}
              </span>
            )}
          </div>
          <ChevronDown size={14} color="var(--muted)" style={{ transform: keyPoolOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
        </button>

        {keyPoolOpen && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "6px 0" }}>
            {!keyPool ? (
              <div style={{ padding: "20px 16px", fontSize: 12, color: "var(--muted)" }}>
                Click above to fetch the allocator snapshot.
              </div>
            ) : keyPoolKeys.length === 0 ? (
              <div style={{ padding: "16px", overflowX: "auto" }}>
                <pre style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
                  {JSON.stringify(keyPool, null, 2)}
                </pre>
              </div>
            ) : keyPoolKeys.map((k, i) => {
              const key = k.key || k.api_key || `sk-agri-·····-${String(i).padStart(3,"0")}`;
              const masked = key.slice(0, 12) + "·····" + key.slice(-4);
              const usage = k.usage_pct ?? (k.requests_used && k.requests_limit ? Math.round(k.requests_used / k.requests_limit * 100) : null);
              const exhausted = k.exhausted || (usage !== null && usage >= 100);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < keyPoolKeys.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: exhausted ? "#ef4444" : "#22c55e", boxShadow: exhausted ? "none" : "0 0 5px #22c55e", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>{masked}</span>
                  {usage !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 80, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
                        <div style={{ width: `${usage}%`, height: "100%", background: exhausted ? "#ef4444" : usage > 80 ? "#f59e0b" : "#22c55e", borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", minWidth: 36 }}>Usage {usage}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentSystem;