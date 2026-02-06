import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertTransactionSchema } from "@shared/schema";
import { WebSocketServer } from "ws";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const broadcast = (type: string) => {
    const message = JSON.stringify({ type });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(message);
    });
  };

  // Users
  app.get(api.users.list.path, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.post(api.users.login.path, async (req, res) => {
    // Simple login simulation
    const { username, pin } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    // Verify PIN
    if (user.pin && user.pin !== pin) {
      return res.status(401).json({ message: "Invalid PIN" });
    }
    
    if (user.role === "staff") {
      const now = new Date();
      if (now.getHours() < 7) {
        return res.status(403).json({ message: "Staff login opens at 7:00 AM." });
      }
    }
    
    // Block suspended staff
    if (user.role === "staff" && user.status === "suspended") {
      return res.status(403).json({ message: "You have been suspended for today. Please rest and return tomorrow." });
    }
    
    // Block flagged staff for the rest of the day
    if (user.role === "staff" && user.isInactive && user.status === "away") {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      if (now <= endOfDay) {
        return res.status(403).json({ message: "You should be resting today. Please come early tomorrow." });
      }
    }
    
    // Staff cannot log in again after ending a shift today
    if (user.role === "staff") {
      const active = await storage.getActiveShift(user.id);
      if (!active) {
        const allShifts = await storage.getAllShifts();
        const today = new Date().toDateString();
        const hasEndedToday = allShifts.some(
          (s) => s.userId === user.id && new Date(s.clockIn).toDateString() === today && !!s.clockOut
        );
        if (hasEndedToday) {
          return res.status(403).json({ message: "Your shift has ended. Please return tomorrow." });
        }
      }
    }
    
    res.json(user);
  });

  // Admin-only suspend user until next day (reset happens at midnight)
  app.post(api.users.suspend.path, async (req, res) => {
    const id = Number(req.params.id);
    const { byAdminId } = req.body as { byAdminId: number };
    const admin = await storage.getUser(byAdminId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ message: "Only admin can suspend users." });
    }
    const updated = await storage.updateUser(id, { status: "suspended", isInactive: true });
    res.json(updated);
  });
  
  app.post(api.users.recall.path, async (req, res) => {
    const id = Number(req.params.id);
    const { byAdminId } = req.body as { byAdminId: number };
    const admin = await storage.getUser(byAdminId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ message: "Only admin can recall users." });
    }
    const updated = await storage.updateUser(id, { status: "active", isInactive: false });
    res.json(updated);
  });

  // Shifts
  app.post(api.shifts.clockIn.path, async (req, res) => {
    try {
      const { userId } = req.body;

      // Check for active shift first
      const activeShift = await storage.getActiveShift(userId);
      if (activeShift) {
        return res.status(200).json(activeShift);
      }
      
      const now = new Date();
      const day = now.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = day === 0 || day === 6;
      const scheduledStart = new Date(now);
      scheduledStart.setHours(isWeekend ? 9 : 8, 0, 0, 0);
      const graceEnd = new Date(scheduledStart.getTime() + 20 * 60 * 1000);
      const isLate = now.getTime() > graceEnd.getTime();
      
      // Holiday check (Hardcoded for MVP)
      // e.g., Jamhuri Day Dec 12, Madaraka Day Jun 1
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const isHoliday = (month === 12 && date === 12) || (month === 6 && date === 1) || (month === 10 && date === 20) || (month === 5 && date === 1);
      
      if (isHoliday) {
        const holidayStart = new Date(now);
        holidayStart.setHours(9, 0, 0, 0);
        const holidayGraceEnd = new Date(holidayStart.getTime() + 20 * 60 * 1000);
        // Override late logic for holiday
        if (now.getTime() > holidayGraceEnd.getTime()) {
          // Late if beyond 9:20 on holidays
        } else {
          // Not late within grace
        }
      }

      const shift = await storage.clockIn(userId, isLate, isWeekend || isHoliday ? 'weekend' : 'weekday');
      
      try {
        const ms11h = 11 * 60 * 60 * 1000;
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const day1 = new Date(todayStart); day1.setDate(todayStart.getDate() - 1);
        const day2 = new Date(todayStart); day2.setDate(todayStart.getDate() - 2);
        const allShifts = await storage.getAllShifts();
        const userShifts = allShifts.filter(s => s.userId === userId);
        const dur1 = userShifts
          .filter(s => new Date(s.clockIn).toDateString() === day1.toDateString())
          .reduce((sum, s) => sum + (s.clockOut ? (new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) : 0), 0);
        const dur2 = userShifts
          .filter(s => new Date(s.clockIn).toDateString() === day2.toDateString())
          .reduce((sum, s) => sum + (s.clockOut ? (new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) : 0), 0);
        const user = await storage.getUser(userId);
        if (user && user.role === "staff" && dur1 < ms11h && dur2 < ms11h) {
          await storage.updateUser(userId, { status: "away", isInactive: true });
        }
      } catch {}
      
      res.status(201).json(shift);
    } catch (error) {
       res.status(400).json({ message: "Failed to clock in" });
    }
  });

  app.get(api.shifts.active.path, async (req, res) => {
    const userId = Number(req.params.userId);
    const shift = await storage.getActiveShift(userId);
    res.json(shift || null);
  });

  app.post(api.shifts.clockOut.path, async (req, res) => {
    try {
      const { shiftId, byUserId } = req.body as { shiftId: number; byUserId: number };
      const actor = await storage.getUser(byUserId);
      if (!actor) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const all = await storage.getAllShifts();
      const target = all.find(s => s.id === shiftId);
      if (!target) {
        return res.status(404).json({ message: "Shift not found" });
      }
      const isOwner = target.userId === actor.id;
      const isAdmin = actor.role === "admin";
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Only the owner or admin can end this shift" });
      }
      const shift = await storage.clockOut(shiftId);
      res.json(shift);
    } catch (error) {
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  app.get(api.shifts.list.path, async (req, res) => {
    const shifts = await storage.getAllShifts();
    res.json(shifts);
  });

  app.patch(api.shifts.update.path, async (req, res) => {
    const id = Number(req.params.id);
    const { clockIn, clockOut } = req.body;
    const updateData: any = {};
    if (clockIn) updateData.clockIn = new Date(clockIn);
    if (clockOut) updateData.clockOut = new Date(clockOut);
    
    try {
      const shift = await storage.updateShift(id, updateData);
      res.json(shift);
    } catch (e) {
      res.status(500).json({ message: "Failed to update shift" });
    }
  });

  // Transactions
  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(input);
      res.status(201).json(transaction);
      broadcast("transactions_changed");
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get(api.transactions.list.path, async (req, res) => {
    const transactions = await storage.getTransactions();
    // Fetch user details for each transaction to populate 'Served By' if needed
    // The storage method currently just returns transactions. 
    // Ideally we join. For MVP, we trust the 'userId' or 'recipient' fields.
    res.json(transactions);
  });

  app.patch(api.transactions.update.path, async (req, res) => {
    const id = Number(req.params.id);
    const input = req.body;
    try {
      const transaction = await storage.updateTransaction(id, input);
      res.json(transaction);
      broadcast("transactions_changed");
    } catch (e) {
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });
  
  app.delete(api.transactions.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const actorId = Number(req.query.byAdminId || req.headers["x-admin-id"]);
    if (Number.isNaN(actorId)) {
      return res.status(403).json({ message: "Admin required" });
    }
    const actor = await storage.getUser(actorId);
    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete transactions" });
    }
    try {
      const result = await storage.deleteTransaction(id);
      res.json(result);
       broadcast("transactions_changed");
    } catch (e) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  app.get(api.transactions.stats.path, async (req, res) => {
    const stats = await storage.getDailyStats();
    res.json(stats);
  });

  app.get(api.transactions.leaderboard.path, async (req, res) => {
    const leaderboard = await storage.getMpesaLeaderboard();
    res.json(leaderboard);
  });
  
  app.get("/api/clients-served", async (_req, res) => {
    const records = await storage.getClientsServed();
    res.json(records);
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const users = await storage.getAllUsers();
  if (users.length === 0) {
    const staff = [
      { name: "Ng'ash", username: "ngash", role: "staff" },
      { name: "Jay", username: "jay", role: "staff" },
      { name: "Samir", username: "samir", role: "staff" },
      { name: "Esther", username: "esther", role: "staff" },
      { name: "Cate", username: "cate", role: "staff" },
    ];

    for (const member of staff) {
      await storage.createUser({
        ...member,
        password: "123", // Default PIN/Password
      });
    }
    console.log("Seeded staff members");
  }
}
