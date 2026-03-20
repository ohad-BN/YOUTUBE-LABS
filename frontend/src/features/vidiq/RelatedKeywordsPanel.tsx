import { useState } from "react";
import { VidIQClient, SavedKeywordsClient } from "../../services/ApiClient";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

interface Props {
  seedKeyword: string | null;
}

export function RelatedKeywordsPanel({ seedKeyword }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);

  const load = async () => {
    if (!seedKeyword || loading) return;
    setLoading(true);
    const res = await VidIQClient.getRelatedKeywords(seedKeyword).catch(() => null);
    setSuggestions(res?.suggestions ?? []);
    setLoaded(seedKeyword);
    setLoading(false);
  };

  if (!seedKeyword) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-slate-400">Related to "{seedKeyword}":</span>
        {loaded !== seedKeyword && (
          <Button
            size="sm"
            onClick={load}
            disabled={loading}
            className="h-6 text-xs px-2 bg-slate-800 border border-slate-700 text-slate-300 hover:border-synthwave-cyan hover:text-synthwave-cyan"
          >
            {loading ? "Loading..." : "Find Related"}
          </Button>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s, i) => (
            <Badge
              key={i}
              onClick={() => SavedKeywordsClient.save(s).then(() => toast.success(`"${s}" saved`)).catch(() => {})}
              className="text-xs bg-slate-800/60 border border-slate-700 text-slate-400 hover:border-synthwave-cyan hover:text-synthwave-cyan cursor-pointer transition-colors"
              title="Click to bookmark"
            >
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
