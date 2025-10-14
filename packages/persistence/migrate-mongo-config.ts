import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MigrationConfig } from 'migrate-mongo';

interface BuildConfigOptions {
  uri?: string;
  databaseName?: string;
}

function resolveMongoUri(customUri?: string): string {
  if (customUri) {
    return customUri;
  }

  const uri = process.env.MONGODB_MIGRATIONS_URI ?? process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI (or MONGODB_MIGRATIONS_URI) must be defined to run migrations.');
  }
  return uri;
}

function resolveDatabaseName(uri: string, explicit?: string): string {
  if (explicit) {
    return explicit;
  }

  const fallback =
    process.env.MONGODB_MIGRATIONS_DATABASE ?? process.env.MONGODB_DATABASE ?? process.env.MONGODB_DATABASE_NAME;
  if (fallback) {
    return fallback;
  }

  const [connectionWithoutParams] = uri.split('?');
  const segments = connectionWithoutParams.split('/');
  const candidate = segments[segments.length - 1];

  if (!candidate || candidate.includes('@') || candidate.includes(':')) {
    throw new Error(
      'Unable to determine Mongo database name from URI. Provide MONGODB_MIGRATIONS_DATABASE or include the database in the connection string.',
    );
  }

  return decodeURIComponent(candidate);
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export function buildMigrationConfig(options: BuildConfigOptions = {}): MigrationConfig {
  const uri = resolveMongoUri(options.uri);
  const databaseName = resolveDatabaseName(uri, options.databaseName);

  return {
    mongodb: {
      url: uri,
      databaseName,
      options: {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 30_000,
      },
    },
    migrationsDir: path.join(currentDir, 'migrations'),
    changelogCollectionName: 'persistence_migrations',
    migrationFileExtension: '.ts',
    useFileHash: true,
  };
}

const config = buildMigrationConfig();

export default config;
