import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { env } from "../../config/env";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: "7d" });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

const ADMIN_PASSWORD = "P4$$w0rD";

export async function resetPassword(adminPassword: string, email: string, newPassword: string) {
  if (adminPassword !== ADMIN_PASSWORD) return { ok: false, error: "Senha admin inválida" } as const;
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return { ok: false, error: "Usuário não encontrado" } as const;
  const hash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));
  return { ok: true } as const;
}

export async function getMe(userId: number) {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  return user ?? null;
}
