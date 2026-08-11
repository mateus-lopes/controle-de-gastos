import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { fixedIncomes, variableIncomes } from "../../db/schema";

export const fixedIncomeSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  active: z.boolean().optional(),
});

export const variableIncomeSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
});

export async function listFixedIncomes(userId: number) {
  return db.select().from(fixedIncomes).where(eq(fixedIncomes.userId, userId));
}

export async function createFixedIncome(userId: number, data: z.infer<typeof fixedIncomeSchema>) {
  const [row] = await db.insert(fixedIncomes).values({ userId, ...data, amount: String(data.amount) }).returning();
  return row;
}

export async function updateFixedIncome(userId: number, id: number, data: z.infer<typeof fixedIncomeSchema>) {
  const [row] = await db
    .update(fixedIncomes)
    .set({ ...data, amount: String(data.amount) })
    .where(and(eq(fixedIncomes.id, id), eq(fixedIncomes.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteFixedIncome(userId: number, id: number) {
  const [row] = await db
    .delete(fixedIncomes)
    .where(and(eq(fixedIncomes.id, id), eq(fixedIncomes.userId, userId)))
    .returning();
  return row ?? null;
}

export async function listVariableIncomes(userId: number, month: number, year: number) {
  return db
    .select()
    .from(variableIncomes)
    .where(
      and(
        eq(variableIncomes.userId, userId),
        eq(variableIncomes.month, month),
        eq(variableIncomes.year, year)
      )
    );
}

export async function createVariableIncome(userId: number, data: z.infer<typeof variableIncomeSchema>) {
  const [m, y] = [
    parseInt(data.date.slice(5, 7)),
    parseInt(data.date.slice(0, 4)),
  ];
  const [row] = await db
    .insert(variableIncomes)
    .values({ userId, ...data, amount: String(data.amount), month: m, year: y })
    .returning();
  return row;
}

export async function updateVariableIncome(userId: number, id: number, data: z.infer<typeof variableIncomeSchema>) {
  const [m, y] = [
    parseInt(data.date.slice(5, 7)),
    parseInt(data.date.slice(0, 4)),
  ];
  const [row] = await db
    .update(variableIncomes)
    .set({ ...data, amount: String(data.amount), month: m, year: y })
    .where(and(eq(variableIncomes.id, id), eq(variableIncomes.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteVariableIncome(userId: number, id: number) {
  const [row] = await db
    .delete(variableIncomes)
    .where(and(eq(variableIncomes.id, id), eq(variableIncomes.userId, userId)))
    .returning();
  return row ?? null;
}
