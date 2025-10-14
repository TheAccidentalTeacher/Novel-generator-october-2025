import { stopMemoryMongo } from './mongo-memory-server.ts';
import { rollbackMigrations } from './rollback-migrations.ts';

export default async function globalTeardown(): Promise<void> {
  try {
    await rollbackMigrations();
  } finally {
    await stopMemoryMongo();
  }
}
