import { db } from "./db";
import {
  users,
  shifts,
  transactions,
  type User,
  type InsertUser,
  type Shift,
  type InsertShift,
  type Transaction,
  type InsertTransaction,
  type LeaderboardEntry,
  type DailyStats,
} from "@shared/schema";
import { eq, desc, sum, sql, and, gte, lte, or } from "drizzle-orm";
import { supabase } from "./supabase";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Shifts
  clockIn(userId: number, isLate: boolean, dayType: string): Promise<Shift>;
  clockOut(shiftId: number): Promise<Shift>;
  getActiveShift(userId: number): Promise<Shift | undefined>;
  getAllShifts(): Promise<(Shift & { user: User })[]>;
  updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift>;

  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(): Promise<(Transaction & { user?: User })[]>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<{ id: number; deleted: boolean }>;
  getDailyStats(): Promise<DailyStats>;
  getMpesaLeaderboard(): Promise<LeaderboardEntry[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, data: Partial<InsertUser & { status?: string; isInactive?: boolean }>): Promise<User> {
    const [updated] = await db.update(users)
      .set(data as any)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async clockIn(userId: number, isLate: boolean, dayType: string): Promise<Shift> {
    const [shift] = await db.insert(shifts).values({
      userId,
      isLate,
      dayType,
      clockIn: new Date(),
    }).returning();
    return shift;
  }

  async clockOut(shiftId: number): Promise<Shift> {
    const [shift] = await db.update(shifts)
      .set({ clockOut: new Date() })
      .where(eq(shifts.id, shiftId))
      .returning();
    return shift;
  }

  async getActiveShift(userId: number): Promise<Shift | undefined> {
    // Find a shift without a clockOut time
    const [shift] = await db.select()
      .from(shifts)
      .where(and(eq(shifts.userId, userId), sql`${shifts.clockOut} IS NULL`))
      .orderBy(desc(shifts.clockIn))
      .limit(1);

    if (shift) {
      const shiftDate = new Date(shift.clockIn);
      const today = new Date();
      // Daily Reset: If shift is from a previous day, auto-close it
      if (shiftDate.toDateString() !== today.toDateString()) {
        const endOfDay = new Date(shiftDate);
        endOfDay.setHours(23, 59, 59, 999);
        await this.updateShift(shift.id, { clockOut: endOfDay });
        return undefined;
      }
    }
    return shift;
  }

  async getAllShifts(): Promise<(Shift & { user: User })[]> {
    const results = await db
      .select({
        shift: shifts,
        user: users,
      })
      .from(shifts)
      .innerJoin(users, eq(shifts.userId, users.id))
      .orderBy(desc(shifts.clockIn));
    
    return results.map(row => ({
      ...row.shift,
      user: row.user
    }));
  }

  async updateShift(id: number, shiftData: Partial<InsertShift>): Promise<Shift> {
    const [updatedShift] = await db.update(shifts)
      .set(shiftData)
      .where(eq(shifts.id, id))
      .returning();
    return updatedShift;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    if (supabase) {
      const payload = {
        user_id: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        client_name: transaction.clientName ?? null,
        groomed_by: transaction.groomedBy,
        served_by: transaction.servedBy,
        recipient: transaction.recipient ?? null,
        mpesa_ref: transaction.mpesaRef ?? null,
        description: transaction.description ?? null,
      };
      const { data, error } = await supabase.from("transactions").insert(payload).select().single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        userId: data.user_id,
        type: data.type,
        amount: Number(data.amount),
        clientName: data.client_name,
        groomedBy: data.groomed_by,
        servedBy: data.served_by,
        recipient: data.recipient,
        mpesaRef: data.mpesa_ref,
        description: data.description,
        createdAt: new Date(data.created_at),
      };
    } else {
      const [newTransaction] = await db.insert(transactions).values({
        ...transaction,
        amount: transaction.amount,
      }).returning();
      return newTransaction;
    }
  }

  async getTransactions(): Promise<(Transaction & { user?: User })[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        amount: Number(row.amount),
        clientName: row.client_name,
        groomedBy: row.groomed_by,
        servedBy: row.served_by,
        recipient: row.recipient,
        mpesaRef: row.mpesa_ref,
        description: row.description,
        createdAt: new Date(row.created_at),
      }));
    } else {
      const results = await db
        .select({
          transaction: transactions,
          user: users,
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .orderBy(desc(transactions.createdAt));
  
      return results.map(row => ({
        ...row.transaction,
        user: row.user || undefined,
      }));
    }
  }

  async getClientsServed(): Promise<Array<{ createdAt: Date; clientName: string | null; servedBy: string; groomedBy: string }>> {
    if (supabase) {
      const { data, error } = await supabase
        .from("transactions")
        .select("created_at, client_name, served_by, groomed_by")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map((row: any) => ({
        createdAt: new Date(row.created_at),
        clientName: row.client_name,
        servedBy: row.served_by,
        groomedBy: row.groomed_by,
      }));
    } else {
      const rows = await db.select({
        createdAt: transactions.createdAt,
        clientName: transactions.clientName,
        servedBy: transactions.servedBy,
        groomedBy: transactions.groomedBy,
      }).from(transactions)
        .orderBy(desc(transactions.createdAt));
      return rows;
    }
  }

  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction> {
    if (supabase) {
      const payload: any = {};
      if (transactionData.userId !== undefined) payload.user_id = transactionData.userId;
      if (transactionData.type !== undefined) payload.type = transactionData.type;
      if (transactionData.amount !== undefined) payload.amount = transactionData.amount;
      if (transactionData.clientName !== undefined) payload.client_name = transactionData.clientName ?? null;
      if (transactionData.groomedBy !== undefined) payload.groomed_by = transactionData.groomedBy;
      if (transactionData.servedBy !== undefined) payload.served_by = transactionData.servedBy;
      if (transactionData.recipient !== undefined) payload.recipient = transactionData.recipient ?? null;
      if (transactionData.mpesaRef !== undefined) payload.mpesa_ref = transactionData.mpesaRef ?? null;
      if (transactionData.description !== undefined) payload.description = transactionData.description ?? null;
      const { data, error } = await supabase.from("transactions").update(payload).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        userId: data.user_id,
        type: data.type,
        amount: Number(data.amount),
        clientName: data.client_name,
        groomedBy: data.groomed_by,
        servedBy: data.served_by,
        recipient: data.recipient,
        mpesaRef: data.mpesa_ref,
        description: data.description,
        createdAt: new Date(data.created_at),
      };
    } else {
      const [updatedTransaction] = await db.update(transactions)
        .set(transactionData)
        .where(eq(transactions.id, id))
        .returning();
      return updatedTransaction;
    }
  }
  
  async deleteTransaction(id: number): Promise<{ id: number; deleted: boolean }> {
    if (supabase) {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { id, deleted: true };
    } else {
      await db.delete(transactions).where(eq(transactions.id, id));
      return { id, deleted: true };
    }
  }

  async getDailyStats(): Promise<DailyStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (supabase) {
      const { data, error } = await supabase
        .from("transactions")
        .select("type, amount, created_at")
        .gte("created_at", today.toISOString());
      if (error) throw new Error(error.message);
      let totalCash = 0;
      let totalMpesa = 0;
      let totalWithdrawal = 0;
      for (const row of data || []) {
        const amount = Number(row.amount || 0);
        if (row.type === "cash") totalCash += amount;
        if (row.type === "mpesa") totalMpesa += amount;
        if (row.type === "withdrawal") totalWithdrawal += amount;
      }
      return {
        totalCash,
        totalMpesa,
        totalWithdrawal,
        liquidCash: totalCash + totalWithdrawal,
      };
    } else {
      const result = await db
        .select({
          type: transactions.type,
          total: sum(transactions.amount),
        })
        .from(transactions)
        .where(gte(transactions.createdAt, today))
        .groupBy(transactions.type);
  
      let totalCash = 0;
      let totalMpesa = 0;
      let totalWithdrawal = 0;
  
      for (const row of result) {
        const amount = Number(row.total || 0);
        if (row.type === 'cash') totalCash += amount;
        if (row.type === 'mpesa') totalMpesa += amount;
        if (row.type === 'withdrawal') totalWithdrawal += amount;
      }
      return {
        totalCash,
        totalMpesa,
        totalWithdrawal,
        liquidCash: totalCash + totalWithdrawal,
      };
    }
  }

  async getMpesaLeaderboard(): Promise<LeaderboardEntry[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (supabase) {
      const { data, error } = await supabase
        .from("transactions")
        .select("recipient, amount, type, created_at")
        .gte("created_at", today.toISOString())
        .eq("type", "mpesa");
      if (error) throw new Error(error.message);
      const totals = new Map<string, number>();
      for (const row of data || []) {
        const name = row.recipient || "Unknown";
        const prev = totals.get(name) || 0;
        totals.set(name, prev + Number(row.amount || 0));
      }
      const allUsers = await this.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.name, u.id]));
      return Array.from(totals.entries())
        .map(([name, total]) => ({
          userId: userMap.get(name) || 0,
          name,
          totalMpesa: total,
        }))
        .sort((a, b) => b.totalMpesa - a.totalMpesa);
    } else {
      const result = await db
        .select({
          recipient: transactions.recipient,
          total: sum(transactions.amount),
        })
        .from(transactions)
        .where(and(gte(transactions.createdAt, today), eq(transactions.type, 'mpesa')))
        .groupBy(transactions.recipient);
      const allUsers = await this.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.name, u.id]));
      return result.map(row => ({
        userId: row.recipient ? (userMap.get(row.recipient) || 0) : 0,
        name: row.recipient || 'Unknown',
        totalMpesa: Number(row.total || 0),
      })).sort((a, b) => b.totalMpesa - a.totalMpesa);
    }
  }

  async autoCloseShiftsForDate(date: Date): Promise<number> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(23, 0, 0, 0);
    const updated = await db
      .update(shifts)
      .set({ clockOut: target })
      .where(
        and(
          sql`${shifts.clockOut} IS NULL`,
          gte(shifts.clockIn, start),
          lte(shifts.clockIn, target),
        ),
      )
      .returning();
    return updated.length;
  }

  async resetInactiveUsers(): Promise<number> {
    const updated = await db
      .update(users)
      .set({ status: "active", isInactive: false as any })
      .where(or(eq(users.isInactive, true as any), eq(users.status, "suspended")))
      .returning();
    return updated.length;
  }
}

export const storage = new DatabaseStorage();
