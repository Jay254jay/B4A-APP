import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useUsers, useLogin } from "@/hooks/use-users";
import { useClockIn, useActiveShift } from "@/hooks/use-shifts";
import { UserBubble } from "@/components/UserBubble";
import { NeonButton } from "@/components/NeonButton";
import { Loader2, Scissors, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function Login() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: users, isLoading } = useUsers();
  const login = useLogin();
  const clockIn = useClockIn();
  
  // Smart clock-in logic visuals
  const hour = new Date().getHours();
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  const isLate = (isWeekend && hour >= 9) || (!isWeekend && hour >= 8);

  const handleLogin = async () => {
    if (!selectedUser) return;
    
    try {
      const user = await login.mutateAsync({ username: selectedUser.username, pin });
      
      // Auto clock-in if not active (simplified for MVP flow)
      try {
        await clockIn.mutateAsync(user.id);
        toast({ title: `Welcome back, ${user.name}!`, description: isLate ? "You are clocking in late." : "Clocked in successfully." });
      } catch (e) {
        // Ignore clock-in error if already clocked in, or handle gracefully
        toast({ title: `Welcome back, ${user.name}!` });
      }

      localStorage.setItem("user", JSON.stringify(user));
      setLocation("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      toast({ title: "Login failed", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(57,255,20,0.1),transparent_50%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_50%_50%,rgba(191,0,255,0.05),transparent_50%)] pointer-events-none" />

      <motion.div 
        initial={{ y: -20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        className="mb-12 text-center z-10"
      >
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(57,255,20,0.2)]">
            <Scissors size={48} className="text-primary animate-pulse" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2 tracking-widest">
          B4A <span className="text-primary text-glow-primary">APP</span>
        </h1>
        <p className="text-muted-foreground font-body text-lg uppercase tracking-wider">
          Barbershop Management
        </p>
      </motion.div>

      {isLoading ? (
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      ) : (
        <div className="w-full max-w-4xl z-10">
          {!selectedUser ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"
            >
              {users?.map((user) => (
                <UserBubble 
                  key={user.id} 
                  name={user.name} 
                  onClick={() => setSelectedUser(user)} 
                />
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl max-w-md mx-auto shadow-2xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Hello, {selectedUser.name}</h2>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="text-sm text-primary hover:underline"
                >
                  Not you? Go back
                </button>
              </div>

              <div className="space-y-6">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-center text-3xl tracking-[1em] text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />

                <NeonButton 
                  onClick={handleLogin} 
                  className={cn("w-full h-16 text-lg relative overflow-hidden", isLate ? "bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "")}
                  glow={true}
                  variant={isLate ? "ghost" : "primary"}
                >
                  {login.isPending ? <Loader2 className="animate-spin mx-auto" /> : (
                    <div className="flex items-center justify-center gap-2">
                      <Clock size={20} />
                      {isLate ? "CLOCK IN LATE" : "START SHIFT"}
                    </div>
                  )}
                </NeonButton>
                
                {isLate && (
                  <p className="text-center text-red-400 text-sm flex items-center justify-center gap-2">
                    <AlertCircle size={14} /> You are outside normal shift hours
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
