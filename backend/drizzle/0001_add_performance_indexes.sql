CREATE INDEX IF NOT EXISTS "accounts_user_active_idx" ON "accounts" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_type_active_idx" ON "accounts" USING btree ("user_id","type","active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_occ_user_month_year_idx" ON "bill_occurrences" USING btree ("user_id","month","year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_occ_bill_id_idx" ON "bill_occurrences" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_user_month_year_idx" ON "transactions" USING btree ("user_id","month","year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_user_month_year_type_idx" ON "transactions" USING btree ("user_id","month","year","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_from_account_idx" ON "transactions" USING btree ("from_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_to_account_idx" ON "transactions" USING btree ("to_account_id");