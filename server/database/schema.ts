import { pgTable, bigint, text, unique } from "drizzle-orm/pg-core";

const id = bigint("id", { mode: "bigint" })
  .primaryKey()
  .generatedAlwaysAsIdentity({ minValue: 1000 });

export const users = pgTable("users", {
  id,
  authentikUid: text("authentik_uid").notNull().unique(),
});

export const partDefinitions = pgTable("part_definitions", {
  id,
  name: text("name").notNull().unique(),
});

export const parts = pgTable(
  "parts",
  {
    id,
    partDefinitionId: bigint("part_definition_id", { mode: "bigint" })
      .references(() => partDefinitions.id)
      .notNull(),
    serialNumber: text("serial_number"),
  },
  (t) => [unique().on(t.partDefinitionId, t.serialNumber)],
);
