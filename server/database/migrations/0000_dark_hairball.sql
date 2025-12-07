CREATE SCHEMA "iam";
--> statement-breakpoint
CREATE SCHEMA "parts";
--> statement-breakpoint
CREATE TABLE "iam"."groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "iam"."groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."organization_memberships" (
	"user_id" integer NOT NULL,
	"organization_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."organizations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "iam"."organizations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."roles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "iam"."roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "iam"."users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"authentik_uid" text NOT NULL,
	CONSTRAINT "users_authentik_uid_unique" UNIQUE("authentik_uid")
);
--> statement-breakpoint
CREATE TABLE "parts"."part_definitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "parts"."part_definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "part_definitions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "parts"."parts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "parts"."parts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"part_definition_id" integer NOT NULL,
	"serial_number" text,
	CONSTRAINT "parts_part_definition_id_serial_number_unique" UNIQUE("part_definition_id","serial_number")
);
--> statement-breakpoint
ALTER TABLE "iam"."groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."organizations" ADD CONSTRAINT "organizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."roles" ADD CONSTRAINT "roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts"."parts" ADD CONSTRAINT "parts_part_definition_id_part_definitions_id_fk" FOREIGN KEY ("part_definition_id") REFERENCES "parts"."part_definitions"("id") ON DELETE no action ON UPDATE no action;