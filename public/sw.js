// minimal PWA shell cache — safe on GitHub Pages
const C = "bayan-v1";
const ASSETS = ["./", "./index.html", "./config.js", "./manifest.webmanifest"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(C).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
