import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { NeonButton } from "@/components/NeonButton";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1a1a1a] text-white">
      <div className="p-8 rounded-full bg-red-500/10 mb-6 animate-pulse">
        <AlertTriangle className="h-16 w-16 text-red-500" />
      </div>
      <h1 className="text-4xl font-display font-bold mb-4 tracking-widest">404 Page Not Found</h1>
      <p className="text-muted-foreground mb-8 text-lg">Did you get lost in the neon lights?</p>
      
      <Link href="/">
        <NeonButton variant="primary" glow>
          Return Home
        </NeonButton>
      </Link>
    </div>
  );
}
