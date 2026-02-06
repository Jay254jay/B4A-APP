import { Layout } from "@/components/Layout";
import { useAllShifts, useClockOut } from "@/hooks/use-shifts";
import { useUsers, useSuspendUser, useRecallUser } from "@/hooks/use-users";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Shift, User } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Staff() {
  const { data: shifts, isLoading } = useAllShifts();
  const clockOutMutation = useClockOut();
  const { data: users } = useUsers();
  const suspendMutation = useSuspendUser();
  const recallMutation = useRecallUser();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full text-white">
          <Loader2 className="animate-spin mr-2" /> Loading shifts...
        </div>
      </Layout>
    );
  }

  const handleClockOut = (shiftId: number) => {
    if (confirm("Are you sure you want to end this shift?")) {
      if (!currentUser) return;
      clockOutMutation.mutate({ shiftId, byUserId: currentUser.id });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-white uppercase tracking-widest">Staff Management</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: [api.shifts.list.path] });
              queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
            }}
            className="font-mono"
          >
            Refresh
          </Button>
        </div>

        
        
        {(() => {
          const staff = (users || []).filter(u => u.role === "staff");
          const activeMap = new Map<number, Shift | undefined>();
          (shifts || []).forEach((s: any) => {
            if (s.user.role !== "staff") return;
            if (!s.clockOut) activeMap.set(s.userId, s);
          });
          return (
            <div className="rounded-xl border border-white/10 bg-black/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 text-muted-foreground font-mono">
                {format(new Date(), "EEEE, d MMMM yyyy")}
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-white">Staff Member</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Shift Time</TableHead>
                    <TableHead className="text-right text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((u) => {
                    const active = activeMap.get(u.id);
                    const isBlocked = u.status === "suspended" || (u.isInactive && u.status === "away");
                    return (
                      <TableRow key={u.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium text-white">{u.name}</TableCell>
                        <TableCell className="text-gray-300">
                          {u.status === "suspended" ? (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/50">Suspended</Badge>
                          ) : active ? (
                            <Badge className="bg-green-500 hover:bg-green-600">Working</Badge>
                          ) : (
                            <span className="text-muted-foreground">Not working</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {active ? format(new Date(active.clockIn), "HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {active && (currentUser?.role === "admin" || currentUser?.id === u.id) ? (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleClockOut(active.id)}
                            >
                              Clock Out
                            </Button>
                          ) : null}
                          {currentUser?.role === "admin" && (
                            <Button
                              variant={isBlocked ? "default" : "secondary"}
                              size="sm"
                              onClick={async () => {
                                try {
                                  if (isBlocked) {
                                    await recallMutation.mutateAsync({ userId: u.id, byAdminId: currentUser.id });
                                    toast({ title: `Recalled ${u.name} for today` });
                                  } else {
                                    await suspendMutation.mutateAsync({ userId: u.id, byAdminId: currentUser.id });
                                    toast({ title: `Suspended ${u.name} till tomorrow` });
                                  }
                                } catch (e: any) {
                                  toast({ title: isBlocked ? "Recall failed" : "Suspend failed", description: e?.message || "Error", variant: "destructive" });
                                }
                              }}
                            >
                              {isBlocked ? "Recall" : "Suspend"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          );
        })()}
      </div>
    </Layout>
  );
}
