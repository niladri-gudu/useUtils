// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        // Exclude error status pages from the sitemap
        const isErrorPage = /\/(400|401|403|404|500|503)\/?$/.test(page);
        return !isErrorPage;
      }
    }),
    {
      name: 'rename-sitemap',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          try {
            const distDir = fileURLToPath(dir);
            const clientDir = path.join(distDir, 'client');
            const oldPath = path.join(clientDir, 'sitemap-index.xml');
            const newPath = path.join(clientDir, 'sitemap.xml');
            
            if (fs.existsSync(oldPath)) {
              fs.copyFileSync(oldPath, newPath);
              console.log('Successfully copied sitemap-index.xml to sitemap.xml');
            } else {
              const rootOldPath = path.join(distDir, 'sitemap-index.xml');
              const rootNewPath = path.join(distDir, 'sitemap.xml');
              if (fs.existsSync(rootOldPath)) {
                fs.copyFileSync(rootOldPath, rootNewPath);
                console.log('Successfully copied root sitemap-index.xml to sitemap.xml');
              } else {
                console.warn('Sitemap index file not found to copy.');
              }
            }
          } catch (error) {
            console.error('Error copying sitemap file:', error);
          }
        }
      }
    }
  ],
  site: 'https://useutils.com',
  trailingSlash: 'never',

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
    },
  },

  adapter: cloudflare(),
});