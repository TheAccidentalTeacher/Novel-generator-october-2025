#!/usr/bin/env ts-node
import 'dotenv/config';
import process from 'node:process';
import * as migrateMongo from 'migrate-mongo';
import config from '../migrate-mongo-config.ts';

const command = process.argv[2] ?? 'status';
const validCommands = new Set(['up', 'down', 'status', 'create']);

if (!validCommands.has(command)) {
  console.error(`Unknown migrate command: ${command}. Expected one of ${Array.from(validCommands).join(', ')}.`);
  process.exitCode = 1;
  process.exit(1);
}

async function run(): Promise<void> {
  migrateMongo.config.set(config);

  if (command === 'create') {
    const description = process.argv[3];
    if (!description) {
      console.error('Please provide a kebab-case description, e.g. "pnpm run migrate create add-outlines-field".');
      process.exitCode = 1;
      process.exit(1);
    }

    const filePath = await migrateMongo.create(description);
    console.log(`Created migration at ${filePath}`);
    return;
  }

  const { db, client } = await migrateMongo.database.connect();

  try {
    if (command === 'up') {
      const migrated = await migrateMongo.up(db, client);
      if (migrated.length === 0) {
        console.log('No pending migrations to apply.');
      } else {
        console.log(`Applied migrations:\n- ${migrated.join('\n- ')}`);
      }
      return;
    }

    if (command === 'down') {
      const reverted = await migrateMongo.down(db, client);
      if (reverted.length === 0) {
        console.log('No migrations available to roll back.');
      } else {
        console.log(`Rolled back migrations:\n- ${reverted.join('\n- ')}`);
      }
      return;
    }

  const status = await migrateMongo.status(db);
    if (status.length === 0) {
      console.log('No migrations have been generated yet.');
      return;
    }

    console.log('Migration status:');
    for (const item of status) {
      console.log(`${item.fileName.padEnd(50)} ${item.appliedAt ?? 'pending'}`);
    }
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error('Migration command failed:', error);
  process.exitCode = 1;
  process.exit(1);
});
