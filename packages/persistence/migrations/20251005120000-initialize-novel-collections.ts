import type { Collection, CreateIndexesOptions, Db, IndexDescription, IndexSpecification } from 'mongodb';

interface IndexDefinition {
  key: IndexSpecification;
  options?: CreateIndexesOptions;
}

async function ensureCollection(db: Db, collectionName: string): Promise<Collection> {
  const existingCollection = await db.listCollections({ name: collectionName }).next();

  if (!existingCollection) {
    await db.createCollection(collectionName);
  }

  return db.collection(collectionName);
}

async function ensureIndexes(collection: Collection, definitions: IndexDefinition[]): Promise<void> {
  const existingIndexes: IndexDescription[] = await collection.indexes();
  const existingIndexNames = new Set(existingIndexes.map((index) => index.name));

  for (const { key, options } of definitions) {
    const indexName = options?.name;
    if (indexName && existingIndexNames.has(indexName)) {
      continue;
    }

    await collection.createIndex(key, options);
  }
}

export async function up(db: Db): Promise<void> {
  const novelJobs = await ensureCollection(db, 'novel_jobs');
  await ensureIndexes(novelJobs, [
    { key: { jobId: 1 }, options: { unique: true, name: 'idx_novel_jobs_jobId' } },
    { key: { status: 1, createdAt: -1 }, options: { name: 'idx_novel_jobs_status_createdAt' } },
  ]);

  const novelJobEvents = await ensureCollection(db, 'novel_job_events');
  await ensureIndexes(novelJobEvents, [
    { key: { jobId: 1, emittedAt: -1 }, options: { name: 'idx_novel_job_events_jobId_emittedAt' } },
    { key: { jobId: 1, kind: 1, emittedAt: -1 }, options: { name: 'idx_novel_job_events_kind_emittedAt' } },
  ]);

  const novelJobMetrics = await ensureCollection(db, 'novel_job_metrics');
  await ensureIndexes(novelJobMetrics, [
    { key: { jobId: 1 }, options: { unique: true, name: 'idx_novel_job_metrics_jobId' } },
    { key: { updatedAt: -1 }, options: { name: 'idx_novel_job_metrics_updatedAt' } },
  ]);

  const novelJobMetadata = await ensureCollection(db, 'novel_job_metadata');
  await ensureIndexes(novelJobMetadata, [
    { key: { jobId: 1 }, options: { unique: true, name: 'idx_novel_job_metadata_jobId' } },
    {
      key: { jobId: 1, 'continuityAlerts.resolved': 1 },
      options: { name: 'idx_novel_job_metadata_alert_resolution' },
    },
  ]);

  // Placeholder for future backfill logic once the legacy data import path has been finalized.
}

export async function down(db: Db): Promise<void> {
  const collections = ['novel_job_metadata', 'novel_job_metrics', 'novel_job_events', 'novel_jobs'];

  for (const collectionName of collections) {
    const existingCollection = await db.listCollections({ name: collectionName }).next();
    if (existingCollection) {
      await db.collection(collectionName).drop();
    }
  }
}
