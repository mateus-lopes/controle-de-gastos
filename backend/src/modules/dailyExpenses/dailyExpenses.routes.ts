import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import {
  listDailyExpenses,
  createDailyExpense,
  updateDailyExpense,
  deleteDailyExpense,
  dailyExpenseSchema,
} from "./dailyExpenses.service";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req: AuthRequest, res) => {
  const month = parseInt(String(req.query.month));
  const year = parseInt(String(req.query.year));
  if (isNaN(month) || isNaN(year)) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }

  const filters = {
    categoryId: req.query.categoryId ? parseInt(String(req.query.categoryId)) : undefined,
    paymentMethod: req.query.paymentMethod ? String(req.query.paymentMethod) : undefined,
  };

  res.json(await listDailyExpenses(req.userId!, month, year, filters));
}));

router.post("/", asyncHandler(async (req: AuthRequest, res) => {
  const parsed = dailyExpenseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.status(201).json(await createDailyExpense(req.userId!, parsed.data));
}));

router.put("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = dailyExpenseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const row = await updateDailyExpense(req.userId!, id, parsed.data);
  if (!row) { res.status(404).json({ error: "Gasto não encontrado" }); return; }
  res.json(row);
}));

router.delete("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const row = await deleteDailyExpense(req.userId!, id);
  if (!row) { res.status(404).json({ error: "Gasto não encontrado" }); return; }
  res.json({ ok: true });
}));

export default router;
