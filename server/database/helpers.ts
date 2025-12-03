import { integer } from "drizzle-orm/pg-core";

export const id = integer("id")
  .primaryKey()
  .generatedAlwaysAsIdentity({ minValue: 1000 });
