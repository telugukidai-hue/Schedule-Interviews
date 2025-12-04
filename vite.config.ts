import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We cast process to any to avoid TS errors in the config file context
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Strictly replace process.env.API_KEY with the string value.
      // This allows the code to run in the browser without "process" being defined.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Polyfill NODE_ENV just in case libraries check it
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});