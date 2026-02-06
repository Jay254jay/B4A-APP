import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateTransactionRequest } from "@shared/routes";
import { api as apiDef } from "@shared/routes";

export function useTransactions() {
  return useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.list.path);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTransactionRequest) => {
      const res = await fetch(api.transactions.create.path, {
        method: api.transactions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Transaction failed");
      }

      return api.transactions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.leaderboard.path] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const url = api.transactions.update.path.replace(":id", id.toString());
      const res = await fetch(url, {
        method: api.transactions.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Transaction update failed");
      return api.transactions.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.leaderboard.path] });
    },
  });
}

export function useStats() {
  return useQuery({
    queryKey: [api.transactions.stats.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.stats.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.transactions.stats.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5s for live feel
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: [api.transactions.leaderboard.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.leaderboard.path);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return api.transactions.leaderboard.responses[200].parse(await res.json());
    },
  });
}

export function useClientsServed() {
  return useQuery({
    queryKey: [apiDef.clientsServed.list.path],
    queryFn: async () => {
      const res = await fetch(apiDef.clientsServed.list.path);
      if (!res.ok) throw new Error("Failed to fetch clients served");
      return apiDef.clientsServed.list.responses[200].parse(await res.json());
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, byAdminId }: { id: number; byAdminId: number }) => {
      const url = api.transactions.delete.path.replace(":id", id.toString());
      const res = await fetch(url + `?byAdminId=${byAdminId}`, {
        method: api.transactions.delete.method,
      });
      if (!res.ok) throw new Error("Delete failed");
      return api.transactions.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.leaderboard.path] });
    },
  });
}
