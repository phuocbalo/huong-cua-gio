// Bộ nhớ offline của game.
// Mỗi lần phát hành bản mới, tăng VERSION để trình duyệt tải lại toàn bộ.
const VERSION = '0.2.0';
const CACHE = 'san-thuong-' + VERSION;

// Mọi thứ game cần để chạy khi tắt mạng.
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './vendor/phaser-3.80.1.min.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700&family=Be+Vietnam+Pro:wght@400;500;600&display=swap';

// Lưu sẵn phông chữ: tải file CSS rồi tải từng file phông nó trỏ tới.
// Lỗi ở đây không chặn việc cài, game vẫn chạy bằng phông dự phòng.
async function cacheFonts(cache) {
  try {
    const res = await fetch(FONT_CSS, { mode: 'cors' });
    if (!res.ok) return;
    await cache.put(FONT_CSS, res.clone());
    const css = await res.text();
    const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]);
    await Promise.all(urls.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && cache.put(u, r)).catch(() => {})));
  } catch (e) { /* bỏ qua */ }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await cacheFonts(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('san-thuong-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Mở trang: ưu tiên bản mới trên mạng, mất mạng thì dùng bản đã lưu.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Hình, thư viện, phông chữ: dùng bản đã lưu, chưa có thì tải và lưu lại.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: req.url.startsWith(self.location.origin) });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      const url = new URL(req.url);
      const cacheable = url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
      if (res.ok && cacheable) cache.put(req, res.clone());
      return res;
    } catch (e) {
      return Response.error();
    }
  })());
});

// Trang hỏi phiên bản đang chạy để hiện trong bảng thông tin bản thử.
self.addEventListener('message', event => {
  if (event.data === 'version' && event.ports[0]) event.ports[0].postMessage(VERSION);
});
