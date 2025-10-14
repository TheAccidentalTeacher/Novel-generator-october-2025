import * as migrateMongo from 'migrate-mongo';

export async function rollbackMigrations(): Promise<void> {
  if (process.env.MIGRATIONS_RAN !== 'true') {
    return;
  }

  const uri = process.env.TEST_MONGODB_URI ?? process.env.MONGODB_URI;
  if (!uri) {
    return;
  }

  const { buildMigrationConfig } = await import('../../migrate-mongo-config.ts');
  const databaseName = process.env.MONGODB_MIGRATIONS_DATABASE ?? 'integration-tests';
  const config = buildMigrationConfig({ uri, databaseName });
  migrateMongo.config.set(config);

  const { db, client } = await migrateMongo.database.connect();
  try {
    await migrateMongo.down(db, client);
  } finally {
    await client.close();
  }
}
