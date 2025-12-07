import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "../database";

let instance: ReturnType<typeof drizzle> | null = null;

export function useDrizzle() {
  if (!instance) {
    const { databaseUrl } = useRuntimeConfig();
    instance = drizzle(databaseUrl, { schema });
  }
  return instance;
}
