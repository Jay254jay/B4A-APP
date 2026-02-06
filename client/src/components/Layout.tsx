import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Scissors, BarChart3, LogOut, LayoutGrid, Users, History } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-foreground flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Mobile Header */}
      <div className="md:hidden p-4 flex justify-between items-center bg-card/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
        <h1 className="text-xl font-display font-bold text-glow-primary text-primary">
          B4A App
        </h1>
        <button onClick={handleLogout} className="text-muted-foreground hover:text-white">
          <LogOut size={20} />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-white/10 p-6 bg-card/30">
        <div className="mb-12">
          <h1 className="text-2xl font-display font-bold text-glow-primary text-primary flex items-center gap-2">
            <Scissors className="animate-spin-slow" /> B4A App
          </h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
            location === "/dashboard" 
              ? "bg-primary/10 text-primary border border-primary/20" 
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
          )}>
            <LayoutGrid size={20} />
            Dashboard
          </Link>
          <Link href="/activity" className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
            location === "/activity" 
              ? "bg-primary/10 text-primary border border-primary/20" 
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
          )}>
            <History size={20} />
            Activity
          </Link>
          <Link href="/stats" className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
            location === "/stats" 
              ? "bg-secondary/10 text-secondary border border-secondary/20" 
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
          )}>
            <BarChart3 size={20} />
            Stats & Money
          </Link>
          <Link href="/staff" className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
            location === "/staff" 
              ? "bg-accent/10 text-accent border border-accent/20" 
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
          )}>
            <Users size={20} />
            Staff
          </Link>
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-white transition-colors mt-auto"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a1a]/90 backdrop-blur-xl border-t border-white/10 p-4 flex justify-around items-center z-50">
        <Link href="/dashboard" className={cn(
          "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
          location === "/dashboard" ? "text-primary" : "text-muted-foreground"
        )}>
          <LayoutGrid size={24} />
          POS
        </Link>
        <Link href="/activity" className={cn(
          "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
          location === "/activity" ? "text-primary" : "text-muted-foreground"
        )}>
          <History size={24} />
          Activity
        </Link>
        <Link href="/stats" className={cn(
          "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
          location === "/stats" ? "text-secondary" : "text-muted-foreground"
        )}>
          <BarChart3 size={24} />
          Stats
        </Link>
        <Link href="/staff" className={cn(
          "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
          location === "/staff" ? "text-accent" : "text-muted-foreground"
        )}>
          <Users size={24} />
          Staff
        </Link>
      </nav>
    </div>
  );
}
