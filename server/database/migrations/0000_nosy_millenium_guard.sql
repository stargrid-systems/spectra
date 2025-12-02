CREATE TABLE "part_definitions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "part_definitions_id_seq" INCREMENT BY 1 MINVALUE 1000 MAXVALUE 9223372036854775807 START WITH 1000 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "part_definitions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "parts_id_seq" INCREMENT BY 1 MINVALUE 1000 MAXVALUE 9223372036854775807 START WITH 1000 CACHE 1),
	"part_definition_id" bigint NOT NULL,
	"serial_number" text,
	CONSTRAINT "parts_part_definition_id_serial_number_unique" UNIQUE("part_definition_id","serial_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1000 MAXVALUE 9223372036854775807 START WITH 1000 CACHE 1),
	"authentik_uid" text NOT NULL,
	CONSTRAINT "users_authentik_uid_unique" UNIQUE("authentik_uid")
);
--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_part_definition_id_part_definitions_id_fk" FOREIGN KEY ("part_definition_id") REFERENCES "public"."part_definitions"("id") ON DELETE no action ON UPDATE no action;