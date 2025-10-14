import { startMemoryMongo } from './mongo-memory-server.ts';
import { runMigrations } from './run-migrations.ts';

export default async function globalSetup(): Promise<void> {
  const { uri, databaseName } = await startMemoryMongo();
  process.env.TEST_MONGODB_URI = uri;
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_MIGRATIONS_DATABASE = databaseName;
  process.env.MONGODB_DATABASE = databaseName;
  process.env.MONGODB_DATABASE_NAME = databaseName;
  await runMigrations(uri);
}
