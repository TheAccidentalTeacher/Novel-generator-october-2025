import { startWorker } from './main.js';

void startWorker().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: 'error', service: 'worker-bootstrap', message }));
  process.exitCode = 1;
});
