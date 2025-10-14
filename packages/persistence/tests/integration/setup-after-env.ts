import { connectToDatabase, disconnectFromDatabase } from '../../src/connection.ts';

jest.setTimeout(30_000);

beforeAll(async () => {
  const uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    throw new Error('TEST_MONGODB_URI was not set by the integration test global setup.');
  }

  await connectToDatabase(uri, {
    dbName: 'integration-tests'
  });
});

afterAll(async () => {
  await disconnectFromDatabase();
});
