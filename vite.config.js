import { defineConfig } from 'vite';

export default defineConfig({
  base: '/semester-project-2/',
  css: {
    preprocessorOptions: {
      scss: {
        // Hide deprecation warnings coming from node_modules (e.g. Bootstrap SCSS)
        quietDeps: true,
      },
    },
  },
});
