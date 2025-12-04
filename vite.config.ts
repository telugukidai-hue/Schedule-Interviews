import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Only replace the specific key we need. 
      // The rest of 'process' is handled by the polyfill in index.html to avoid conflicts.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});