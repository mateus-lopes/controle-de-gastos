ALTER TABLE "credit_card_invoices" ADD COLUMN IF NOT EXISTS "payment_transaction_id" integer REFERENCES "transactions"("id") ON DELETE SET NULL;
