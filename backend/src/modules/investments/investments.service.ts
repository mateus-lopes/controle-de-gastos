import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { investments, investmentContributions } from "../../db/schema";

export const investmentSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  monthlyAmount: z.coerce.number().positive(),
  goalAmount: z.coerce.number().positive().optional(),
  currentAmount: z.coerce.number().min(0).optional(),
  showProgress: z.boolean().optional(),
});

const paymentSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int(),
});
export { paymentSchema as investmentPaymentSchema };

export async function listInvestments(userId: number, month: number, year: number) {
  const all = await db.select().from(investments).where(eq(investments.userId, userId));

  const contributions = await db
    .select()
    .from(investmentContributions)
    .where(
      and(
        eq(investmentContributions.userId, userId),
        eq(investmentContributions.month, month),
        eq(investmentContributions.year, year)
      )
    );

  const contribMap = new Map(contributions.map((c) => [c.investmentId, c]));

  return all.map((inv) => ({
    ...inv,
    contribution: contribMap.get(inv.id) ?? null,
    paid: contribMap.get(inv.id)?.paid ?? false,
  }));
}

export async function createInvestment(userId: number, data: z.infer<typeof investmentSchema>) {
  const [row] = await db
    .insert(investments)
    .values({
      userId,
      name: data.name,
      type: data.type,
      monthlyAmount: String(data.monthlyAmount),
      goalAmount: data.goalAmount ? String(data.goalAmount) : null,
      currentAmount: data.currentAmount ? String(data.currentAmount) : "0",
      showProgress: data.showProgress ?? false,
    })
    .returning();
  return row;
}

export async function updateInvestment(userId: number, id: number, data: z.infer<typeof investmentSchema>) {
  const [row] = await db
    .update(investments)
    .set({
      name: data.name,
      type: data.type,
      monthlyAmount: String(data.monthlyAmount),
      goalAmount: data.goalAmount ? String(data.goalAmount) : null,
      currentAmount: data.currentAmount !== undefined ? String(data.currentAmount) : undefined,
      showProgress: data.showProgress,
    })
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteInvestment(userId: number, id: number) {
  const [row] = await db
    .delete(investments)
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .returning();
  return row ?? null;
}

export async function toggleContribution(userId: number, investmentId: number, month: number, year: number) {
  const [inv] = await db
    .select()
    .from(investments)
    .where(and(eq(investments.id, investmentId), eq(investments.userId, userId)));
  if (!inv) return null;

  const [existing] = await db
    .select()
    .from(investmentContributions)
    .where(
      and(
        eq(investmentContributions.investmentId, investmentId),
        eq(investmentContributions.userId, userId),
        eq(investmentContributions.month, month),
        eq(investmentContributions.year, year)
      )
    );

  if (existing) {
    const newPaid = !existing.paid;
    const [updated] = await db
      .update(investmentContributions)
      .set({ paid: newPaid, paidAt: newPaid ? new Date() : null })
      .where(eq(investmentContributions.id, existing.id))
      .returning();

    if (newPaid && inv.goalAmount) {
      const newAmount = parseFloat(inv.currentAmount ?? "0") + parseFloat(inv.monthlyAmount);
      await db
        .update(investments)
        .set({ currentAmount: String(newAmount) })
        .where(eq(investments.id, investmentId));
    }
    return updated;
  } else {
    const [created] = await db
      .insert(investmentContributions)
      .values({
        investmentId,
        userId,
        month,
        year,
        amount: inv.monthlyAmount,
        paid: true,
        paidAt: new Date(),
      })
      .returning();

    if (inv.goalAmount) {
      const newAmount = parseFloat(inv.currentAmount ?? "0") + parseFloat(inv.monthlyAmount);
      await db
        .update(investments)
        .set({ currentAmount: String(newAmount) })
        .where(eq(investments.id, investmentId));
    }
    return created;
  }
}
