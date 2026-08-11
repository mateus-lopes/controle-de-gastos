import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { categories } from "../../db/schema";

export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
});

export async function listCategories(userId: number) {
  return db.select().from(categories).where(eq(categories.userId, userId));
}

export async function createCategory(userId: number, data: z.infer<typeof categorySchema>) {
  const [cat] = await db.insert(categories).values({ userId, ...data }).returning();
  return cat;
}

export async function updateCategory(userId: number, id: number, data: z.infer<typeof categorySchema>) {
  const [cat] = await db
    .update(categories)
    .set(data)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();
  return cat ?? null;
}

export async function deleteCategory(userId: number, id: number) {
  const [cat] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();
  return cat ?? null;
}
