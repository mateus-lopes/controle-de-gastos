import { pgTable, serial, integer, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { accounts } from "./accounts";
import { transactions } from "./transactions";

export const creditCardInvoices = pgTable("credit_card_invoices", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paymentTransactionId: integer("payment_transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.accountId, t.month, t.year),
  userMonthYearIdx: index("cc_inv_user_month_year_idx").on(t.userId, t.month, t.year),
}));

export type CreditCardInvoice = typeof creditCardInvoices.$inferSelect;
export type NewCreditCardInvoice = typeof creditCardInvoices.$inferInsert;
