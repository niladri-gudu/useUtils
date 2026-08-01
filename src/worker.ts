import server from '@astrojs/cloudflare/entrypoints/server';

const CANONICAL_HOST = 'useutils.com';

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // 301: www.useutils.com -> useutils.com (single canonical host)
    if (url.hostname === `www.${CANONICAL_HOST}`) {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    // 301: strip trailing slash on non-root paths (single canonical URL form)
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
      return Response.redirect(url.toString(), 301);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (server as any).fetch(request, env, ctx);
  }
};
