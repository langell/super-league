import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'node',
        globals: true,
        setupFiles: './src/test/setup.ts',
        exclude: ['node_modules', 'e2e', 'dist', '.idea', '.git', '.cache', '.next'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: [
                'src/lib/**/*.ts',
                'src/app/actions.ts',
                'src/app/api/**/*.ts',
            ],
            exclude: [
                '**/node_modules/**',
                '**/e2e/**',
                'src/test/**',
                '**/*.d.ts',
                '**/*.test.ts',
                '**/*.test.tsx',
            ],
            thresholds: {
                lines: 70,
                functions: 80,
                branches: 50,
                statements: 70,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
