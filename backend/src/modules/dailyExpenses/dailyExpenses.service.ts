import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { dailyExpenses, categories, PAYMENT_METHODS } from "../../db/schema";

export const dailyExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
  categoryId: z.number().int().positive().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  creditCardId: z.number().int().positive().optional(),
}).refine(
  (d) => d.paymentMethod !== "credit_card" || d.creditCardId !== undefined,
  { message: "creditCardId é obrigatório para pagamento com cartão de crédito" }
);

export async function listDailyExpenses(
  userId: number,
  month: number,
  year: number,
  filters: { categoryId?: number; paymentMethod?: string }
) {
  const conditions: ReturnType<typeof eq>[] = [
    eq(dailyExpenses.userId, userId),
    eq(dailyExpenses.month, month),
    eq(dailyExpenses.year, year),
  ];

  if (filters.categoryId) conditions.push(eq(dailyExpenses.categoryId, filters.categoryId));
  if (filters.paymentMethod) {
    conditions.push(eq(dailyExpenses.paymentMethod, filters.paymentMethod as typeof PAYMENT_METHODS[number]));
  }

  return db
    .select({
      id: dailyExpenses.id,
      description: dailyExpenses.description,
      amount: dailyExpenses.amount,
      date: dailyExpenses.date,
      paymentMethod: dailyExpenses.paymentMethod,
      creditCardId: dailyExpenses.creditCardId,
      categoryId: dailyExpenses.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      createdAt: dailyExpenses.createdAt,
    })
    .from(dailyExpenses)
    .leftJoin(categories, eq(dailyExpenses.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(dailyExpenses.date);
}

export async function createDailyExpense(userId: number, data: z.infer<typeof dailyExpenseSchema>) {
  const month = parseInt(data.date.slice(5, 7));
  const year = parseInt(data.date.slice(0, 4));
  const [row] = await db
    .insert(dailyExpenses)
    .values({
      userId,
      description: data.description,
      amount: String(data.amount),
      date: data.date,
      month,
      year,
      categoryId: data.categoryId,
      paymentMethod: data.paymentMethod,
      creditCardId: data.creditCardId,
    })
    .returning();
  return row;
}

export async function updateDailyExpense(userId: number, id: number, data: z.infer<typeof dailyExpenseSchema>) {
  const month = parseInt(data.date.slice(5, 7));
  const year = parseInt(data.date.slice(0, 4));
  const [row] = await db
    .update(dailyExpenses)
    .set({
      description: data.description,
      amount: String(data.amount),
      date: data.date,
      month,
      year,
      categoryId: data.categoryId ?? null,
      paymentMethod: data.paymentMethod,
      creditCardId: data.creditCardId ?? null,
    })
    .where(and(eq(dailyExpenses.id, id), eq(dailyExpenses.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteDailyExpense(userId: number, id: number) {
  const [row] = await db
    .delete(dailyExpenses)
    .where(and(eq(dailyExpenses.id, id), eq(dailyExpenses.userId, userId)))
    .returning();
  return row ?? null;
}
