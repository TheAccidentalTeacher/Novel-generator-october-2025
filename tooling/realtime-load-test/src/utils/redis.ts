import Redis, { type Redis as RedisClient } from 'ioredis';

export async function createRedisPublisher(url: string): Promise<RedisClient> {
  const client = new Redis(url, {
    name: 'realtime-load-test',
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

  await client.connect();
  return client;
}

export async function closeRedisPublisher(client?: RedisClient): Promise<void> {
  if (!client) {
    return;
  }

  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
}
