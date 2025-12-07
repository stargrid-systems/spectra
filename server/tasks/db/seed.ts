export default defineTask({
  meta: {
    name: "db:seed",
    description: "Run database seed task",
  },
  async run() {
    const db = useDrizzle();
    await db.insert(tables.users).values([
      {
        name: "Test User",
        authentikUid: "test-user-uid",
      },
    ]);

    return { result: null };
  },
});
