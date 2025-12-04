import { text, pgSchema, integer } from "drizzle-orm/pg-core";
import { id } from "./helpers";

const schema = pgSchema("iam");

export const users = schema.table("users", {
  id,
  authentikUid: text("authentik_uid").notNull().unique(),
});

export const organizations = schema.table("organizations", {
  id,
  name: text("name").notNull(),
});

export const roles = schema.table("roles", {
  id,
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
});
