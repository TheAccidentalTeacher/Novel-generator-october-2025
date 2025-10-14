import type { ClientSession } from 'mongoose';
type MongoTransactionOptions = NonNullable<Parameters<ClientSession['withTransaction']>[1]>;
export type MongoTransactionWork<T> = (session: ClientSession) => Promise<T>;
export declare function runInMongoTransaction<T>(work: MongoTransactionWork<T>, options?: MongoTransactionOptions): Promise<T>;
export {};
