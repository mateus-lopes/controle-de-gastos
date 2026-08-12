import { eq, and, sum, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { accounts, transactions, bills, billOccurrences, creditCardInvoices, ACCOUNT_TYPES } from "../../db/schema";

export const accountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES),
  color: z.string().optional(),
  targetAmount: z.coerce.number().positive().optional(),
  showProgress: z.boolean().optional(),
});

export async function listAccounts(userId: number) {
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.active, true)))
    .orderBy(accounts.createdAt);
}

export async function createAccount(userId: number, data: z.infer<typeof accountSchema>) {
  const [account] = await db
    .insert(accounts)
    .values({
      userId,
      name: data.name,
      type: data.type,
      color: data.color,
      targetAmount: data.targetAmount ? String(data.targetAmount) : null,
      showProgress: data.showProgress ?? false,
    })
    .returning();
  return account;
}

export async function updateAccount(userId: number, id: number, data: z.infer<typeof accountSchema>) {
  const [account] = await db
    .update(accounts)
    .set({
      name: data.name,
      type: data.type,
      color: data.color,
      targetAmount: data.targetAmount ? String(data.targetAmount) : null,
      showProgress: data.showProgress ?? false,
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();
  return account ?? null;
}

export async function deleteAccount(userId: number, id: number) {
  const [account] = await db
    .update(accounts)
    .set({ active: false })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();
  return account ?? null;
}

export async function getAccountBalance(userId: number, accountId: number): Promise<number> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  if (!account) return 0;

  if (account.type === "investment") {
    return parseFloat(account.currentAmount ?? "0");
  }

  const [inResult] = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(and(eq(transactions.toAccountId, accountId), eq(transactions.userId, userId)));

  const [outResult] = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(and(eq(transactions.fromAccountId, accountId), eq(transactions.userId, userId)));

  const inflow = parseFloat(inResult?.total ?? "0");
  const outflow = parseFloat(outResult?.total ?? "0");
  return inflow - outflow;
}

export async function listAccountsWithBalances(userId: number, month: number, year: number) {
  const accts = await listAccounts(userId);
  if (!accts.length) return [];

  const nonInvestmentIds = accts.filter(a => a.type !== "investment").map(a => a.id);

  if (!nonInvestmentIds.length) {
    return accts.map(a => ({ ...a, balance: parseFloat(a.currentAmount ?? "0") }));
  }

  const [inflows, outflows, billInflows, billOutflows] = await Promise.all([
    db
      .select({ accountId: transactions.toAccountId, total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.month, month),
        eq(transactions.year, year),
        inArray(transactions.toAccountId, nonInvestmentIds),
      ))
      .groupBy(transactions.toAccountId),

    db
      .select({ accountId: transactions.fromAccountId, total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.month, month),
        eq(transactions.year, year),
        inArray(transactions.fromAccountId, nonInvestmentIds),
      ))
      .groupBy(transactions.fromAccountId),

    db
      .select({ accountId: bills.toAccountId, total: sum(billOccurrences.amount) })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(
        eq(billOccurrences.userId, userId),
        eq(billOccurrences.month, month),
        eq(billOccurrences.year, year),
        eq(billOccurrences.paid, true),
        eq(bills.type, "income"),
        inArray(bills.toAccountId, nonInvestmentIds),
      ))
      .groupBy(bills.toAccountId),

    db
      .select({ accountId: bills.fromAccountId, total: sum(billOccurrences.amount) })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(
        eq(billOccurrences.userId, userId),
        eq(billOccurrences.month, month),
        eq(billOccurrences.year, year),
        eq(billOccurrences.paid, true),
        eq(bills.type, "expense"),
        inArray(bills.fromAccountId, nonInvestmentIds),
      ))
      .groupBy(bills.fromAccountId),
  ]);

  const inflowMap  = new Map(inflows.map(r => [r.accountId, parseFloat(r.total ?? "0")]));
  const outflowMap = new Map(outflows.map(r => [r.accountId, parseFloat(r.total ?? "0")]));
  const billInMap  = new Map(billInflows.map(r => [r.accountId, parseFloat(r.total ?? "0")]));
  const billOutMap = new Map(billOutflows.map(r => [r.accountId, parseFloat(r.total ?? "0")]));

  return accts.map(a => ({
    ...a,
    balance: a.type === "investment"
      ? parseFloat(a.currentAmount ?? "0")
      : (inflowMap.get(a.id) ?? 0)
        + (billInMap.get(a.id) ?? 0)
        - (outflowMap.get(a.id) ?? 0)
        - (billOutMap.get(a.id) ?? 0),
  }));
}

