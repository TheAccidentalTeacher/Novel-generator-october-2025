declare module 'migrate-mongo' {
  type Db = Record<string, unknown>;
  interface MongoClient {
    close(): Promise<void>;
  }
  type MongoClientOptions = Record<string, unknown>;

  export interface MigrationConfig {
    mongodb: {
      url: string;
      databaseName: string;
      options?: MongoClientOptions;
    };
    migrationsDir: string;
    changelogCollectionName: string;
    migrationFileExtension?: string;
    useFileHash?: boolean;
  }

  export interface MigrationStatus {
    fileName: string;
    appliedAt: string | null;
  }

  export namespace config {
    function set(config: MigrationConfig): void;
    function read(): Promise<MigrationConfig>;
  }

  export namespace database {
    function connect(): Promise<{ db: Db; client: MongoClient }>;
    function close(): Promise<void>;
  }

  export function up(db: Db, client: MongoClient): Promise<string[]>;
  export function down(db: Db, client: MongoClient): Promise<string[]>;
  export function status(db: Db): Promise<MigrationStatus[]>;
  export function create(description: string): Promise<string>;
}
