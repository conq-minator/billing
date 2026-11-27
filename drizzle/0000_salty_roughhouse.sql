CREATE TABLE "bill_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"name_snapshot" text NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"unit" text NOT NULL,
	"rate" bigint,
	"amount" bigint DEFAULT 0 NOT NULL,
	"line_discount_type" text,
	"line_discount_value" numeric(12, 3),
	"line_discount_amount" bigint DEFAULT 0 NOT NULL,
	"flags" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"bill_no" integer NOT NULL,
	"public_id" text NOT NULL,
	"customer_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"session_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_seq" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"subtotal" bigint DEFAULT 0 NOT NULL,
	"item_discount_total" bigint DEFAULT 0 NOT NULL,
	"bill_discount_type" text,
	"bill_discount_value" numeric(12, 3),
	"bill_discount_amount" bigint DEFAULT 0 NOT NULL,
	"round_off" bigint DEFAULT 0 NOT NULL,
	"total" bigint DEFAULT 0 NOT NULL,
	"paid_cash" bigint DEFAULT 0 NOT NULL,
	"paid_upi" bigint DEFAULT 0 NOT NULL,
	"balance_due" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	"edited_at" timestamp with time zone,
	CONSTRAINT "bills_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "bills_status_chk" CHECK ("bills"."status" IN ('open', 'final', 'edited')),
	CONSTRAINT "bills_discount_type_chk" CHECK ("bills"."bill_discount_type" IS NULL OR "bills"."bill_discount_type" IN ('percent', 'flat', 'target_total'))
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_norm" text NOT NULL,
	"phone" text,
	"balance_due" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_norm" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"default_unit" text DEFAULT 'unit' NOT NULL,
	"price_per_unit" bigint,
	"price_source" text,
	"times_used" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_price_source_chk" CHECK ("items"."price_source" IS NULL OR "items"."price_source" IN ('owner_spoken', 'owner_edited', 'auto'))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"customer_id" uuid,
	"bill_id" uuid,
	"amount" bigint NOT NULL,
	"mode" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_mode_chk" CHECK ("payments"."mode" IN ('cash', 'upi'))
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"shop_id" uuid PRIMARY KEY NOT NULL,
	"discount_scope_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"discount_scope_learned" text,
	"other_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"price_per_unit" bigint NOT NULL,
	"unit" text NOT NULL,
	"source" text NOT NULL,
	"bill_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"upi_vpa" text NOT NULL,
	"gstin" text,
	"language_primary" text DEFAULT 'hi' NOT NULL,
	"language_secondary" text DEFAULT 'bn' NOT NULL,
	"next_bill_no" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"bill_id" uuid,
	"transcript" text NOT NULL,
	"lang" text NOT NULL,
	"route" text NOT NULL,
	"intent_json" jsonb NOT NULL,
	"outcome" text NOT NULL,
	"latency_ms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_events_route_chk" CHECK ("voice_events"."route" IN ('fast', 'llm', 'fallback')),
	CONSTRAINT "voice_events_outcome_chk" CHECK ("voice_events"."outcome" IN ('applied', 'clarify', 'error'))
);
--> statement-breakpoint
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_versions" ADD CONSTRAINT "bill_versions_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_events" ADD CONSTRAINT "voice_events_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_events" ADD CONSTRAINT "voice_events_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bills_shop_bill_no_uq" ON "bills" USING btree ("shop_id","bill_no");--> statement-breakpoint
CREATE INDEX "bills_shop_created_idx" ON "bills" USING btree ("shop_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "items_shop_name_norm_uq" ON "items" USING btree ("shop_id","name_norm");--> statement-breakpoint
CREATE INDEX "items_aliases_gin_idx" ON "items" USING gin ("aliases");--> statement-breakpoint
CREATE INDEX "items_name_norm_idx" ON "items" USING btree ("name_norm");--> statement-breakpoint
CREATE INDEX "price_history_item_created_idx" ON "price_history" USING btree ("item_id","created_at" DESC NULLS LAST);