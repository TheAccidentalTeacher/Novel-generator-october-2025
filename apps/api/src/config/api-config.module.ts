import { Global, Module } from '@nestjs/common';
import { apiConfigProvider } from './api-config.provider';

@Global()
@Module({
  providers: [apiConfigProvider],
  exports: [apiConfigProvider],
})
export class ApiConfigModule {}
