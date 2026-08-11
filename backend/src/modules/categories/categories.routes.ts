import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  categorySchema,
} from "./categories.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    res.json(await listCategories(req.userId!));
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    res.status(201).json(await createCategory(req.userId!, parsed.data));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const cat = await updateCategory(req.userId!, id, parsed.data);
    if (!cat) { res.status(404).json({ error: "Categoria não encontrada" }); return; }
    res.json(cat);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const cat = await deleteCategory(req.userId!, id);
    if (!cat) { res.status(404).json({ error: "Categoria não encontrada" }); return; }
    res.json({ ok: true });
  })
);

export default router;
