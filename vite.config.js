import { defineConfig } from 'vite';

export default defineConfig({
  base: '/semester-project-2/',

  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        register: 'register.html',
        login: 'login.html',
        profile: 'profile.html',
        listing: 'listing.html',
        'listing-edit': 'listing-edit.html',
        how: 'how.html',
        404: '404.html',
      },
    },
  },
});
