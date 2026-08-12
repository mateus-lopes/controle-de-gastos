CREATE TABLE IF NOT EXISTS "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"color" text,
	"active" boolean DEFAULT true NOT NULL,
	"target_amount" numeric(14, 2),
	"current_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"show_progress" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_occurrences" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"due_date" date NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"transaction_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_occurrences_bill_id_month_year_unique" UNIQUE("bill_id","month","year")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"from_account_id" integer,
	"to_account_id" integer,
	"amount" numeric(14, 2) NOT NULL,
	"category_id" integer,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_card_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_transaction_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_card_invoices_account_id_month_year_unique" UNIQUE("account_id","month","year")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"from_account_id" integer,
	"to_account_id" integer,
	"amount" numeric(14, 2) NOT NULL,
	"date" date NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"description" text NOT NULL,
	"notes" text,
	"category_id" integer,
	"bill_id" integer,
	"reconciled" boolean DEFAULT false NOT NULL,
	"is_carry_over" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_from_account_id_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_card_invoices" ADD CONSTRAINT "credit_card_invoices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_card_invoices" ADD CONSTRAINT "credit_card_invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_card_invoices" ADD CONSTRAINT "credit_card_invoices_payment_transaction_id_transactions_id_fk" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_account_id_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_active_idx" ON "accounts" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_type_active_idx" ON "accounts" USING btree ("user_id","type","active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_occ_user_month_year_idx" ON "bill_occurrences" USING btree ("user_id","month","year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_occ_bill_id_idx" ON "bill_occurrences" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cc_inv_user_month_year_idx" ON "credit_card_invoices" USING btree ("user_id","month","year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_user_month_year_idx" ON "transactions" USING btree ("user_id","month","year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_user_month_year_type_idx" ON "transactions" USING btree ("user_id","month","year","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_from_account_idx" ON "transactions" USING btree ("from_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tx_to_account_idx" ON "transactions" USING btree ("to_account_id");