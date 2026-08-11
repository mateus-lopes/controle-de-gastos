import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import {
  listBillsForMonth,
  createBill,
  updateBill,
  deleteBill,
  toggleOccurrencePaid,
  billSchema,
  ensureOccurrencesForMonth,
} from "./bills.service";

const router = Router();
router.use(requireAuth);

const monthYearSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = monthYearSchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    res.json(await listBillsForMonth(req.userId!, parsed.data.month, parsed.data.year));
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = billSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    res.status(201).json(await createBill(req.userId!, parsed.data));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = billSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const bill = await updateBill(req.userId!, id, parsed.data);
    if (!bill) { res.status(404).json({ error: "Recorrente não encontrado" }); return; }
    res.json(bill);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const bill = await deleteBill(req.userId!, id);
    if (!bill) { res.status(404).json({ error: "Recorrente não encontrado" }); return; }
    res.json({ ok: true });
  })
);

router.get(
  "/occurrences",
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = monthYearSchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    await ensureOccurrencesForMonth(req.userId!, parsed.data.month, parsed.data.year);
    res.json({ ok: true });
  })
);

router.patch(
  "/occurrences/:id/pay",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const result = await toggleOccurrencePaid(req.userId!, id);
    if (!result) { res.status(404).json({ error: "Ocorrência não encontrada" }); return; }
    res.json(result);
  })
);

export default router;
