import { migrate } from "drizzle-orm/node-postgres/migrator";

export default defineTask({
  meta: {
    name: "db:migrate",
    description: "Run database migration task",
  },
  async run() {
    const db = useDrizzle();
    await migrate(db, {
      migrationsFolder: "server/database/migrations",
    });

    return { result: null };
  },
});
