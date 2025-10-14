import * as migrateMongo from 'migrate-mongo';

export async function runMigrations(uri: string): Promise<void> {
  const { buildMigrationConfig } = await import('../../migrate-mongo-config.ts');
  const databaseName = process.env.MONGODB_MIGRATIONS_DATABASE ?? 'integration-tests';
  const config = buildMigrationConfig({ uri, databaseName });
  migrateMongo.config.set(config);

  const { db, client } = await migrateMongo.database.connect();
  try {
    await migrateMongo.up(db, client);
    process.env.MIGRATIONS_RAN = 'true';
  } finally {
    await client.close();
  }
}
