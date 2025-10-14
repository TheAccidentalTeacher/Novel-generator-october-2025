import { MongoMemoryReplSet } from 'mongodb-memory-server';

export interface MemoryMongoContext {
  replSet: MongoMemoryReplSet;
  uri: string;
  databaseName: string;
}

let context: MemoryMongoContext | undefined;

const DATABASE_NAME = 'integration-tests';

export async function startMemoryMongo(): Promise<MemoryMongoContext> {
  if (context) {
    return context;
  }

  const replSet = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger'
    }
  });

  await replSet.waitUntilRunning();

  const uri = replSet.getUri(DATABASE_NAME);
  context = { replSet, uri, databaseName: DATABASE_NAME };
  return context;
}

export async function stopMemoryMongo(): Promise<void> {
  if (!context) {
    return;
  }

  try {
    await context.replSet.stop();
  } catch (error) {
    console.warn('Failed to stop MongoMemoryReplSet cleanly. Ignoring error.', error);
  } finally {
    context = undefined;
  }
}
