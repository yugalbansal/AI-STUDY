import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  preview: {
    port: 4173,
    strictPort: false,
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    // Fallback to index.html for client-side routing
    proxy: {},
  },
});
