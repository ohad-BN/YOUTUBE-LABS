import { useEffect, useState } from "react";
import { SavedKeywordsClient } from "../../services/ApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Bookmark, X } from "lucide-react";
import { toast } from "sonner";

export function SavedKeywordsPanel() {
  const [keywords, setKeywords] = useState<any[]>([]);

  useEffect(() => {
    SavedKeywordsClient.list().then(setKeywords).catch(() => {});
  }, []);

  const handleDelete = async (id: number) => {
    await SavedKeywordsClient.delete(id).catch(() => {});
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    toast.success("Keyword removed");
  };

  return (
    <Card className="glassmorphism border-t-synthwave-purple border-t-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-synthwave-purple" />
          Saved Keywords
        </CardTitle>
      </CardHeader>
      <CardContent>
        {keywords.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No saved keywords yet. Click a keyword badge to bookmark it.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span
                key={kw.id}
                className="inline-flex items-center gap-1 bg-synthwave-purple/10 border border-synthwave-purple/30 text-synthwave-purple text-xs px-2 py-1 rounded"
              >
                {kw.keyword}
                <button onClick={() => handleDelete(kw.id)} className="hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
