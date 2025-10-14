import mongoose, { type ConnectOptions, type Connection } from 'mongoose';

let connectionPromise: Promise<typeof mongoose> | undefined;

export async function connectToDatabase(uri: string, options: ConnectOptions = {}): Promise<typeof mongoose> {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(uri, {
      autoIndex: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30_000,
      ...options,
    })
  .catch((error: unknown) => {
      connectionPromise = undefined;
      throw error;
    });

  return connectionPromise;
}

export function getMongoConnection(): Connection {
  return mongoose.connection;
}

export function getMongooseInstance(): typeof mongoose {
  return mongoose;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (!connectionPromise) {
    return;
  }

  await mongoose.disconnect();
  connectionPromise = undefined;
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
