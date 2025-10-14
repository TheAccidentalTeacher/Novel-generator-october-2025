import path from 'node:path';
import { mergeConfig } from 'vite';
import type { StorybookConfig } from '@storybook/react-vite';

import baseViteConfig from '../vite.config';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  },
  viteFinal: async (config) => {
    const alias =
      typeof baseViteConfig.resolve?.alias === 'object' && !Array.isArray(baseViteConfig.resolve.alias)
        ? baseViteConfig.resolve.alias
        : {};

    return mergeConfig(config, {
      plugins: baseViteConfig.plugins ?? [],
      resolve: {
        alias: {
          ...alias,
          '@': path.resolve(__dirname, '../src')
        }
      }
    });
  }
};

export default config;