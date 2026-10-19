/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with these routes, all
 * relative to BASE_PATH:
 * - GET / or /manifest with an expo-platform header → platform manifest JSON
 *   for Expo Go, with the origin build.js baked in rewritten to the one the
 *   request arrived on (so are the native bundles below)
 * - GET / without the header → landing page (QR code, store links, web link)
 * - GET /web/... → the exported web build, with an SPA fallback to its
 *   index.html so deep links such as /web/login load
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const WEB_ROOT = path.join(STATIC_ROOT, "web");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".wasm": "application/wasm",
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

const HOST_PATTERN = /^[A-Za-z0-9.-]+(:\d+)?$/;

/** The origin a request arrived on; host is null when the header is not a plain host[:port]. */
function requestOrigin(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = (typeof forwardedProto === "string" && forwardedProto.split(",")[0].trim()) || "https";
  const forwardedHost = req.headers["x-forwarded-host"];
  const rawHost = (typeof forwardedHost === "string" && forwardedHost.split(",")[0].trim()) || req.headers["host"];
  const host = typeof rawHost === "string" && HOST_PATTERN.test(rawHost) ? rawHost : null;
  return { protocol, host, baseUrl: host ? `${protocol}://${host}` : null };
}

let builtOriginCache;

/** The origin build.js baked into the manifests and bundles, or null without a native build. */
function builtOrigin() {
  if (builtOriginCache !== undefined) return builtOriginCache;
  builtOriginCache = null;
  for (const platform of ["ios", "android"]) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(STATIC_ROOT, platform, "manifest.json"), "utf-8"));
      builtOriginCache = new URL(manifest.launchAsset.url).origin;
      break;
    } catch {
      // No usable build for this platform.
    }
  }
  return builtOriginCache;
}

/**
 * Rewrites the origin build.js baked into a manifest or bundle to the origin
 * the request arrived on. build.js only knows the deployment's own domain;
 * an app opened through a custom domain should fetch its bundle and assets,
 * and talk to the API, on that same domain, and it keeps working if the
 * deployment's default domain changes.
 */
function rewriteOrigins(text, req) {
  const built = builtOrigin();
  const { host, baseUrl } = requestOrigin(req);
  if (!built || !host || built === baseUrl) return text;
  const builtHost = new URL(built).host;
  return text.split(built).join(baseUrl).split(`"${builtHost}/`).join(`"${host}/`);
}

/** The Expo Go manifest for one platform (see rewriteOrigins). */
function serveManifest(platform, req, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  let manifest = fs.readFileSync(manifestPath, "utf-8");
  try {
    const parsed = JSON.parse(manifest);
    // build.js drops this for the reason given there; cover builds made before it did.
    if (parsed.extra && parsed.extra.expoGo) delete parsed.extra.expoGo.developer;
    manifest = JSON.stringify(parsed);
  } catch {
    // Leave the manifest exactly as built if it cannot be parsed.
  }
  res.writeHead(200, {
    "content-type": "application/json",
    "cache-control": "private, max-age=0",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(rewriteOrigins(manifest, req));
}

const BUNDLE_PATH = /\/_expo\/static\/js\/(ios|android)\/bundle\.js$/;
const bundleCache = new Map();

/** A native bundle with its baked origin rewritten to the requesting one (see rewriteOrigins). */
function serveBundle(filePath, req, res) {
  const { baseUrl } = requestOrigin(req);
  const cacheKey = `${filePath}|${baseUrl}`;
  let body = bundleCache.get(cacheKey);
  if (!body) {
    body = Buffer.from(rewriteOrigins(fs.readFileSync(filePath, "utf-8"), req));
    if (bundleCache.size >= 8) bundleCache.clear();
    bundleCache.set(cacheKey, body);
  }
  res.writeHead(200, {
    "content-type": MIME_TYPES[".js"],
    "content-length": body.length,
    // The build timestamp is in the path, so this URL's content never changes.
    "cache-control": "public, max-age=31536000, immutable",
  });
  res.end(body);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const baseUrl = requestOrigin(req).baseUrl || builtOrigin() || "https://localhost";
  const host = new URL(baseUrl).host;
  // Expo Go opens exps://<host><path>, fetching https://<host><path> with an
  // expo-platform header. Keeping the base path in the link means the request
  // reaches this service directly, whichever app owns the domain root.
  const expsUrl = `${host}${basePath}/`;
  const webUrl = `${baseUrl}${basePath}/web/`;
  const hasWebBuild = fs.existsSync(path.join(WEB_ROOT, "index.html"));

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/WEB_URL_PLACEHOLDER/g, webUrl)
    .replace(/WEB_BUILD_DISPLAY_PLACEHOLDER/g, hasWebBuild ? "flex" : "none")
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function sendFile(filePath, res, extraHeaders = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType, ...extraHeaders });
  res.end(content);
}

