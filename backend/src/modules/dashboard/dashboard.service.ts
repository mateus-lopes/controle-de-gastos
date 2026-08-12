import { eq, and, sum, inArray, or, lt } from "drizzle-orm";
import { db } from "../../db/client";
import { transactions, bills, billOccurrences, accounts, categories } from "../../db/schema";
import { ensureOccurrencesForMonth } from "../bills/bills.service";
import { getAllInvoicesForMonth } from "../accounts/accounts.service";

export async function getDashboard(userId: number, month: number, year: number) {
  await ensureOccurrencesForMonth(userId, month, year);

  const [
    txIncomeResult,
    txExpenseResult,
    billIncomeResult,
    billExpenseResult,
    txRows,
    pendingOccurrences,
    investments,
    creditCardInvoices,
    investmentBillOccs,
    carryOverIncomeResult,
    carryOverExpenseResult,
  ] = await Promise.all([
    db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "income"))),

    db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "expense"))),

    db
      .select({ total: sum(billOccurrences.amount) })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(
        eq(billOccurrences.userId, userId),
        eq(billOccurrences.month, month),
        eq(billOccurrences.year, year),
        eq(billOccurrences.paid, true),
        eq(bills.type, "income")
      )),

    db
      .select({ total: sum(billOccurrences.amount) })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(
        eq(billOccurrences.userId, userId),
        eq(billOccurrences.month, month),
        eq(billOccurrences.year, year),
        eq(billOccurrences.paid, true),
        eq(bills.type, "expense")
      )),

    db
      .select({ categoryId: transactions.categoryId, amount: transactions.amount })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "expense"))),

    db
      .select({ occ: billOccurrences, bill: bills })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(
        eq(billOccurrences.userId, userId),
        eq(billOccurrences.month, month),
        eq(billOccurrences.year, year),
        eq(billOccurrences.paid, false),
        eq(bills.active, true)
      )),

    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.type, "investment"), eq(accounts.active, true))),

    getAllInvoicesForMonth(userId, month, year),

    db
      .select({ occ: billOccurrences, bill: bills })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(
        eq(billOccurrences.userId, userId),
        eq(billOccurrences.month, month),
        eq(billOccurrences.year, year),
        eq(bills.type, "transfer")
      )),

    db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        or(lt(transactions.year, year), and(eq(transactions.year, year), lt(transactions.month, month)))
      )),

    db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        or(lt(transactions.year, year), and(eq(transactions.year, year), lt(transactions.month, month)))
      )),
  ]);

  const totalTxIncome = parseFloat(txIncomeResult[0]?.total ?? "0");
  const totalTxExpense = parseFloat(txExpenseResult[0]?.total ?? "0");
  const totalBillIncome = parseFloat(billIncomeResult[0]?.total ?? "0");
  const totalBillExpense = parseFloat(billExpenseResult[0]?.total ?? "0");

  const totalIncome = totalTxIncome + totalBillIncome;
  const totalExpenses = totalTxExpense + totalBillExpense;
  const saldo = totalIncome - totalExpenses;

  const pendingBillExpense = pendingOccurrences
    .filter(({ bill }) => bill.type === "expense")
    .reduce((acc, { occ }) => acc + parseFloat(occ.amount), 0);
  const pendingBillIncome = pendingOccurrences
    .filter(({ bill }) => bill.type === "income")
    .reduce((acc, { occ }) => acc + parseFloat(occ.amount), 0);

  const carryOver =
    parseFloat(carryOverIncomeResult[0]?.total ?? "0") -
    parseFloat(carryOverExpenseResult[0]?.total ?? "0");

  const categoryIds = [...new Set(txRows.map((r) => r.categoryId).filter(Boolean) as number[])];
  const cats = categoryIds.length
    ? await db.select().from(categories).where(and(eq(categories.userId, userId), inArray(categories.id, categoryIds)))
    : [];
  const categoryMap = new Map(cats.map((c) => [c.id, c]));

  const categoryTotals = new Map<number, number>();
  for (const row of txRows) {
    if (!row.categoryId) continue;
    categoryTotals.set(row.categoryId, (categoryTotals.get(row.categoryId) ?? 0) + parseFloat(row.amount ?? "0"));
  }

  const categoriesBreakdown = [...categoryTotals.entries()].map(([id, total]) => {
    const cat = categoryMap.get(id);
    return { categoryId: id, categoryName: cat?.name ?? null, categoryColor: cat?.color ?? null, total };
  });

  const investmentOccMap = new Map(investmentBillOccs.map((o) => [o.bill.toAccountId, o]));

  const investmentWithOcc = investments.map((inv) => {
    const occ = investmentOccMap.get(inv.id);
    return {
      id: inv.id,
      name: inv.name,
      type: inv.type,
      currentAmount: parseFloat(inv.currentAmount ?? "0"),
      targetAmount: inv.targetAmount ? parseFloat(inv.targetAmount) : null,
      showProgress: inv.showProgress,
      monthlyAmount: occ ? parseFloat(occ.occ.amount) : null,
      occurrence: occ?.occ ?? null,
      paid: occ?.occ.paid ?? false,
    };
  });

  return {
    month,
    year,
    totalIncome,
    totalExpenses,
    saldo,
    carryOver,
    breakdown: {
      transactionIncome: totalTxIncome,
      billIncome: totalBillIncome,
      transactionExpense: totalTxExpense,
      billExpense: totalBillExpense,
      pendingBillExpense,
      pendingBillIncome,
    },
    categoriesBreakdown,
    creditCards: creditCardInvoices,
    pending: pendingOccurrences.map(({ occ, bill }) => ({
      id: occ.id,
      billId: bill.id,
      name: bill.name,
      type: bill.type,
      amount: parseFloat(occ.amount),
      dueDate: occ.dueDate,
    })),
    investments: investmentWithOcc,
  };
}
