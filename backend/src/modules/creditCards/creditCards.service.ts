import { eq, and, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { creditCards, creditCardInvoices, dailyExpenses } from "../../db/schema";

export const creditCardSchema = z.object({
  name: z.string().min(1).max(50),
});

const invoiceToggleSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int(),
});

export { invoiceToggleSchema };

export async function listCreditCards(userId: number) {
  return db.select().from(creditCards).where(eq(creditCards.userId, userId));
}

export async function createCreditCard(userId: number, data: z.infer<typeof creditCardSchema>) {
  const [row] = await db.insert(creditCards).values({ userId, ...data }).returning();
  return row;
}

export async function updateCreditCard(userId: number, id: number, data: z.infer<typeof creditCardSchema>) {
  const [row] = await db
    .update(creditCards)
    .set(data)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteCreditCard(userId: number, id: number) {
  const [row] = await db
    .delete(creditCards)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)))
    .returning();
  return row ?? null;
}

export async function getInvoice(userId: number, cardId: number, month: number, year: number) {
  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId)));
  if (!card) return null;

  const [result] = await db
    .select({ total: sum(dailyExpenses.amount) })
    .from(dailyExpenses)
    .where(
      and(
        eq(dailyExpenses.userId, userId),
        eq(dailyExpenses.creditCardId, cardId),
        eq(dailyExpenses.month, month),
        eq(dailyExpenses.year, year)
      )
    );

  const [invoice] = await db
    .select()
    .from(creditCardInvoices)
    .where(
      and(
        eq(creditCardInvoices.creditCardId, cardId),
        eq(creditCardInvoices.userId, userId),
        eq(creditCardInvoices.month, month),
        eq(creditCardInvoices.year, year)
      )
    );

  return {
    card,
    month,
    year,
    amount: result?.total ?? "0",
    paid: invoice?.paid ?? false,
    paidAt: invoice?.paidAt ?? null,
  };
}

export async function getAllInvoicesForMonth(userId: number, month: number, year: number) {
  const cards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
  return Promise.all(cards.map((c) => getInvoice(userId, c.id, month, year)));
}

export async function toggleInvoicePaid(userId: number, cardId: number, month: number, year: number) {
  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId)));
  if (!card) return null;

  const [existing] = await db
    .select()
    .from(creditCardInvoices)
    .where(
      and(
        eq(creditCardInvoices.creditCardId, cardId),
        eq(creditCardInvoices.userId, userId),
        eq(creditCardInvoices.month, month),
        eq(creditCardInvoices.year, year)
      )
    );

  if (existing) {
    const newPaid = !existing.paid;
    const [updated] = await db
      .update(creditCardInvoices)
      .set({ paid: newPaid, paidAt: newPaid ? new Date() : null })
      .where(eq(creditCardInvoices.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(creditCardInvoices)
      .values({ creditCardId: cardId, userId, month, year, paid: true, paidAt: new Date() })
      .returning();
    return created;
  }
}
