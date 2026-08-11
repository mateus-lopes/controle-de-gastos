import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { installments, installmentPayments } from "../../db/schema";

export const createInstallmentSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  currentInstallment: z.number().int().min(1),
  totalInstallments: z.number().int().min(1),
  currentMonth: z.number().int().min(1).max(12),
  currentYear: z.number().int(),
}).refine((d) => d.currentInstallment <= d.totalInstallments, {
  message: "Parcela atual não pode ser maior que o total",
});

export const updateInstallmentSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  active: z.boolean().optional(),
});

function computeStartDate(currentMonth: number, currentYear: number, currentInstallment: number) {
  const d = new Date(currentYear, currentMonth - 1, 1);
  d.setMonth(d.getMonth() - (currentInstallment - 1));
  return { startMonth: d.getMonth() + 1, startYear: d.getFullYear() };
}

function installmentNumberForMonth(inst: { startMonth: number; startYear: number }, month: number, year: number) {
  const diff = (year - inst.startYear) * 12 + (month - inst.startMonth);
  return diff + 1;
}

function isActiveInMonth(
  inst: { startMonth: number; startYear: number; totalInstallments: number },
  month: number,
  year: number
) {
  const instNum = installmentNumberForMonth(inst, month, year);
  return instNum >= 1 && instNum <= inst.totalInstallments;
}

export async function listInstallmentsForMonth(userId: number, month: number, year: number) {
  const all = await db
    .select()
    .from(installments)
    .where(and(eq(installments.userId, userId), eq(installments.active, true)));

  const active = all.filter((i) => isActiveInMonth(i, month, year));

  const payments = await db
    .select()
    .from(installmentPayments)
    .where(
      and(
        eq(installmentPayments.userId, userId),
        eq(installmentPayments.month, month),
        eq(installmentPayments.year, year)
      )
    );

  const paymentMap = new Map(payments.map((p) => [p.installmentId, p]));

  return active.map((i) => ({
    ...i,
    installmentNumber: installmentNumberForMonth(i, month, year),
    paid: paymentMap.get(i.id)?.paid ?? false,
    paidAt: paymentMap.get(i.id)?.paidAt ?? null,
  }));
}

export async function createInstallment(userId: number, data: z.infer<typeof createInstallmentSchema>) {
  const { startMonth, startYear } = computeStartDate(
    data.currentMonth,
    data.currentYear,
    data.currentInstallment
  );
  const [row] = await db
    .insert(installments)
    .values({
      userId,
      description: data.description,
      amount: String(data.amount),
      totalInstallments: data.totalInstallments,
      startMonth,
      startYear,
    })
    .returning();
  return row;
}

export async function updateInstallment(userId: number, id: number, data: z.infer<typeof updateInstallmentSchema>) {
  const [row] = await db
    .update(installments)
    .set({ ...data, amount: String(data.amount) })
    .where(and(eq(installments.id, id), eq(installments.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteInstallment(userId: number, id: number) {
  const [row] = await db
    .delete(installments)
    .where(and(eq(installments.id, id), eq(installments.userId, userId)))
    .returning();
  return row ?? null;
}

export async function toggleInstallmentPayment(
  userId: number,
  installmentId: number,
  month: number,
  year: number
) {
  const [inst] = await db
    .select()
    .from(installments)
    .where(and(eq(installments.id, installmentId), eq(installments.userId, userId)));
  if (!inst) return null;

  const instNumber = installmentNumberForMonth(inst, month, year);

  const [existing] = await db
    .select()
    .from(installmentPayments)
    .where(
      and(
        eq(installmentPayments.installmentId, installmentId),
        eq(installmentPayments.userId, userId),
        eq(installmentPayments.month, month),
        eq(installmentPayments.year, year)
      )
    );

  if (existing) {
    const newPaid = !existing.paid;
    const [updated] = await db
      .update(installmentPayments)
      .set({ paid: newPaid, paidAt: newPaid ? new Date() : null })
      .where(eq(installmentPayments.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(installmentPayments)
      .values({ installmentId, userId, month, year, installmentNumber: instNumber, paid: true, paidAt: new Date() })
      .returning();
    return created;
  }
}
