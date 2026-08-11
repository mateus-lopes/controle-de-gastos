import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { fixedExpenses, fixedExpensePayments } from "../../db/schema";

export const fixedExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  active: z.boolean().optional(),
});

export async function listFixedExpenses(userId: number, month: number, year: number) {
  const expenses = await db
    .select()
    .from(fixedExpenses)
    .where(and(eq(fixedExpenses.userId, userId), eq(fixedExpenses.active, true)));

  const payments = await db
    .select()
    .from(fixedExpensePayments)
    .where(
      and(
        eq(fixedExpensePayments.userId, userId),
        eq(fixedExpensePayments.month, month),
        eq(fixedExpensePayments.year, year)
      )
    );

  const paymentMap = new Map(payments.map((p) => [p.fixedExpenseId, p]));

  return expenses.map((e) => ({
    ...e,
    paid: paymentMap.get(e.id)?.paid ?? false,
    paidAt: paymentMap.get(e.id)?.paidAt ?? null,
  }));
}

export async function createFixedExpense(userId: number, data: z.infer<typeof fixedExpenseSchema>) {
  const [row] = await db
    .insert(fixedExpenses)
    .values({ userId, ...data, amount: String(data.amount) })
    .returning();
  return row;
}

export async function updateFixedExpense(userId: number, id: number, data: z.infer<typeof fixedExpenseSchema>) {
  const [row] = await db
    .update(fixedExpenses)
    .set({ ...data, amount: String(data.amount) })
    .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteFixedExpense(userId: number, id: number) {
  const [row] = await db
    .delete(fixedExpenses)
    .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)))
    .returning();
  return row ?? null;
}

export async function togglePayment(userId: number, expenseId: number, month: number, year: number) {
  const [existing] = await db
    .select()
    .from(fixedExpensePayments)
    .where(
      and(
        eq(fixedExpensePayments.fixedExpenseId, expenseId),
        eq(fixedExpensePayments.userId, userId),
        eq(fixedExpensePayments.month, month),
        eq(fixedExpensePayments.year, year)
      )
    );

  if (existing) {
    const newPaid = !existing.paid;
    const [updated] = await db
      .update(fixedExpensePayments)
      .set({ paid: newPaid, paidAt: newPaid ? new Date() : null })
      .where(eq(fixedExpensePayments.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(fixedExpensePayments)
      .values({ fixedExpenseId: expenseId, userId, month, year, paid: true, paidAt: new Date() })
      .returning();
    return created;
  }
}
