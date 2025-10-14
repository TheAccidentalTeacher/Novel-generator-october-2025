import { MongoNovelJobEventRepository, NovelJobEventModel, NovelJobModel, connectToDatabase, disconnectFromDatabase } from '@letswriteabook/persistence';
import type { NovelJobEventRecord } from '@letswriteabook/domain';

export async function openMongoConnection(uri: string): Promise<void> {
  await connectToDatabase(uri, { maxPoolSize: 2 });
}

export async function closeMongoConnection(): Promise<void> {
  await disconnectFromDatabase();
}

export async function seedJobEvents(events: ReadonlyArray<NovelJobEventRecord>): Promise<void> {
  const repository = new MongoNovelJobEventRepository();

  for (const event of events) {
    await repository.append(event);
  }
}

export async function cleanupJobArtifacts(jobId: string): Promise<void> {
  await Promise.all([
    NovelJobEventModel.deleteMany({ jobId }).exec(),
    NovelJobModel.deleteOne({ jobId }).exec(),
  ]);
}
