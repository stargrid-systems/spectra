import { pgSchema, text, unique } from "drizzle-orm/pg-core";
import { idType, baseMixin } from "./helpers";

export const schema = pgSchema("parts");

export const partDefinitions = schema.table("part_definitions", {
  ...baseMixin,
  name: text("name").notNull().unique(),
});

export const parts = schema.table(
  "parts",
  {
    ...baseMixin,
    partDefinitionId: idType("part_definition_id")
      .references(() => partDefinitions.id)
      .notNull(),
    serialNumber: text("serial_number"),
  },
  (t) => [unique().on(t.partDefinitionId, t.serialNumber)],
);
