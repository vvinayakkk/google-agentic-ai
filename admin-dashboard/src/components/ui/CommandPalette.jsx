import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { apiTry, withQuery } from "../../api/client";
import { useUI } from "../../context/UIContext";

const mapResults = (farmers, schemes) => {
  const f = (farmers?.items || []).map((item) => ({
    id: item.id,
    label: item.name || item.phone || item.id,
    type: "Farmer",
    meta: item.phone || item.village || "",
  }));
  const s = (schemes?.items || []).map((item) => ({
    id: item.id,
    label: item.name || item.title || item.scheme_name || item.id,
    type: "Scheme",
    meta: item.state || item.category || "",
  }));
  return [...f, ...s];
};

const CommandPalette = () => {
  const { isCommandOpen, setCommandOpen } = useUI();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setCommandOpen]);

  useEffect(() => {
    if (!isCommandOpen || !query.trim()) {
      setResults([]);
      return;
    }

    let mounted = true;
    const run = async () => {
      try {
        const [farmers, schemes] = await Promise.all([
          apiTry([
            withQuery("/api/v1/admin/farmers", { search: query, page: 1, per_page: 6 }),
            withQuery("/api/v1/farmers/admin", { page: 1, per_page: 6 }),
          ]),
          apiTry([
            withQuery("/api/v1/admin/data/schemes", { page: 1, per_page: 6 }),
            withQuery("/api/v1/schemes", { page: 1, per_page: 6 }),
          ]),
        ]);

        if (mounted) {
          setResults(mapResults(farmers, schemes).filter((item) => item.label.toLowerCase().includes(query.toLowerCase())));
        }
      } catch {
        if (mounted) setResults([]);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [isCommandOpen, query]);

  const grouped = useMemo(() => {
    return {
      Farmer: results.filter((r) => r.type === "Farmer"),
      Scheme: results.filter((r) => r.type === "Scheme"),
    };
  }, [results]);

  if (!isCommandOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm" onClick={() => setCommandOpen(false)}>
      <div className="mx-auto mt-20 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1E1E1E] p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#2A2A2A] px-3 py-2">
          <Search className="h-4 w-4 text-white/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Search farmers, schemes, crops..."
            className="w-full bg-transparent text-sm text-white/90 outline-none"
          />
        </div>
        <div className="mt-3 max-h-80 space-y-3 overflow-y-auto text-xs">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-white/45">{group}</p>
              {items.length === 0 ? (
                <div className="rounded-lg border border-white/10 px-2 py-2 text-white/30">No results</div>
              ) : (
                items.map((item) => (
                  <div key={`${group}-${item.id}`} className="rounded-lg border border-white/10 px-2 py-2 hover:bg-white/5">
                    <div className="text-white/85">{item.label}</div>
                    <div className="text-[10px] text-white/40">{item.meta}</div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

