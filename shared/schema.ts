import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").default("staff").notNull(), // 'staff' or 'admin'
  pin: text("pin"), // Simple PIN for quick access if needed
  status: text("status").default("active"), // 'active' | 'away'
  isInactive: integer("is_inactive", { mode: "boolean" }).default(false),
});

export const shifts = sqliteTable("shifts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  clockIn: integer("clock_in", { mode: "timestamp" }).notNull(),
  clockOut: integer("clock_out", { mode: "timestamp" }),
  isLate: integer("is_late", { mode: "boolean" }).default(false).notNull(),
  dayType: text("day_type").default("weekday"), // 'weekday', 'weekend', 'holiday'
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'cash', 'mpesa', 'withdrawal'
  amount: real("amount").notNull(), // Using real for currency
  clientName: text("client_name"), // Field for logging clients
  groomedBy: text("groomed_by").notNull(), // Field for who groomed the client
  servedBy: text("served_by").notNull(), // Field for who served the client
  recipient: text("recipient"), // For Mpesa/Withdrawal 'Who Received?'
  mpesaRef: text("mpesa_ref"),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// Relations
export const shiftsRelations = relations(shifts, ({ one }) => ({
  user: one(users, {
    fields: [shifts.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true, clockIn: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// API Types
export type CreateTransactionRequest = InsertTransaction;
export type LoginRequest = { username: string; pin?: string };

export type LeaderboardEntry = {
  userId: number;
  name: string;
  totalMpesa: number;
};

export type DailyStats = {
  totalCash: number;
  totalMpesa: number;
  totalWithdrawal: number;
  liquidCash: number; // Cash + Withdrawal (as per requirements, oddly, usually withdrawals reduce cash, but requirement says "Liquid Cash (Cash + Withdrawal)")
  // Correction: "Liquid Cash (Cash + Withdrawal) vs Mpesa". Withdrawal usually means money taken OUT.
  // If 'Withdrawal' means 'Cash Out' from the shop, it reduces cash.
  // If 'Withdrawal' means 'Mpesa Withdrawal service' (shop gives cash, gets mpesa), it reduces cash.
  // Re-reading: "Liquid Cash (Cash + Withdrawal) vs Mpesa".
  // Let's assume 'Withdrawal' is a transaction type tracked separately.
  // We will track totals for each type.
};
