import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        // Hide deprecation warnings coming from node_modules (e.g. Bootstrap SCSS)
        quietDeps: true,
      },
    },
  },
});
