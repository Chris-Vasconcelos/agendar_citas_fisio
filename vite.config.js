import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Development and packaged builds use the same local backend and output.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist-local' },
  server: {
    host: '127.0.0.1',
    proxy: { '/api': 'http://127.0.0.1:8090' },
    watch: { ignored: ['**/*.tmp', '**/~$*', '**/*.csv'] },
  },
});
