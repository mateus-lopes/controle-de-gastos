ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "is_carry_over" boolean DEFAULT false NOT NULL;
