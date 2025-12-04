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
      // Define global specifically for some older libraries
      'global': 'window',
      // Strictly replace process.env.API_KEY with the string value.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Prevent crashes if code accesses process.env
      'process.env': {},
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