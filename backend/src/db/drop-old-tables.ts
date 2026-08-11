import { db } from "./client";
import { sql } from "drizzle-orm";

async function dropOldTables() {
  await db.execute(sql`
    DROP TABLE IF EXISTS
      investment_contributions,
      investments,
      installment_payments,
      installments,
      daily_expenses,
      fixed_expense_payments,
      fixed_expenses,
      variable_incomes,
      fixed_incomes,
      credit_card_invoices,
      credit_cards
    CASCADE
  `);
  console.log("Tabelas antigas removidas.");
  process.exit(0);
}

dropOldTables().catch((e) => { console.error(e); process.exit(1); });
