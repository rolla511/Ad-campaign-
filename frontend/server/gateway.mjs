import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const production = process.env.NODE_ENV === 'production';
const gatewayKey = process.env.API_GATEWAY_KEY || '';
const website = new URL('../', import.meta.url);
const address = process.env.API_UPSTREAM_ORIGIN;
if (!address) throw new Error('Set API_UPSTREAM_ORIGIN on the website server.');
const upstream = new URL(address);
const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(upstream.hostname);
const secure = upstream.protocol === 'https:';
if ((!secure && (production || upstream.protocol !== 'http:' || !loopback)) ||
    upstream.username || upstream.password || upstream.pathname !== '/' || upstream.search || upstream.hash) {
  throw new Error('API_UPSTREAM_ORIGIN must be an HTTPS origin or a development loopback address.');
}
if (secure && Buffer.byteLength(gatewayKey) < 32) {
  throw new Error('Set API_GATEWAY_KEY on the website server.');
}

const trustedProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (!Number.isSafeInteger(trustedProxyHops) || trustedProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a nonnegative integer.');
}

function getClientIp(req) {
  const forwarded = typeof req.headers['x-forwarded-for'] === 'string'
    ? req.headers['x-forwarded-for'].split(',').map(ip => ip.trim())
    : [];
  const ip = trustedProxyHops && forwarded.at(-trustedProxyHops);
  return (ip && isIP(ip) ? ip : req.socket.remoteAddress)?.replace(/^::ffff:/, '');
}

function apiUnavailable(res) {
  res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ error: 'Party Booster is unavailable right now.' }));
}

async function proxyApi(req, res, url) {
  const target = new URL(upstream);
  target.pathname = url.pathname;
  target.search = url.search;

  const headers = new Headers();
  for (const name of ['accept', 'authorization', 'content-type']) {
    if (req.headers[name]) headers.set(name, req.headers[name]);
  }
  if (url.pathname === '/api/billing/webhook') {
    for (const name of ['stripe-signature', 'paypal-auth-algo', 'paypal-cert-url',
      'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time']) {
      if (req.headers[name]) headers.set(name, req.headers[name]);
    }
  }
  if (gatewayKey) headers.set('X-Party-Booster-Gateway-Key', gatewayKey);
  const clientIp = getClientIp(req);
  if (clientIp) headers.set('X-Party-Booster-Client-IP', clientIp);

  const abort = new AbortController();
  res.once('close', () => { if (!res.writableEnded) abort.abort(); });
  const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(12000)]);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  try {
    const response = await fetch(target, {
      method: req.method, headers, body: hasBody ? req : undefined,
      duplex: 'half', redirect: 'manual', signal
    });
    const contentType = response.headers.get('content-type') || '';
    const profilePhoto = /^\/api\/profile-photo\/[1-9]\d*$/.test(url.pathname) &&
      ['GET', 'HEAD'].includes(req.method) && contentType.toLowerCase() === 'image/jpeg';
    if ((response.status >= 300 && response.status < 400) ||
        (response.body && !profilePhoto && !contentType.toLowerCase().startsWith('application/json'))) {
      await response.body?.cancel();
      apiUnavailable(res);
      return;
    }
    res.writeHead(response.status, {
      'Content-Type': contentType || 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (response.body) await pipeline(Readable.fromWeb(response.body), res);
    else res.end();
  } catch {
    if (!res.destroyed && !res.headersSent) apiUnavailable(res);
    else res.destroy();
  }
}

const server = createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, 'http://website.invalid');
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (url.origin !== 'http://website.invalid') {
    res.writeHead(400).end();
    return;
  }
  if (/^\/api(?:\/|$)/.test(url.pathname)) {
    await proxyApi(req, res, url);
    return;
  }

  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  if (path === '/messages.html' && ['GET', 'HEAD'].includes(req.method)) {
    const params = new URLSearchParams({ tab: 'profile' });
    for (const key of ['userId', 'eventId', 'bookingId']) {
      const value = url.searchParams.get(key);
      if (/^[1-9]\d{0,9}$/.test(value || '')) params.set(key, value);
    }
    res.writeHead(302, { Location: '/dashboard.html?' + params + '#profile-messages', 'Cache-Control': 'no-store' }).end();
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method) ||
      !/^\/(?:[\w-]+\.html|css\/style\.css|js\/(?:app|leads|profile-activity)\.js|service-worker\.js|manifest\.webmanifest|icons\/app-(?:192|512)\.png)$/.test(path)) {
    res.writeHead(404).end();
    return;
  }

  try {
    const content = await readFile(new URL(path.slice(1), website));
    const types = {
      html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
      webmanifest: 'application/manifest+json; charset=utf-8', png: 'image/png'
    };
    res.writeHead(200, { 'Content-Type': types[path.split('.').at(-1)], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404).end();
  }
});

const port = Number(process.env.PORT ?? 8080);
server.listen(port, process.env.HOST || (production ? '0.0.0.0' : '127.0.0.1'), () => {
  console.log(`Party Booster website listening on port ${server.address().port}`);
});
