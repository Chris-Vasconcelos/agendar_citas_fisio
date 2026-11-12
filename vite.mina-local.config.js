import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_MINA_BACKEND': JSON.stringify('pocketbase'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
  },
  build: { outDir: 'dist-local' },
  server: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:8090' } },
});
