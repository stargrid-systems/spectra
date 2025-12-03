import { text, pgSchema } from "drizzle-orm/pg-core";
import { id } from "./helpers";

const schema = pgSchema("iam");

export const users = schema.table("users", {
  id,
  authentikUid: text("authentik_uid").notNull().unique(),
});
