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
        // Exclude noindex placeholder sections (indexed pages must not be in the sitemap)
        const isNoindexSection = /\/(playground|cheatsheets|labs|configs)(\/|$)/.test(page) && !/\/tools\//.test(page);
        return !isErrorPage && !isNoindexSection;
      }
    }),
    {
      name: 'rename-sitemap',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          try {
            const distDir = fileURLToPath(dir);
            const clientDir = path.join(distDir, 'client');
            
            let sitemap0 = path.join(clientDir, 'sitemap-0.xml');
            let sitemapIndex = path.join(clientDir, 'sitemap-index.xml');
            let sitemapTarget = path.join(clientDir, 'sitemap.xml');
            
            if (!fs.existsSync(sitemap0) && !fs.existsSync(sitemapIndex)) {
              sitemap0 = path.join(distDir, 'sitemap-0.xml');
              sitemapIndex = path.join(distDir, 'sitemap-index.xml');
              sitemapTarget = path.join(distDir, 'sitemap.xml');
            }
            
            if (fs.existsSync(sitemap0)) {
              fs.copyFileSync(sitemap0, sitemapTarget);
              console.log('Successfully copied sitemap-0.xml to sitemap.xml');
              try {
                fs.unlinkSync(sitemap0);
                if (fs.existsSync(sitemapIndex)) {
                  fs.unlinkSync(sitemapIndex);
                }
                console.log('Cleaned up temporary sitemap files.');
              } catch (err) {
                console.warn('Could not clean up temporary sitemap index/chunk files:', err);
              }
            } else if (fs.existsSync(sitemapIndex)) {
              fs.copyFileSync(sitemapIndex, sitemapTarget);
              console.log('Fallback: Successfully copied sitemap-index.xml to sitemap.xml');
            } else {
              console.warn('Sitemap files not found to copy.');
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