import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import {
  listCreditCards,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  getInvoice,
  getAllInvoicesForMonth,
  toggleInvoicePaid,
  creditCardSchema,
  invoiceToggleSchema,
} from "./creditCards.service";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req: AuthRequest, res) => {
  res.json(await listCreditCards(req.userId!));
}));

router.post("/", asyncHandler(async (req: AuthRequest, res) => {
  const parsed = creditCardSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.status(201).json(await createCreditCard(req.userId!, parsed.data));
}));

router.put("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = creditCardSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const row = await updateCreditCard(req.userId!, id, parsed.data);
  if (!row) { res.status(404).json({ error: "Cartão não encontrado" }); return; }
  res.json(row);
}));

router.delete("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const row = await deleteCreditCard(req.userId!, id);
  if (!row) { res.status(404).json({ error: "Cartão não encontrado" }); return; }
  res.json({ ok: true });
}));

router.get("/invoices", asyncHandler(async (req: AuthRequest, res) => {
  const month = parseInt(String(req.query.month));
  const year = parseInt(String(req.query.year));
  if (isNaN(month) || isNaN(year)) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
  res.json(await getAllInvoicesForMonth(req.userId!, month, year));
}));

router.get("/:id/invoice", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const month = parseInt(String(req.query.month));
  const year = parseInt(String(req.query.year));
  if (isNaN(month) || isNaN(year)) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
  const inv = await getInvoice(req.userId!, id, month, year);
  if (!inv) { res.status(404).json({ error: "Cartão não encontrado" }); return; }
  res.json(inv);
}));

router.patch("/:id/invoice", asyncHandler(async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = invoiceToggleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const row = await toggleInvoicePaid(req.userId!, id, parsed.data.month, parsed.data.year);
  if (!row) { res.status(404).json({ error: "Cartão não encontrado" }); return; }
  res.json(row);
}));

export default router;
