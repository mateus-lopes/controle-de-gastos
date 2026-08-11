import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import {
  listInstallmentsForMonth,
  createInstallment,
  updateInstallment,
  deleteInstallment,
  toggleInstallmentPayment,
  createInstallmentSchema,
  updateInstallmentSchema,
} from "./installments.service";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req: AuthRequest, res) => {
  const month = parseInt(String(req.query.month));
  const year = parseInt(String(req.query.year));
  if (isNaN(month) || isNaN(year)) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
  res.json(await listInstallmentsForMonth(req.userId!, month, year));
}));

router.post("/", asyncHandler(async (req: AuthRequest, res) => {
  const parsed = createInstallmentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.status(201).json(await createInstallment(req.userId!, parsed.data));
}));

router.put("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = updateInstallmentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const row = await updateInstallment(req.userId!, id, parsed.data);
  if (!row) { res.status(404).json({ error: "Parcela não encontrada" }); return; }
  res.json(row);
}));

router.delete("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const row = await deleteInstallment(req.userId!, id);
  if (!row) { res.status(404).json({ error: "Parcela não encontrada" }); return; }
  res.json({ ok: true });
}));

const paymentSchema = z.object({ month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int() });

router.patch("/:id/payment", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const row = await toggleInstallmentPayment(req.userId!, id, parsed.data.month, parsed.data.year);
  if (!row) { res.status(404).json({ error: "Parcela não encontrada" }); return; }
  res.json(row);
}));

export default router;
