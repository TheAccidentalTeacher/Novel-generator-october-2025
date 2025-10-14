import mongoose, { type ConnectOptions, type Connection } from 'mongoose';
export declare function connectToDatabase(uri: string, options?: ConnectOptions): Promise<typeof mongoose>;
export declare function getMongoConnection(): Connection;
export declare function getMongooseInstance(): typeof mongoose;
export declare function disconnectFromDatabase(): Promise<void>;
export declare function isDatabaseConnected(): boolean;
