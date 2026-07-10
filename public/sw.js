self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());
self.addEventListener('fetch', e => {}); // 네트워크 그대로 통과 (오프라인 캐시는 추후)
