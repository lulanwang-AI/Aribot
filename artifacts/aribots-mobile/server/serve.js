/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with these routes, all
 * relative to BASE_PATH:
 * - GET / or /manifest with an expo-platform header → platform manifest JSON
 *   for Expo Go
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

function requestOrigin(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = (typeof forwardedProto === "string" && forwardedProto.split(",")[0].trim()) || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  return { protocol, host, baseUrl: `${protocol}://${host}` };
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const { host, baseUrl } = requestOrigin(req);
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

function serveStaticFile(urlPath, res) {
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
      }),
    );
    return;
  }

  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
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

  serveStaticFile(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
});
