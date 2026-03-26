import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { apiTry } from "../api/client";
import NodeGraph from "../components/canvas/NodeGraph";
import Badge from "../components/ui/Badge";

const ARCHITECTURE_ROWS = [
  { node: "Farmer Input", service: "chat-gateway", role: "Accepts voice/text query", output: "raw user request" },
  { node: "Voice STT (Sarvam)", service: "voice:8007", role: "Speech-to-text conversion", output: "normalized text" },
  { node: "Agent Orchestrator", service: "agent:8006", role: "Intent routing and tool planning", output: "tool call plan" },
  { node: "Market Tool", service: "market:8004", role: "Commodity and mandi intelligence", output: "market insights" },
  { node: "Schemes Tool", service: "schemes:8009", role: "Government scheme retrieval", output: "scheme eligibility" },
  { node: "Crop Advisory Tool", service: "crop:8003", role: "Crop recommendations", output: "advisory actions" },
  { node: "Equipment Tool", service: "equipment:8005", role: "Rental and inventory data", output: "equipment options" },
  { node: "Weather Tool", service: "market:8004", role: "Weather signal enrichment", output: "weather context" },
  { node: "Geo Tool", service: "geo:8010", role: "Village and district lookup", output: "location context" },
  { node: "Session Memory", service: "redis", role: "Conversation context retention", output: "memory state" },
  { node: "Response Builder", service: "agents+tools", role: "Aggregates all tool outputs", output: "final response object" },
  { node: "TTS Output", service: "voice:8007", role: "Text-to-speech synthesis", output: "audio response" },
  { node: "Text Response", service: "gateway", role: "Returns final textual answer", output: "chat payload" },
];

const AgentSystem = () => {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [keyPool, setKeyPool] = useState(null);

  const loadSessions = useCallback(async () => {
    const data = await apiTry([
      "/api/v1/agent/sessions",
      "/api/v1/agent/conversations/",
    ]);
    const list = data.sessions || data.conversations || [];
    setSessions(list);
    if (list.length) {
      setSelected((prev) => prev || list[0]);
    }
  }, []);

  const loadDetail = useCallback(async (session) => {
    if (!session) return;
    setSelected(session);
    const id = session.session_id || session.id;
    const data = await apiTry([
      `/api/v1/agent/sessions/${id}`,
      `/api/v1/agent/conversations/${id}`,
      `/api/v1/agent/conversations/${id}/`,
    ]);
    setDetail(data);
  }, []);

  useEffect(() => {
    loadSessions().catch(() => setSessions([]));
  }, [loadSessions]);

  useEffect(() => {
    if (selected) {
      loadDetail(selected).catch(() => setDetail(null));
    }
  }, [selected, loadDetail]);

  const activeNodes = useMemo(() => {
    const tools = (detail?.tools_called || []).map((x) => String(x).toLowerCase());
    const nodes = ["orchestrator", "response", "text"];
    if (tools.some((t) => t.includes("market"))) nodes.push("market");
    if (tools.some((t) => t.includes("scheme"))) nodes.push("schemes");
    if (tools.some((t) => t.includes("crop"))) nodes.push("crop");
    if (tools.some((t) => t.includes("weather"))) nodes.push("weather");
    if (tools.some((t) => t.includes("geo"))) nodes.push("geo");
    return nodes;
  }, [detail]);

  const fetchKeyPool = async () => {
    const data = await apiTry(["/api/v1/agent/key-pool/status", "/api/v1/agent/keys/status"]);
    setKeyPool(data);
  };

  const selectedId = selected?.session_id || selected?.id;

  return (
    <div className="space-y-3">
      <div className="panel p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg text-white/95">Node Flow</h3>
          <button type="button" className="action-btn" onClick={fetchKeyPool}><KeyRound size={13} /> Key Pool Status</button>
        </div>
        <NodeGraph activeNodes={activeNodes} />
      </div>

      <div className="panel p-3">
        <h3 className="font-display text-lg text-white/95">Architecture Used</h3>
        <p className="mt-1 text-xs text-white/70">
          The system follows an orchestrator-driven multi-tool architecture: input normalization, centralized routing, tool fan-out, memory-assisted synthesis, and dual-mode output (text plus TTS).
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/15 text-[10px] uppercase tracking-wide text-white/45">
                <th className="px-2 py-2">Node</th>
                <th className="px-2 py-2">Service</th>
                <th className="px-2 py-2">Architecture Responsibility</th>
                <th className="px-2 py-2">Output</th>
              </tr>
            </thead>
            <tbody>
              {ARCHITECTURE_ROWS.map((row) => (
                <tr key={row.node} className="border-b border-white/10 text-white/82">
                  <td className="px-2 py-2 text-white/94">{row.node}</td>
                  <td className="px-2 py-2 text-white/70">{row.service}</td>
                  <td className="px-2 py-2">{row.role}</td>
                  <td className="px-2 py-2 text-white/68">{row.output}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="panel p-3 xl:col-span-4">
          <h3 className="mb-2 font-display text-lg text-white/95">Agent Sessions</h3>
          <div className="max-h-[420px] space-y-2 overflow-y-auto text-xs xl:max-h-[640px]">
            {sessions.map((s) => {
              const id = s.session_id || s.id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`w-full rounded-lg border p-2 text-left ${selectedId === id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/[0.02]"}`}
                  onClick={() => setSelected(s)}
                >
                  <p className="break-all text-white/85">{id}</p>
                  <p className="text-[10px] text-white/40">{s.language || "-"} • {s.message_count || 0} msgs</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel p-3 xl:col-span-5">
          <h3 className="mb-2 font-display text-lg text-white/95">Session Detail</h3>
          <div className="max-h-[420px] space-y-2 overflow-y-auto text-xs xl:max-h-[640px]">
            {(detail?.messages || []).map((m, idx) => (
              <div key={`${idx}-${m.timestamp || ""}`} className={`rounded-xl border p-2 ${m.role === "assistant" ? "ml-4 border-white/15 bg-white/[0.04] sm:ml-8" : "mr-4 border-white/10 bg-white/[0.02] sm:mr-8"}`}>
                <div className="mb-1 flex items-center justify-between">
                  <Badge tone={m.role === "assistant" ? "blue" : "muted"}>{m.role || "message"}</Badge>
                  <span className="text-[10px] text-white/40">{m.latency_ms ? `${m.latency_ms} ms` : "-"}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-white/85">{m.content || m.message || ""}</p>
                {(m.tools_called || []).length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(m.tools_called || []).map((tool) => (
                      <Badge key={tool} tone="blue">{tool}</Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-3 text-xs text-white/75 xl:col-span-3">
          <h4 className="mb-2 font-display text-lg text-white/95">Key Pool Health</h4>
          {keyPool ? (
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-black/20 p-2 text-[10px]">{JSON.stringify(keyPool, null, 2)}</pre>
          ) : (
            <p className="text-white/45">Click Key Pool Status to fetch allocator snapshot.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentSystem;

