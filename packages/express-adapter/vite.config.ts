import { defineConfig } from 'vitest/config';

export default defineConfig(async ({ mode }) => {
    if (mode != 'test') {
        throw Error('vite is only meant to be run in test mode--build itself can be done via tsc');
    }
    
    return {
        test: {
            environment: 'node',
            env: Object.assign({}, process.env as Record<string, string>),
        },
        build: {
            sourcemap: true,
            outDir: 'dist',
            lib: {
                entry: './src/index.ts',
                formats: [ 'es' ],
                name: 'fluvial',
                fileName: 'fluvial',
            },
            rollupOptions: {
                input: './src/index.ts',
                output: {
                    format: 'es',
                    compact: false,
                },
                treeshake: false,
            },
        },
    };
});
