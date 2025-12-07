import { integer, timestamp } from "drizzle-orm/pg-core";

export function idType<N extends string>(name: N) {
  return integer(name);
}

export const id = idType("id")
  .primaryKey()
  .generatedAlwaysAsIdentity({ startWith: 1000 });

export const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();

export const baseMixin = {
  id,
  createdAt,
};
