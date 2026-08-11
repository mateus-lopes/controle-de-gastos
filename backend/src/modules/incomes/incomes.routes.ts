import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import {
  listFixedIncomes, createFixedIncome, updateFixedIncome, deleteFixedIncome, fixedIncomeSchema,
  listVariableIncomes, createVariableIncome, updateVariableIncome, deleteVariableIncome, variableIncomeSchema,
} from "./incomes.service";

const router = Router();
router.use(requireAuth);

router.get("/fixed", asyncHandler(async (req: AuthRequest, res) => {
  res.json(await listFixedIncomes(req.userId!));
}));

router.post("/fixed", asyncHandler(async (req: AuthRequest, res) => {
  const parsed = fixedIncomeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.status(201).json(await createFixedIncome(req.userId!, parsed.data));
}));

router.put("/fixed/:id", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = fixedIncomeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const row = await updateFixedIncome(req.userId!, id, parsed.data);
  if (!row) { res.status(404).json({ error: "Entrada não encontrada" }); return; }
  res.json(row);
}));

router.delete("/fixed/:id", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const row = await deleteFixedIncome(req.userId!, id);
  if (!row) { res.status(404).json({ error: "Entrada não encontrada" }); return; }
  res.json({ ok: true });
}));

router.get("/variable", asyncHandler(async (req: AuthRequest, res) => {
  const month = parseInt(String(req.query.month));
  const year = parseInt(String(req.query.year));
  if (isNaN(month) || isNaN(year)) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
  res.json(await listVariableIncomes(req.userId!, month, year));
}));

router.post("/variable", asyncHandler(async (req: AuthRequest, res) => {
  const parsed = variableIncomeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.status(201).json(await createVariableIncome(req.userId!, parsed.data));
}));

router.put("/variable/:id", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = variableIncomeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const row = await updateVariableIncome(req.userId!, id, parsed.data);
  if (!row) { res.status(404).json({ error: "Entrada não encontrada" }); return; }
  res.json(row);
}));

router.delete("/variable/:id", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const row = await deleteVariableIncome(req.userId!, id);
  if (!row) { res.status(404).json({ error: "Entrada não encontrada" }); return; }
  res.json({ ok: true });
}));

export default router;
