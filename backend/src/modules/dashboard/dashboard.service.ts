import { eq, and, sum, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { transactions, bills, billOccurrences, accounts, categories } from "../../db/schema";
import { ensureOccurrencesForMonth } from "../bills/bills.service";
import { getAllInvoicesForMonth } from "../accounts/accounts.service";

function prevMonthYear(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}

async function getAccountMonthSaldo(userId: number, accountId: number, month: number, year: number): Promise<number> {
  const [txIn, txOut, billIn, billOut] = await Promise.all([
    db.select({ total: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.toAccountId, accountId), eq(transactions.month, month), eq(transactions.year, year))),
    db.select({ total: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.fromAccountId, accountId), eq(transactions.month, month), eq(transactions.year, year))),
    db.select({ total: sum(billOccurrences.amount) }).from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(eq(billOccurrences.userId, userId), eq(billOccurrences.month, month), eq(billOccurrences.year, year), eq(billOccurrences.paid, true), eq(bills.type, "income"), eq(bills.toAccountId, accountId))),
    db.select({ total: sum(billOccurrences.amount) }).from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(eq(billOccurrences.userId, userId), eq(billOccurrences.month, month), eq(billOccurrences.year, year), eq(billOccurrences.paid, true), eq(bills.type, "expense"), eq(bills.fromAccountId, accountId))),
  ]);
  return parseFloat(txIn[0]?.total ?? "0") + parseFloat(billIn[0]?.total ?? "0")
       - parseFloat(txOut[0]?.total ?? "0") - parseFloat(billOut[0]?.total ?? "0");
}

async function getMonthSaldo(userId: number, month: number, year: number): Promise<number> {
  const [txInc, txExp, billInc, billExp] = await Promise.all([
    db.select({ total: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "income"))),
    db.select({ total: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.type, "expense"))),
    db.select({ total: sum(billOccurrences.amount) }).from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(eq(billOccurrences.userId, userId), eq(billOccurrences.month, month), eq(billOccurrences.year, year), eq(billOccurrences.paid, true), eq(bills.type, "income"))),
    db.select({ total: sum(billOccurrences.amount) }).from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(eq(billOccurrences.userId, userId), eq(billOccurrences.month, month), eq(billOccurrences.year, year), eq(billOccurrences.paid, true), eq(bills.type, "expense"))),
  ]);
  const income = parseFloat(txInc[0]?.total ?? "0") + parseFloat(billInc[0]?.total ?? "0");
  const expense = parseFloat(txExp[0]?.total ?? "0") + parseFloat(billExp[0]?.total ?? "0");
  return income - expense;
}

export function nextMonthYear(month: number, year: number) {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}

export async function upsertCarryOverTransactions(userId: number, month: number, year: number) {
  const prev = prevMonthYear(month, year);

  // Buscar todas as contas líquidas (não-investimento)
  const liquidAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(
      eq(accounts.userId, userId),
      eq(accounts.active, true),
      inArray(accounts.type, ["checking", "savings", "cash"]),
    ));

  // Apagar carry-overs existentes deste mês
  await db.delete(transactions).where(
    and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year), eq(transactions.isCarryOver, true))
  );

  if (!liquidAccounts.length) return;

  const mm = String(month).padStart(2, "0");

  // Para cada conta, calcular saldo do mês anterior e criar carry-over individual
  for (const account of liquidAccounts) {
    const prevSaldo = await getAccountMonthSaldo(userId, account.id, prev.month, prev.year);
    if (prevSaldo === 0) continue;

    await db.insert(transactions).values({
      userId,
      type: prevSaldo > 0 ? "income" : "expense",
      fromAccountId: prevSaldo < 0 ? account.id : null,
      toAccountId:   prevSaldo > 0 ? account.id : null,
      amount: String(Math.abs(prevSaldo).toFixed(2)),
      date: `${year}-${mm}-01`,
      month,
      year,
      description: "Saldo anterior",
      isCarryOver: true,
    });
  }
}

export async function getDashboard(userId: number, month: number, year: number) {
  await ensureOccurrencesForMonth(userId, month, year);

  // Compute previous month's saldo and upsert carry-over transaction
  const prev = prevMonthYear(month, year);
  await upsertCarryOverTransactions(userId, month, year);
  const prevSaldo = await getMonthSaldo(userId, prev.month, prev.year);

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
    carryOver: prevSaldo,
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
