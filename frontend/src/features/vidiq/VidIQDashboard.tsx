import { useState, useEffect } from "react";
import { VidIQClient } from "../../services/ApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Search, Flame, Save, FolderOpen } from "lucide-react";

export function VidIQDashboard() {
  const [keyword, setKeyword] = useState("");
  const [scoreData, setScoreData] = useState<any>(null);
  const [loadingScore, setLoadingScore] = useState(false);
  
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("");
  const [library, setLibrary] = useState<any[]>([]);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    const data = await VidIQClient.getSavedIdeas().catch(() => []);
    setLibrary(data || []);
  }

  const handleScore = async () => {
    if (!keyword.trim()) return;
    setLoadingScore(true);
    const result = await VidIQClient.scoreKeyword(keyword).catch(() => null);
    setScoreData(result);
    setLoadingScore(false);
  };

  const handleSaveIdea = async () => {
    if (!ideaTitle.trim()) return;
    const idea = await VidIQClient.saveIdea(ideaTitle, ideaCategory || "Uncategorized").catch(() => null);
    if (idea) {
      setIdeaTitle("");
      setLibrary((prev) => [idea, ...prev]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="w-8 h-8 text-synthwave-purple drop-shadow-[0_0_10px_rgba(138,43,226,0.8)]" />
        <h2 className="text-3xl font-light tracking-tight text-white">VidIQ Intelligence</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Keyword Scoring Engine */}
        <Card className="glassmorphism border-t-synthwave-cyan border-t-2 relative">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-synthwave-cyan" />
              Keyword Score Engine
            </CardTitle>
            <p className="text-sm text-slate-400">AI-driven search volume vs competition</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input 
                placeholder="Enter a keyword..." 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScore()}
                className="bg-slate-900 border-slate-700 text-slate-200"
              />
              <Button onClick={handleScore} disabled={loadingScore} className="bg-synthwave-cyan text-slate-900 hover:bg-cyan-500 synth-glow-cyan font-bold transition-all">
                {loadingScore ? "Scoring..." : "Scan"}
              </Button>
            </div>

            {scoreData && (
              <div className="p-6 rounded-lg bg-slate-900/80 border border-slate-800 animate-in fade-in zoom-in-95 mt-4">
                <div className="text-center mb-6">
                  <p className="text-sm text-slate-400 uppercase tracking-widest mb-2">Overall Score</p>
                  <div className={`text-6xl font-bold font-mono drop-shadow-[0_0_15px_rgba(0,255,255,0.4)] ${scoreData.overall_score >= 60 ? 'text-synthwave-cyan' : scoreData.overall_score >= 40 ? 'text-yellow-400' : 'text-red-500'}`}>
                    {scoreData.overall_score}
                    <span className="text-2xl text-slate-500">/100</span>
                  </div>
                </div>
                
                <div className="flex justify-between mt-4 gap-4">
                  <div className="flex-1 bg-slate-800/50 p-4 rounded text-center border-b-2 border-synthwave-cyan">
                    <p className="text-xs text-slate-400 mb-1">Volume</p>
                    <p className="text-2xl font-bold text-white">{scoreData.search_volume}</p>
                  </div>
                  <div className="flex-1 bg-slate-800/50 p-4 rounded text-center border-b-2 border-red-500">
                    <p className="text-xs text-slate-400 mb-1">Competition</p>
                    <p className="text-2xl font-bold text-white">{scoreData.competition}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Video Idea Library */}
        <Card className="glassmorphism border-t-synthwave-purple border-t-2 flex flex-col h-full opacity-90 hover:opacity-100 transition-opacity">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-synthwave-purple" />
              Personal Library
            </CardTitle>
            <p className="text-sm text-slate-400">Save viral configurations and script hooks</p>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 space-y-4">
            <div className="flex flex-col gap-2">
              <Input 
                placeholder="Video title / Hook idea..." 
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-200"
              />
              <div className="flex gap-2">
                <Input 
                  placeholder="Category (e.g. Hooks, Outliers)" 
                  value={ideaCategory}
                  onChange={(e) => setIdeaCategory(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200 flex-1"
                />
                <Button onClick={handleSaveIdea} className="bg-synthwave-purple hover:bg-purple-600 synth-glow-purple text-white">
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </div>

            <div className="flex-1 mt-4 border border-slate-800/50 rounded-lg bg-slate-900/30 overflow-y-auto min-h-[250px] p-2 space-y-2">
              {library.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">Library is empty.</div>
              ) : (
                library.map((idea, idx) => (
                  <div key={idx} className="p-3 bg-slate-800/40 rounded hover:bg-slate-800 transition-colors border-l-2 border-synthwave-purple flex justify-between items-center group">
                    <div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white">{idea.title}</p>
                      <p className="text-xs text-synthwave-purple/80">{idea.category}</p>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(idea.created_at).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
