const CACHE_NAME = 'plu-code-v432';

// 1. 只強制快取同源（本地）的必要檔案
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 2. CDN 資源獨立出來，避免單一 failure 毀掉整個 install 流程
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 先保證本地檔案一定能成功快取
      await cache.addAll(LOCAL_ASSETS);
      
      // CDN 資源採用個案快取，壞掉其中一個也不會中斷 install
      CDN_ASSETS.forEach(url => {
        fetch(url, { mode: 'cors' })
          .then(res => { if (res.ok) cache.put(url, res); })
          .catch(() => {});
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      // 清除舊版本的 快取
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
          })
        )
      ),
      // 確保控制所有 Client
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      if (res) return res;
      return fetch(e.request).then((networkRes) => {
        // 如果請求成功，順便寫入快取
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return networkRes;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
