import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'node',
        globals: true,
        setupFiles: './src/test/setup.ts',
        exclude: ['node_modules', 'e2e', 'dist', '.idea', '.git', '.cache'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'e2e/',
                'src/test/setup.ts',
                '**/*.d.ts',
                '**/*.config.ts',
                '**/*.config.js',
                'src/db/**', // Usually integration tested or mocked
                'src/components/ui/**', // Shaden UI components
                'src/app/api/auth/**', // Auth.js internals
            ],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
