import { pgTable, serial, text, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { categories } from "./categories";
import { creditCards } from "./creditCards";

export const PAYMENT_METHODS = ["debit", "credit_card", "cash", "credit"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const dailyExpenses = pgTable("daily_expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  date: date("date").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  paymentMethod: text("payment_method").notNull().$type<PaymentMethod>(),
  creditCardId: integer("credit_card_id").references(() => creditCards.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DailyExpense = typeof dailyExpenses.$inferSelect;
export type NewDailyExpense = typeof dailyExpenses.$inferInsert;
