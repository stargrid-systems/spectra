CREATE TABLE "iam"."users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "iam"."users_id_seq" INCREMENT BY 1 MINVALUE 1000 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"authentik_uid" text NOT NULL,
	CONSTRAINT "users_authentik_uid_unique" UNIQUE("authentik_uid")
);
--> statement-breakpoint
CREATE TABLE "parts"."part_definitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "parts"."part_definitions_id_seq" INCREMENT BY 1 MINVALUE 1000 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "part_definitions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "parts"."parts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "parts"."parts_id_seq" INCREMENT BY 1 MINVALUE 1000 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"part_definition_id" integer NOT NULL,
	"serial_number" text,
	CONSTRAINT "parts_part_definition_id_serial_number_unique" UNIQUE("part_definition_id","serial_number")
);
--> statement-breakpoint
ALTER TABLE "parts"."parts" ADD CONSTRAINT "parts_part_definition_id_part_definitions_id_fk" FOREIGN KEY ("part_definition_id") REFERENCES "parts"."part_definitions"("id") ON DELETE no action ON UPDATE no action;