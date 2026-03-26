import { useMemo, useState } from "react";
import { Bot, Database, Landmark, Mic, MessageCircle, Wrench, Cloud, MapPin, Wheat, ListChecks, Volume2, Smartphone, FileText } from "lucide-react";

const NODE_ICON = {
  farmer: Smartphone,
  stt: Mic,
  orchestrator: Bot,
  market: Landmark,
  schemes: ListChecks,
  crop: Wheat,
  equipment: Wrench,
  weather: Cloud,
  geo: MapPin,
  memory: Database,
  response: FileText,
  tts: Volume2,
  text: MessageCircle,
};

const NODE_ICON_COLOR = {
  farmer: "#60A5FA",
  stt: "#22C55E",
  orchestrator: "#BFDBFE",
  market: "#FB923C",
  schemes: "#A78BFA",
  crop: "#34D399",
  equipment: "#F87171",
  weather: "#38BDF8",
  geo: "#2DD4BF",
  memory: "#C084FC",
  response: "#F1F5F9",
  tts: "#F97316",
  text: "#67E8F9",
};

const NODE_DESCRIPTIONS = {
  farmer: "Receives user input from chat or app UI and forwards it into the voice or text pipeline.",
  stt: "Converts farmer audio to structured text before orchestration and tool selection.",
  orchestrator: "Chooses tools, coordinates execution order, and builds the response plan.",
  market: "Fetches mandi and commodity pricing intelligence for decision support.",
  schemes: "Resolves scheme eligibility and current benefit details from policy data.",
  crop: "Provides agronomy, crop stage, and intervention recommendations.",
  equipment: "Handles equipment rental availability, inventory, and booking support.",
  weather: "Injects weather and climate signals into advisory responses.",
  geo: "Resolves village, district, and pin hierarchy for location-aware answers.",
  memory: "Stores session context so responses stay consistent across turns.",
  response: "Combines tool outputs into a single structured assistant answer.",
  tts: "Synthesizes final spoken output for voice-first experiences.",
  text: "Returns final textual response to the client gateway.",
};

const NODES = [
  { id: "farmer", x: 80, y: 100, label: "Farmer Input", sublabel: "chat-gateway" },
  { id: "stt", x: 300, y: 56, label: "Voice STT (Sarvam)", sublabel: "voice:8007" },
  { id: "orchestrator", x: 560, y: 100, label: "Agent Orchestrator", sublabel: "agent:8006" },
  { id: "market", x: 820, y: 30, label: "Market Tool", sublabel: "market:8004" },
  { id: "schemes", x: 820, y: 108, label: "Schemes Tool", sublabel: "schemes:8009" },
  { id: "crop", x: 820, y: 186, label: "Crop Advisory Tool", sublabel: "crop:8003" },
  { id: "equipment", x: 820, y: 264, label: "Equipment Tool", sublabel: "equipment:8005" },
  { id: "weather", x: 820, y: 342, label: "Weather Tool", sublabel: "market:8004" },
  { id: "geo", x: 820, y: 420, label: "Geo Tool", sublabel: "geo:8010" },
  { id: "memory", x: 560, y: 280, label: "Session Memory", sublabel: "redis" },
  { id: "response", x: 1080, y: 220, label: "Response Builder", sublabel: "agents+tools" },
  { id: "tts", x: 1320, y: 164, label: "TTS Output", sublabel: "voice:8007" },
  { id: "text", x: 1320, y: 276, label: "Text Response", sublabel: "gateway" },
];

const EDGES = [
  ["farmer", "stt"],
  ["stt", "orchestrator"],
  ["orchestrator", "market"],
  ["orchestrator", "schemes"],
  ["orchestrator", "crop"],
  ["orchestrator", "equipment"],
  ["orchestrator", "weather"],
  ["orchestrator", "geo"],
  ["orchestrator", "memory"],
  ["market", "response"],
  ["schemes", "response"],
  ["crop", "response"],
  ["equipment", "response"],
  ["weather", "response"],
  ["geo", "response"],
  ["response", "tts"],
  ["response", "text"],
];

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

const truncate = (value, max = 26) => {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const Connection = ({ from, to }) => {
  const fromX = from.x + 170;
  const fromY = from.y + 32;
  const toX = to.x;
  const toY = to.y + 32;
  const mid = (fromX + toX) / 2;
  const d = `M${fromX},${fromY} C${mid},${fromY} ${mid},${toY} ${toX},${toY}`;
  return <path d={d} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="6 4" className="flow-dash" />;
};

const NodeGraph = ({ activeNodes = [] }) => {
  const activeSet = useMemo(() => new Set(activeNodes || []), [activeNodes]);
  const [hoveredNode, setHoveredNode] = useState(null);

  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 1540 540" className="w-full min-w-[980px]">
        {EDGES.map(([a, b]) => (
          <Connection key={`${a}-${b}`} from={byId[a]} to={byId[b]} />
        ))}
        {NODES.map((node) => {
          const Icon = NODE_ICON[node.id] || Bot;
          const iconColor = NODE_ICON_COLOR[node.id] || "#FFFFFF";
          const active = activeSet.has(node.id);
          const hovered = hoveredNode === node.id;
          const description = NODE_DESCRIPTIONS[node.id] || "Pipeline node";
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                width="170"
                height="64"
                rx="14"
                fill={hovered ? "rgba(255,255,255,0.07)" : active ? "rgba(255,255,255,0.04)" : "transparent"}
                stroke={active || hovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.32)"}
                strokeWidth={active || hovered ? "1.7" : "1.15"}
              />
              <foreignObject x="10" y="17" width="28" height="28">
                <Icon size={16} color={iconColor} />
              </foreignObject>
              <foreignObject x="44" y="11" width="118" height="30">
                <div xmlns="http://www.w3.org/1999/xhtml" className="overflow-hidden break-words text-[11px] leading-[1.25] text-white/90">
                  {truncate(node.label)}
                </div>
              </foreignObject>
              <text x="44" y="52" fill="rgba(255,255,255,0.48)" fontSize="10" fontFamily="Geist Mono">
                {truncate(node.sublabel, 22)}
              </text>
              <title>{`${node.label}: ${description}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 rounded-xl border border-white/15 bg-white/[0.03] p-2 text-xs text-white/80">
        {hoveredNode ? (
          <>
            <p className="text-white/95">{byId[hoveredNode]?.label}</p>
            <p className="mt-1 text-white/62">{NODE_DESCRIPTIONS[hoveredNode]}</p>
          </>
        ) : (
          <p className="text-white/55">Hover any node to see a detailed role description.</p>
        )}
      </div>
    </div>
  );
};

export default NodeGraph;

