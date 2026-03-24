import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { BookmarkIcon } from "lucide-react";

export function Vault() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <BookmarkIcon className="w-8 h-8 text-synthwave-purple drop-shadow-[0_0_10px_rgba(138,43,226,0.8)]" />
        <h2 className="text-3xl font-light tracking-tight text-white">Idea Vault</h2>
      </div>

      <Card className="glassmorphism border-t-synthwave-purple border-t-2">
        <CardHeader>
          <CardTitle className="text-white">Saved Ideas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Save and organize your best ideas, hooks, and thumbnail concepts here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
