import { randomUUID } from 'node:crypto';
import type { Connection } from 'mongoose';
import { getMongoConnection } from '../../connection.ts';
import { NovelJobModel } from '../../models/novel-job.ts';
import { MongoNovelJobRepository } from '../../repositories/mongo-novel-job-repository.ts';

function generateJobId(): string {
  return randomUUID();
}

describe('MongoNovelJobRepository (integration)', () => {
  let connection: Connection;

  beforeAll(() => {
    connection = getMongoConnection();
  });

  afterEach(async () => {
    await NovelJobModel.deleteMany({}).exec();
  });
  it('initializes and retrieves a job document', async () => {
    const repository = new MongoNovelJobRepository();

    const jobId = generateJobId();
    await repository.initializeJob({
      jobId,
      queue: 'novels',
      payload: {
        title: 'Test Title',
        premise: 'Test Premise',
        genre: 'fantasy',
        subgenre: 'epic',
        targetWordCount: 1000,
        targetChapters: 5,
        humanLikeWriting: true,
      },
      receivedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      requestedAt: new Date().toISOString(),
    });

  const found = await repository.findByJobId(jobId);
  expect(found).not.toBeNull();
  expect(found?.id).toBe(jobId);
  expect(found?.status).toBe('running');
  });

  it('commits transactional writes via withSession', async () => {
    const repository = new MongoNovelJobRepository();
    const session = await connection.startSession();

    const jobId = generateJobId();

    try {
      await session.withTransaction(async () => {
        const transactionalRepo = repository.withSession(session);
        await transactionalRepo.initializeJob({
          jobId,
          queue: 'novels',
          payload: {
            title: 'Tx Title',
            premise: 'Tx Premise',
            genre: 'mystery',
            subgenre: 'cozy',
            targetWordCount: 800,
            targetChapters: 4,
            humanLikeWriting: false,
          },
          receivedAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
        });
      });
    } finally {
      await session.endSession();
    }

    const persisted = await repository.findByJobId(jobId);
    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe('running');
  });
});
