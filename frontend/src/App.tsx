import { Tv, TrendingUp, FolderOpen, Activity, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";

function App() {
  return (
    <div className="min-h-screen grid grid-cols-[280px_1fr] text-slate-200">
      
      {/* Sidebar Navigation */}
      <aside className="border-r border-slate-800/50 glassmorphism p-6 flex flex-col gap-8 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-synthwave-magenta flex items-center justify-center synth-glow-magenta shadow-lg">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-synthwave-cyan to-synthwave-magenta">
            YOUTUBE LABS
          </h1>
        </div>

        <nav className="flex flex-col gap-2">
          <Button variant="ghost" className="justify-start gap-3 hover:bg-slate-800/50 hover:text-synthwave-cyan">
            <TrendingUp className="w-4 h-4" />
            ViewStats
          </Button>
          <Button variant="ghost" className="justify-start gap-3 hover:bg-slate-800/50 hover:text-synthwave-magenta">
            <Search className="w-4 h-4" />
            Velio Discovery
          </Button>
          <Button variant="ghost" className="justify-start gap-3 hover:bg-slate-800/50 hover:text-synthwave-cyan">
            <Activity className="w-4 h-4" />
            SocialBlade
          </Button>
          <Button variant="ghost" className="justify-start gap-3 hover:bg-slate-800/50 hover:text-synthwave-purple">
            <FolderOpen className="w-4 h-4" />
            Channel Folders
          </Button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="p-8 relative">
        {/* Background ambient light */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-synthwave-purple/10 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none" />
        
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-light tracking-tight">Dashboard Overview</h2>
          <div className="flex gap-4">
             <Button className="bg-synthwave-magenta hover:bg-fuchsia-600 synth-glow-magenta text-white">
               + Identify Outliers
             </Button>
             <Button variant="outline" className="border-synthwave-cyan text-synthwave-cyan hover:bg-synthwave-cyan/10">
               Sync API
             </Button>
          </div>
        </header>

        {/* Metric Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card className="glassmorphism border-t-synthwave-cyan border-t-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Tracked Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-mono">2,045</div>
              <p className="text-xs text-synthwave-cyan mt-1">+12 today</p>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-t-synthwave-magenta border-t-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Outliers Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-mono text-white">418</div>
              <p className="text-xs text-synthwave-magenta mt-1">+89 in last 24h</p>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-t-synthwave-purple border-t-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active Velocity Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-mono">1,102</div>
              <p className="text-xs text-synthwave-purple mt-1">Checking VPH every 15m</p>
            </CardContent>
          </Card>
        </div>
      </main>

    </div>
  )
}

export default App
