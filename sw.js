this.addEventListener('install', async (eve) => { this.skipWaiting(); });

this.addEventListener('fetch', eve => {
  if (eve.request.headers.has('range')) {
    return;
  }
  eve.respondWith(fetch(eve.request));
});