export async function getInvoice(userId: number, accountId: number, month: number, year: number) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId), eq(accounts.active, true)));

  if (!account || account.type !== "credit_card") return null;

  const [amountResult] = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(
      and(
        eq(transactions.fromAccountId, accountId),
        eq(transactions.userId, userId),
        eq(transactions.month, month),
        eq(transactions.year, year),
        eq(transactions.type, "expense")
      )
    );

  const amount = parseFloat(amountResult?.total ?? "0");

  const [existing] = await db
    .select()
    .from(creditCardInvoices)
    .where(
      and(
        eq(creditCardInvoices.accountId, accountId),
        eq(creditCardInvoices.userId, userId),
        eq(creditCardInvoices.month, month),
        eq(creditCardInvoices.year, year)
      )
    );

  return {
    account: { id: account.id, name: account.name, color: account.color },
    month,
    year,
    amount,
    paid: existing?.paid ?? false,
    paidAt: existing?.paidAt ?? null,
    invoiceId: existing?.id ?? null,
  };
}

export async function toggleInvoicePaid(
  userId: number,
  accountId: number,
  month: number,
  year: number,
  fromAccountId: number | null,
) {
  const [account] = await db
    .select({ name: accounts.name })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  const [existing] = await db
    .select()
    .from(creditCardInvoices)
    .where(
      and(
        eq(creditCardInvoices.accountId, accountId),
        eq(creditCardInvoices.userId, userId),
        eq(creditCardInvoices.month, month),
        eq(creditCardInvoices.year, year)
      )
    );

  const nowPaid = !existing?.paid;

  if (!nowPaid) {
    // Desmarcar: deletar transação de pagamento se existir
    if (existing?.paymentTransactionId) {
      await db.delete(transactions).where(eq(transactions.id, existing.paymentTransactionId));
    }
    const [updated] = await db
      .update(creditCardInvoices)
      .set({ paid: false, paidAt: null, paymentTransactionId: null })
      .where(eq(creditCardInvoices.id, existing!.id))
      .returning();
    return updated;
  }

  // Marcar como pago
  let paymentTransactionId: number | null = null;

  if (fromAccountId) {
    // Calcular valor da fatura
    const [amountResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.fromAccountId, accountId),
        eq(transactions.userId, userId),
        eq(transactions.month, month),
        eq(transactions.year, year),
        eq(transactions.type, "expense"),
      ));
    const amount = parseFloat(amountResult?.total ?? "0");

    if (amount > 0) {
      const mm = String(month).padStart(2, "0");
      const [tx] = await db.insert(transactions).values({
        userId,
        type: "transfer",
        fromAccountId,
        toAccountId: accountId,
        amount: String(amount.toFixed(2)),
        date: `${year}-${mm}-01`,
        month,
        year,
        description: `Pagamento fatura ${account?.name ?? "cartão"}`,
      }).returning();
      paymentTransactionId = tx.id;
    }
  }

  if (!existing) {
    const [created] = await db
      .insert(creditCardInvoices)
      .values({ accountId, userId, month, year, paid: true, paidAt: new Date(), paymentTransactionId })
      .returning();
    return created;
  }

  const [updated] = await db
    .update(creditCardInvoices)
    .set({ paid: true, paidAt: new Date(), paymentTransactionId })
    .where(eq(creditCardInvoices.id, existing.id))
    .returning();
  return updated;
}

export async function getAllInvoicesForMonth(userId: number, month: number, year: number) {
  const creditCards = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.type, "credit_card"), eq(accounts.active, true)));

  if (!creditCards.length) return [];

  const cardIds = creditCards.map((c) => c.id);

  const [amountRows, invoiceRows] = await Promise.all([
    db
      .select({ accountId: transactions.fromAccountId, total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.month, month),
        eq(transactions.year, year),
        eq(transactions.type, "expense"),
        inArray(transactions.fromAccountId, cardIds),
      ))
      .groupBy(transactions.fromAccountId),
    db
      .select()
      .from(creditCardInvoices)
      .where(and(
        eq(creditCardInvoices.userId, userId),
        eq(creditCardInvoices.month, month),
        eq(creditCardInvoices.year, year),
        inArray(creditCardInvoices.accountId, cardIds),
      )),
  ]);

  const amountMap = new Map(amountRows.map((r) => [r.accountId, parseFloat(r.total ?? "0")]));
  const invoiceMap = new Map(invoiceRows.map((r) => [r.accountId, r]));

  return creditCards.map((card) => {
    const invoice = invoiceMap.get(card.id) ?? null;
    return {
      account: { id: card.id, name: card.name, color: card.color },
      month,
      year,
      amount: amountMap.get(card.id) ?? 0,
      paid: invoice?.paid ?? false,
      paidAt: invoice?.paidAt ?? null,
      invoiceId: invoice?.id ?? null,
    };
  });
}
