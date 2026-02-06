import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type LoginRequest } from "@shared/routes";

export function useUsers() {
  return useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.users.login.path, {
        method: api.users.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Invalid PIN");
        }
        try {
          const body = await res.json();
          throw new Error(body?.message || "Login failed");
        } catch {
          throw new Error("Login failed");
        }
      }

      return api.users.login.responses[200].parse(await res.json());
    },
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userId: number; byAdminId: number }) => {
      const url = buildUrl(api.users.suspend.path, { id: params.userId });
      const res = await fetch(url, {
        method: api.users.suspend.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ byAdminId: params.byAdminId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to suspend user");
      }
      return api.users.suspend.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
  });
}

export function useRecallUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userId: number; byAdminId: number }) => {
      const url = buildUrl(api.users.recall.path, { id: params.userId });
      const res = await fetch(url, {
        method: api.users.recall.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ byAdminId: params.byAdminId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to recall user");
      }
      return api.users.recall.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
  });
}
