import 'reflect-metadata';
import { Logger, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { initializeConfig, loadApiConfig } from '@letswriteabook/config';
import { AppModule } from './app.module';

export async function bootstrap(): Promise<void> {
  initializeConfig({ service: 'api' });

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = loadApiConfig();

  app.useLogger(config.loggerLevels as LogLevel[]);

  app.enableCors({
    origin: config.socketClientOrigin,
    credentials: true,
  });

  await app.listen(config.port);
  app.flushLogs();

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on port ${config.port} (${config.nodeEnv})`);

  const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of shutdownSignals) {
    process.once(signal, async () => {
      logger.log(`Received ${signal}. Shutting down API server.`);
      await app.close();
      process.exit(0);
    });
  }
}

if (require.main === module) {
  bootstrap().catch((error) => {
    // eslint-disable-next-line no-console -- Fallback logger for bootstrap failures.
    console.error('[API] Failed to bootstrap application', error);
    process.exit(1);
  });
}
