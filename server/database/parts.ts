import { pgSchema, integer, text, unique } from "drizzle-orm/pg-core";
import { id } from "./helpers";

const schema = pgSchema("parts");

export const partDefinitions = schema.table("part_definitions", {
  id,
  name: text("name").notNull().unique(),
});

export const parts = schema.table(
  "parts",
  {
    id,
    partDefinitionId: integer("part_definition_id")
      .references(() => partDefinitions.id)
      .notNull(),
    serialNumber: text("serial_number"),
  },
  (t) => [unique().on(t.partDefinitionId, t.serialNumber)],
);
