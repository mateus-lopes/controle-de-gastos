import { pgTable, serial, text, integer, boolean, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const fixedIncomes = pgTable("fixed_incomes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const variableIncomes = pgTable("variable_incomes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  date: date("date").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FixedIncome = typeof fixedIncomes.$inferSelect;
export type NewFixedIncome = typeof fixedIncomes.$inferInsert;
export type VariableIncome = typeof variableIncomes.$inferSelect;
export type NewVariableIncome = typeof variableIncomes.$inferInsert;
