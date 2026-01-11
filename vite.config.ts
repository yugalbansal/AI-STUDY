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
  
  // Performance Optimizations for SEO
  build: {
    // Code splitting for better caching and faster loads
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks (changes less frequently)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-clerk': ['@clerk/clerk-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-gemini': ['@google/generative-ai'],
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Use esbuild minify instead of terser (faster, no extra deps)
    minify: 'esbuild'
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
