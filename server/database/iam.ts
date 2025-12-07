import { text, pgSchema } from "drizzle-orm/pg-core";
import { idType, baseMixin } from "./helpers";

export const schema = pgSchema("iam");

export const users = schema.table("users", {
  ...baseMixin,
  name: text("name").notNull(),
  authentikUid: text("authentik_uid").notNull().unique(),
});

export const createdBy = idType("created_by")
  .references(() => users.id)
  .notNull();

export const groups = schema.table("groups", {
  ...baseMixin,
  createdBy,
});

export const organizations = schema.table("organizations", {
  ...baseMixin,
  createdBy,
  name: text("name").notNull(),
});

export const organizationMemberships = schema.table(
  "organization_memberships",
  {
    userId: idType("user_id")
      .references(() => users.id)
      .notNull(),
    organizationId: idType("organization_id")
      .references(() => organizations.id)
      .notNull(),
  },
);

export const roles = schema.table("roles", {
  ...baseMixin,
  createdBy,
  organizationId: idType("organization_id")
    .references(() => organizations.id)
    .notNull(),
  name: text("name").notNull(),
});
