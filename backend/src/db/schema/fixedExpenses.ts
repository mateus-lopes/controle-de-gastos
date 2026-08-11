import { pgTable, serial, text, integer, boolean, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const fixedExpenses = pgTable("fixed_expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const fixedExpensePayments = pgTable("fixed_expense_payments", {
  id: serial("id").primaryKey(),
  fixedExpenseId: integer("fixed_expense_id").notNull().references(() => fixedExpenses.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.fixedExpenseId, t.month, t.year),
}));

export type FixedExpense = typeof fixedExpenses.$inferSelect;
export type FixedExpensePayment = typeof fixedExpensePayments.$inferSelect;
