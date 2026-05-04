const CACHE_NAME = "recomp-tracker-v3";
const PRECACHE_URLS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
event.waitUntil(
caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
);
self.skipWaiting();
});

self.addEventListener("activate", (event) => {
event.waitUntil(
caches
.keys()
.then((cacheNames) =>
Promise.all(
cacheNames
.filter((cacheName) => cacheName !== CACHE_NAME)
.map((cacheName) => caches.delete(cacheName))
)
)
);
self.clients.claim();
});

self.addEventListener("fetch", (event) => {
const request = event.request;
const url = new URL(request.url);

if (request.method !== "GET") {
event.respondWith(fetch(request));
return;
}

if (url.origin !== self.location.origin) {
event.respondWith(fetch(request));
return;
}

if (url.pathname.startsWith("/api/")) {
event.respondWith(fetch(request));
return;
}

if (request.mode === "navigate") {
event.respondWith(cacheFirstNavigation(request));
return;
}

event.respondWith(cacheFirst(request));
});

async function cacheFirstNavigation(request) {
const cache = await caches.open(CACHE_NAME);
const cachedRequest = await cache.match(request);
const cachedRoot = await cache.match("/");

if (cachedRequest) return cachedRequest;
if (cachedRoot) return cachedRoot;

try {
const response = await fetch(request);
if (response && response.ok) {
cache.put(request, response.clone());
}
return response;
} catch {
return new Response("Offline", {
status: 503,
headers: { "content-type": "text/plain" }
});
}
}

async function cacheFirst(request) {
const cache = await caches.open(CACHE_NAME);
const cachedResponse = await cache.match(request);

if (cachedResponse) return cachedResponse;

try {
const response = await fetch(request);
if (response && response.ok) {
cache.put(request, response.clone());
}
return response;
} catch {
return new Response("Offline", {
status: 503,
headers: { "content-type": "text/plain" }
});
}
}
