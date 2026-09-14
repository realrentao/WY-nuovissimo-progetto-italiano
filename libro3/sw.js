/* ============================================================
   NPI Service Worker
   - *.mp3        ：CacheFirst，听过一次即永久本地命中，兼容 Range 206
   - js/ css/     ：StaleWhileRevalidate，二次访问秒开，后台自动更新
   - HTML / data/ ：一律走网络，保证教材内容更新即时生效
   ============================================================ */
const CACHE_NAME = 'npi-audio-v3';
const SHELL_CACHE = 'npi-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => (k.indexOf('npi-audio-') === 0 && k !== CACHE_NAME) ||
                         (k.indexOf('npi-shell-') === 0 && k !== SHELL_CACHE))
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* 解析 Range 头，返回 {start, end}；不支持或非法返回 null / {invalid:true} */
function parseRange(header, size) {
  const m = /bytes=(\d*)-(\d*)/.exec(header || '');
  if (!m) return null;
  let start = m[1] === '' ? null : parseInt(m[1], 10);
  let end = m[2] === '' ? null : parseInt(m[2], 10);
  if (start === null && end === null) return null;
  if (start === null) { start = Math.max(0, size - end); end = size - 1; }  /* 后缀区间 */
  if (end === null || end >= size) end = size - 1;
  if (start > end || start >= size || size <= 0) return { invalid: true };
  return { start, end };
}

function sliceResponse(cached, start, end, size) {
  return cached.arrayBuffer().then((buf) => {
    const chunk = buf.slice(start, end + 1);
    return new Response(chunk, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': String(chunk.byteLength),
        'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
        'Accept-Ranges': 'bytes',
      },
    });
  });
}

/* 壳资源：先给缓存（极快），同时后台静默更新，下次访问即为最新 */
async function shellSWR(req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(req);
  const network = fetch(req).then((resp) => {
    if (resp && resp.status === 200) cache.put(req, resp.clone()).catch(() => {});
    return resp;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  /* 代码类壳资源（js / css）走 stale-while-revalidate；
     data/ 下是教材内容，一律走网络以保证更新即时生效 */
  const isData = url.pathname.indexOf('/data/') !== -1;
  if (!isData && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(shellSWR(req));
    return;
  }

  if (!url.pathname.endsWith('.mp3')) return;      /* 只接管音频，别的都不碰 */

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = url.origin + url.pathname;
    let hit = await cache.match(key);

    if (!hit) {
      let resp;
      try {
        resp = await fetch(key, { credentials: 'omit' });
      } catch (err) {
        return Response.error();
      }
      if (!resp || resp.status !== 200) return resp;
      cache.put(key, resp.clone()).catch(() => {});   /* 后台写缓存，不阻塞本次响应 */
      hit = resp.clone();
    }

    const rangeHeader = req.headers.get('range');
    if (!rangeHeader) return hit;

    const size = parseInt(hit.headers.get('content-length') || '0', 10);
    const r = parseRange(rangeHeader, size);
    if (!r || r.invalid) return hit;
    return sliceResponse(hit, r.start, r.end, size);
  })());
});
