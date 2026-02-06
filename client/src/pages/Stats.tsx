import { Layout } from "@/components/Layout";
import { useStats, useTransactions } from "@/hooks/use-transactions";
import { useUsers } from "@/hooks/use-users";
import { useAllShifts } from "@/hooks/use-shifts";
import { motion } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from "recharts";
import { Loader2, TrendingUp, Wallet, ArrowRightLeft, Download, FileSpreadsheet } from "lucide-react";
import { NeonButton } from "@/components/NeonButton";
import { useEffect, useState } from "react";
import type { User } from "@shared/schema";
import { DayPicker } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { saveOrDownloadCSV } from "@/lib/utils";

const RollingNumber = ({ value }: { value: number }) => {
  return (
    <span className="font-mono">
      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value)}
    </span>
  );
};

export default function Stats() {
  const [user, setUser] = useState<User | null>(null);
  const isAdmin = user?.role === "admin";
  const [selectedExportDate, setSelectedExportDate] = useState<Date>(new Date());

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      window.location.href = "/";
    }
  }, []);

  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: transactions } = useTransactions();
  const { data: users } = useUsers();
  const { data: allShifts } = useAllShifts();
  const staffStatus = (users || [])
    .filter((s) => s.role === "staff")
    .map((s) => {
      const hasActive = (allShifts || []).some(
        (sh) => sh.user.id === s.id && !sh.clockOut
      );
      const suspended = s.status === "suspended";
      return { name: s.name, active: hasActive, suspended };
    });

  const handleExportCSV = async () => {
    if (!transactions || transactions.length === 0) return;

    const targetDay = selectedExportDate.toDateString();
    const todaysTransactions = transactions.filter(t => 
      new Date(t.createdAt).toDateString() === targetDay
    );

    if (todaysTransactions.length === 0) return;

    const headers = ["Time", "Type", "Client", "Groomed By", "Served By", "Amount", "Description"];
    const rows = todaysTransactions.map(tx => [
      new Date(tx.createdAt).toLocaleTimeString(),
      tx.type,
      tx.clientName || "-",
      tx.groomedBy,
      tx.servedBy,
      tx.amount,
      tx.description || "-"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const filename = `B4A_Report_${format(selectedExportDate, "yyyy-MM-dd")}.csv`;
    await saveOrDownloadCSV(filename, csvContent);
  };

  if (statsLoading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="animate-spin text-primary w-12 h-12" />
        </div>
      </Layout>
    );
  }

  // Fallback data
  const safeStats = stats || { totalCash: 0, totalMpesa: 0, totalWithdrawal: 0, liquidCash: 0 };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-white/10 pb-4">
          <h2 className="text-3xl font-display font-bold text-white uppercase tracking-widest">
            Financial Overview
          </h2>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono">
                  {format(selectedExportDate, "EEE, MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="bg-zinc-900 border-white/10 text-white p-2">
                <DayPicker
                  mode="single"
                  selected={selectedExportDate}
                  onSelect={(d) => d && setSelectedExportDate(d)}
                  showOutsideDays
                  weekStartsOn={1}
                />
              </PopoverContent>
            </Popover>
            {isAdmin && (
              <NeonButton 
                onClick={handleExportCSV} 
                className="flex items-center gap-2"
                variant="primary"
              >
                <Download size={18} />
                Download CSV Report
              </NeonButton>
            )}
          </div>
        </div>

        <div className="bg-card/30 border border-white/5 rounded-2xl p-4">
          <h3 className="text-lg font-display font-bold text-white mb-4">Staff Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {staffStatus.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10"
              >
                <span className="text-white font-medium">{s.name}</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${
                    s.suspended
                      ? "border-red-500/50 text-red-400 bg-red-500/10"
                      : s.active
                      ? "border-primary/30 text-primary bg-primary/10"
                      : "border-muted/30 text-muted-foreground bg-muted/10"
                  }`}
                >
                  {s.suspended ? "Suspended" : s.active ? "In" : "Out"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isAdmin && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/40 border border-primary/20 p-6 rounded-2xl relative overflow-hidden"
            >
              <div className="absolute -right-4 -top-4 bg-primary/10 rounded-full p-8 blur-xl"></div>
              <div className="flex items-center gap-3 mb-2 text-primary">
                <Wallet className="w-5 h-5" />
                <h3 className="font-display font-bold uppercase tracking-wider">Liquid Cash</h3>
              </div>
              <p className="text-4xl font-mono font-bold text-white mb-1">
                <RollingNumber value={safeStats.liquidCash} />
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                (Cash + Withdrawals)
              </p>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card/40 border border-accent/20 p-6 rounded-2xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 bg-accent/10 rounded-full p-8 blur-xl"></div>
            <div className="flex items-center gap-3 mb-2 text-accent">
              <ArrowRightLeft className="w-5 h-5" />
              <h3 className="font-display font-bold uppercase tracking-wider">Withdrawals</h3>
            </div>
            <p className="text-4xl font-mono font-bold text-white mb-1">
              <RollingNumber value={safeStats.totalWithdrawal} />
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Cash Out Operations
            </p>
          </motion.div>
        </div>

        {/* No breakdown by staff per request */}
      </div>
    </Layout>
  );
}
