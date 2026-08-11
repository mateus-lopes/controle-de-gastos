import { pgTable, serial, text, integer, boolean, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  monthlyAmount: numeric("monthly_amount", { precision: 14, scale: 2 }).notNull(),
  goalAmount: numeric("goal_amount", { precision: 14, scale: 2 }),
  currentAmount: numeric("current_amount", { precision: 14, scale: 2 }).default("0"),
  showProgress: boolean("show_progress").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const investmentContributions = pgTable("investment_contributions", {
  id: serial("id").primaryKey(),
  investmentId: integer("investment_id").notNull().references(() => investments.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.investmentId, t.month, t.year),
}));

export type Investment = typeof investments.$inferSelect;
export type InvestmentContribution = typeof investmentContributions.$inferSelect;
