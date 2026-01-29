import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'video.js'],
    exclude: [],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable proper asset hashing for cache busting
    rollupOptions: {
      output: {
        // Hash all assets except the main HTML file
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunks for better code splitting
        manualChunks: {
          // React core libraries
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
          
          // Router and query
          'router': ['wouter', '@tanstack/react-query'],
          
          // UI Framework - Radix UI components
          'ui-framework': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
          ],
          
          // Video player libraries
          'video-player': ['video.js', 'hls.js', '@videojs/http-streaming'],
          
          // Form handling
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Icons and animations
          'icons-animations': ['lucide-react', 'framer-motion', 'react-icons'],
          
          // Utilities
          'utilities': ['axios', 'date-fns', 'clsx', 'tailwind-merge'],
        }
      }
    },
    // Generate manifest for proper cache invalidation
    manifest: true,
    // Ensure proper source maps for debugging
    sourcemap: process.env.NODE_ENV === 'development'
  },
  // Cache busting for development
  server: {
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0'
    }
  }
});
