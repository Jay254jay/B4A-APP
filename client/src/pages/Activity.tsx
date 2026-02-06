import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useTransactions } from "@/hooks/use-transactions";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "@/components/TransactionModal";
import type { User } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteTransaction } from "@/hooks/use-transactions";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

export default function Activity() {
  const { data: transactions } = useTransactions();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const deleteTx = useDeleteTransaction();
  const { toast } = useToast();

  useEffect(() => {
    // Default to today so recent activity shows by default
    setSelectedDate(new Date());
    const stored = localStorage.getItem("user");
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  const filtered = (transactions || []).filter(
    (t) => new Date(t.createdAt).toDateString() === selectedDate.toDateString()
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-white uppercase tracking-widest">
            Activity
          </h2>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono">
                  {format(selectedDate, "EEE, MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="bg-zinc-900 border-white/10 text-white p-2">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  showOutsideDays
                  weekStartsOn={1}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              className="font-mono"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
                queryClient.invalidateQueries({ queryKey: [api.transactions.stats.path] });
                queryClient.invalidateQueries({ queryKey: [api.transactions.leaderboard.path] });
              }}
              disabled={deleteTx.isPending}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="bg-card/30 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Groomed By</th>
                  <th className="p-4">Served By</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 font-mono text-sm text-muted-foreground">
                      {format(new Date(tx.createdAt), "HH:mm")}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${
                          tx.type === "cash"
                            ? "border-primary/30 text-primary bg-primary/10"
                            : tx.type === "mpesa"
                            ? "border-secondary/30 text-secondary bg-secondary/10"
                            : "border-accent/30 text-accent bg-accent/10"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-white">
                      {tx.clientName || "-"}
                    </td>
                    <td className="p-4 font-medium text-white">{tx.groomedBy}</td>
                    <td className="p-4 font-medium text-white">{tx.servedBy}</td>
                    <td className="p-4 text-muted-foreground">
                      {tx.description || "-"}
                    </td>
                    <td className="p-4 text-right font-mono font-bold">
                      {tx.amount}
                    </td>
                    <td className="p-4 text-right">
                      {currentUser && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingTx(tx)}
                          disabled={deleteTx.isPending}
                        >
                          Edit
                        </Button>
                      )}
                      {currentUser?.role === "admin" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="ml-2"
                          onClick={async () => {
                            if (!currentUser) return;
                            if (!confirm("Delete this entry?")) return;
                            try {
                              await deleteTx.mutateAsync({ id: tx.id, byAdminId: currentUser.id });
                              toast({ title: "Entry deleted" });
                            } catch (e: any) {
                              const msg = e?.message || "";
                              if (msg.toLowerCase().includes("abort")) {
                                return;
                              }
                              toast({ title: "Delete failed", description: msg || "Error", variant: "destructive" });
                            }
                          }}
                          disabled={deleteTx.isPending}
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No transactions for the selected date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editingTx && currentUser && (
          <TransactionModal
            isOpen={!!editingTx}
            onClose={() => setEditingTx(null)}
            type={editingTx.type}
            currentUser={currentUser}
            editData={editingTx}
          />
        )}
      </div>
    </Layout>
  );
}
