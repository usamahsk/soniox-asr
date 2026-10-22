// minimal PWA shell cache — safe on GitHub Pages
// Bump version string any time you deploy to force cache refresh
const C = "bayan-v5";
const ASSETS = ["./", "./index.html", "./config.js", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(C).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  // Never intercept: Supabase API, Edge Functions, Soniox, Google Fonts, CDN imports
  if (
    e.request.method !== "GET" ||
    !url.startsWith(self.location.origin) ||
    url.includes("supabase.co") ||
    url.includes("soniox.com") ||
    url.includes("cdn.jsdelivr.net") ||
    url.includes("fonts.googleapis.com") ||
    url.includes("fonts.gstatic.com") ||
    url.includes("/functions/v1/")
  ) return;

  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
