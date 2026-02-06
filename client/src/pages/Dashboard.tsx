import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useTransactions } from "@/hooks/use-transactions";
import { User } from "@shared/schema";
import { TransactionModal } from "@/components/TransactionModal";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  Banknote, 
  Smartphone, 
  ArrowUpRight, 
  Clock 
} from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeModal, setActiveModal] = useState<"cash" | "mpesa" | "withdrawal" | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const { data: transactions } = useTransactions();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      window.location.href = "/";
    }
  }, []);

  if (!user) return null;

  const handleEditTransaction = (_tx: any) => {};

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-muted-foreground uppercase text-sm tracking-widest mb-1">Current Shift</h2>
            <div className="text-3xl font-display font-bold text-white">
              <span className="text-primary">Online:</span> {user.name}
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground bg-white/5 px-4 py-2 rounded-lg border border-white/5">
            <Clock size={16} />
            <span className="font-mono">{format(new Date(), "EEE, MMM d • HH:mm")}</span>
          </div>
        </div>
        
        {/* Action Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-96">
          <motion.button
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveModal("cash")}
            className="group relative h-48 md:h-full rounded-3xl bg-gradient-to-br from-black to-zinc-900 border border-white/10 overflow-hidden flex flex-col items-center justify-center gap-4 md:gap-6 shadow-2xl hover:border-primary/50 transition-colors"
          >
            <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
            <div className="p-4 md:p-6 rounded-full bg-primary/20 text-primary group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(57,255,20,0.3)]">
              <Banknote size={48} className="md:w-16 md:h-16" />
            </div>
            <span className="text-2xl md:text-3xl font-display font-bold text-white tracking-widest z-10 group-hover:text-primary transition-colors">CASH</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveModal("mpesa")}
            className="group relative h-48 md:h-full rounded-3xl bg-gradient-to-br from-black to-zinc-900 border border-white/10 overflow-hidden flex flex-col items-center justify-center gap-4 md:gap-6 shadow-2xl hover:border-secondary/50 transition-colors"
          >
            <div className="absolute inset-0 bg-secondary/5 group-hover:bg-secondary/10 transition-colors" />
            <div className="p-4 md:p-6 rounded-full bg-secondary/20 text-secondary group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(191,0,255,0.3)]">
              <Smartphone size={48} className="md:w-16 md:h-16" />
            </div>
            <span className="text-2xl md:text-3xl font-display font-bold text-white tracking-widest z-10 group-hover:text-secondary transition-colors">MPESA</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveModal("withdrawal")}
            className="group relative h-48 md:h-full rounded-3xl bg-gradient-to-br from-black to-zinc-900 border border-white/10 overflow-hidden flex flex-col items-center justify-center gap-4 md:gap-6 shadow-2xl hover:border-accent/50 transition-colors"
          >
            <div className="absolute inset-0 bg-accent/5 group-hover:bg-accent/10 transition-colors" />
            <div className="p-4 md:p-6 rounded-full bg-accent/20 text-accent group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(255,191,0,0.3)]">
              <ArrowUpRight size={48} className="md:w-16 md:h-16" />
            </div>
            <span className="text-2xl md:text-3xl font-display font-bold text-white tracking-widest z-10 group-hover:text-accent transition-colors">WITHDRAWAL</span>
          </motion.button>
        </div>

        </div>

      {activeModal && (
        <TransactionModal 
          isOpen={!!activeModal} 
          onClose={() => {
            setActiveModal(null);
            setEditingTransaction(null);
          }} 
          type={activeModal} 
          currentUser={user}
          editData={editingTransaction}
        />
      )}
    </Layout>
  );
}