function resolveWithin(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null; // malformed percent-encoding
  }
  const safePath = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(root, safePath);
  if (!filePath.startsWith(root)) return null;
  return filePath;
}

function serveStaticFile(urlPath, req, res) {
  const filePath = resolveWithin(STATIC_ROOT, urlPath);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  if (BUNDLE_PATH.test(filePath)) {
    return serveBundle(filePath, req, res);
  }

  sendFile(filePath, res);
}

/** The exported web app: hashed assets are immutable, the HTML shell is not. */
function serveWebApp(urlPath, res) {
  const indexPath = path.join(WEB_ROOT, "index.html");
  if (!fs.existsSync(indexPath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("The web build is not available in this deployment.");
    return;
  }

  const filePath = resolveWithin(WEB_ROOT, urlPath);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const immutable = urlPath.startsWith("/_expo/") || urlPath.startsWith("/assets/");
    sendFile(filePath, res, immutable ? { "cache-control": "public, max-age=31536000, immutable" } : {});
    return;
  }

  // Client-side route (or a missing file): hand the router its shell.
  sendFile(indexPath, res, { "cache-control": "no-cache" });
}

/**
 * Peer routes, e.g. EXPO_PEER_ROUTES="/amr-mobile/=19513,/emr-mobile/=19514".
 *
 * The platform sends every request that carries an `expo-platform` header
 * (Expo Go fetching a manifest) to the one artifact that owns the Expo domain
 * router, whatever path it names. When this app is that artifact, requests
 * for a sibling app's path are forwarded to the sibling's own server in the
 * same deployment, so each app serves its own manifest.
 */
const PEER_ROUTES = (process.env.EXPO_PEER_ROUTES || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [prefix, port] = entry.split("=");
    return { prefix: (prefix || "").trim().replace(/\/+$/, ""), port: parseInt(port, 10) };
  })
  .filter((route) => route.prefix && route.prefix !== basePath && Number.isFinite(route.port));

function proxyToPeer(req, res, route) {
  const upstream = http.request(
    { host: "127.0.0.1", port: route.port, method: req.method, path: req.url, headers: req.headers },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", (err) => {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Peer app at ${route.prefix} is unavailable: ${err.message}` }));
  });
  req.pipe(upstream);
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const appName = getAppName();

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  let pathname = url.pathname;

  const peer = PEER_ROUTES.find((route) => pathname === route.prefix || pathname.startsWith(route.prefix + "/"));
  if (peer) {
    return proxyToPeer(req, res, peer);
  }

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/status") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        app: appName,
        basePath: basePath || "/",
        expoGo: {
          ios: fs.existsSync(path.join(STATIC_ROOT, "ios", "manifest.json")),
          android: fs.existsSync(path.join(STATIC_ROOT, "android", "manifest.json")),
        },
        web: fs.existsSync(path.join(WEB_ROOT, "index.html")),
        peerRoutes: PEER_ROUTES.map((route) => route.prefix),
      }),
    );
    return;
  }

  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, req, res);
    }

    if (pathname === "/") {
      return serveLandingPage(req, res, landingPageTemplate, appName);
    }
  }

  if (pathname === "/web") {
    res.writeHead(302, { location: `${basePath}/web/` });
    res.end();
    return;
  }

  if (pathname.startsWith("/web/")) {
    return serveWebApp(pathname.slice("/web".length), res);
  }

  serveStaticFile(pathname, req, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
});
