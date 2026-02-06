import { QueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function startRealtime(queryClient: QueryClient) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg && msg.type === "transactions_changed") {
        queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
        queryClient.invalidateQueries({ queryKey: [api.transactions.stats.path] });
        queryClient.invalidateQueries({ queryKey: [api.transactions.leaderboard.path] });
      }
    } catch {}
  };
  ws.onclose = () => {
    setTimeout(() => startRealtime(queryClient), 2000);
  };
}
