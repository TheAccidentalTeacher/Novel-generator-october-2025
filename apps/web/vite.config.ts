import path from 'node:path';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite configuration tailored for the Phase 7 frontend scaffold.
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src')
		}
	},
	envPrefix: 'VITE_',
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: './src/test/setup.ts',
		exclude: [...configDefaults.exclude, 'storybook-static/**'],
		coverage: {
			reporter: ['text', 'html'],
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/**/*.stories.*', 'src/**/*.d.ts']
		}
	},
	build: {
		outDir: 'dist',
		sourcemap: true,
		target: 'es2020'
	},
	server: {
		open: false,
		port: 5173
	},
	preview: {
		port: 4173
	}
});
