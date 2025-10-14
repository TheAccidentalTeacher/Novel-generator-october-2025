import { loadApiConfig, type ApiConfig } from '@letswriteabook/config';
import type { Provider } from '@nestjs/common';

export const API_CONFIG_TOKEN = Symbol('API_CONFIG_TOKEN');

export const apiConfigProvider: Provider = {
  provide: API_CONFIG_TOKEN,
  useFactory: (): ApiConfig => loadApiConfig({ service: 'api' }),
};
