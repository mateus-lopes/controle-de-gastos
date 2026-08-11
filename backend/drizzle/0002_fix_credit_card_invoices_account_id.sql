-- Rename credit_card_id to account_id in credit_card_invoices
-- and update constraint/FK to reference accounts instead of credit_cards

ALTER TABLE "credit_card_invoices"
  DROP CONSTRAINT IF EXISTS "credit_card_invoices_credit_card_id_month_year_unique";
--> statement-breakpoint

ALTER TABLE "credit_card_invoices"
  DROP CONSTRAINT IF EXISTS "credit_card_invoices_credit_card_id_credit_cards_id_fk";
--> statement-breakpoint

ALTER TABLE "credit_card_invoices"
  RENAME COLUMN "credit_card_id" TO "account_id";
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "credit_card_invoices"
    ADD CONSTRAINT "credit_card_invoices_account_id_accounts_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "credit_card_invoices"
    ADD CONSTRAINT "credit_card_invoices_account_id_month_year_unique"
    UNIQUE ("account_id", "month", "year");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "cc_inv_user_month_year_idx"
  ON "credit_card_invoices" ("user_id", "month", "year");
