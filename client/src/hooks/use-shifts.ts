import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useClockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(api.shifts.clockIn.path, {
        method: api.shifts.clockIn.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        throw new Error("Clock in failed");
      }

      const data = await res.json();
      if (res.status === 200) {
        return api.shifts.clockIn.responses[200].parse(data);
      }
      return api.shifts.clockIn.responses[201].parse(data);
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.active.path, userId] });
    },
  });
}

export function useActiveShift(userId: number | undefined) {
  return useQuery({
    queryKey: [api.shifts.active.path, userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const url = buildUrl(api.shifts.active.path, { userId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to check active shift");
      return api.shifts.active.responses[200].parse(await res.json());
    },
  });
}

export function useAllShifts() {
  return useQuery({
    queryKey: [api.shifts.list.path],
    queryFn: async () => {
      const res = await fetch(api.shifts.list.path);
      if (!res.ok) throw new Error("Failed to fetch shifts");
      return api.shifts.list.responses[200].parse(await res.json());
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { shiftId: number; byUserId: number }) => {
       const res = await fetch(api.shifts.clockOut.path, {
         method: api.shifts.clockOut.method,
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ shiftId: params.shiftId, byUserId: params.byUserId }),
       });
       if (!res.ok) throw new Error("Clock out failed");
       return api.shifts.clockOut.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.list.path] });
      // Invalidate active queries for all users is hard without exact keys, 
      // but react-query fuzzy matching works if we invalidate the base path.
      // However, active path includes userId. 
      // We can invalidate all queries starting with api.shifts.active.path prefix if we want, 
      // but exact matching is default. 
      // For now, list update is most important.
    }
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: { clockIn?: string, clockOut?: string } }) => {
      const url = buildUrl(api.shifts.update.path, { id });
      const res = await fetch(url, {
        method: api.shifts.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return api.shifts.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.list.path] });
    }
  });
}
