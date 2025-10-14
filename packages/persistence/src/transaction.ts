import type { ClientSession } from 'mongoose';
import { getMongooseInstance } from './connection';

type MongoTransactionOptions = NonNullable<Parameters<ClientSession['withTransaction']>[1]>;

export type MongoTransactionWork<T> = (session: ClientSession) => Promise<T>;

const DEFAULT_TRANSACTION_OPTIONS: MongoTransactionOptions = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
};

export async function runInMongoTransaction<T>(
  work: MongoTransactionWork<T>,
  options: MongoTransactionOptions = DEFAULT_TRANSACTION_OPTIONS,
): Promise<T> {
  const mongoose = getMongooseInstance();
  const session = await mongoose.startSession();

  try {
    let result: T | undefined;

    await session.withTransaction(async () => {
      result = await work(session);
    }, options);

    if (typeof result === 'undefined') {
      throw new Error('Mongo transaction completed without returning a result.');
    }

    return result;
  } finally {
    await session.endSession();
  }
}
