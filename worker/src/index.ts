export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/health') {
      return json({ ok: true, time: new Date().toISOString() });
    }
    if (pathname.startsWith('/api/')) {
      return json({ error: 'not_found' }, 404);
    }
    return env.ASSETS.fetch(request); // static (expo export --platform web)
  },
} satisfies ExportedHandler<Env>;
