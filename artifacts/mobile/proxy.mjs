/**
 * Thin proxy that sits in front of the Expo Metro dev server.
 * - /api/* → Express API server on port 8080
 * - everything else → Metro bundler on port METRO_PORT (18116)
 *
 * This lets the browser make same-origin fetch requests to /api/…
 * without any CORS issues.
 */
import http from "http";
import httpProxy from "http-proxy";

const PORT = parseInt(process.env.PORT ?? "18115", 10);
const METRO_PORT = parseInt(process.env.METRO_PORT ?? "18116", 10);
const API_PORT = parseInt(process.env.API_PORT ?? "8080", 10);

const proxy = httpProxy.createServer({ ws: true });

const server = http.createServer((req, res) => {
  const isApi = req.url?.startsWith("/api/");
  const target = isApi
    ? `http://localhost:${API_PORT}`
    : `http://localhost:${METRO_PORT}`;

  proxy.web(req, res, { target }, (err) => {
    console.error("[proxy] error:", err?.message);
    res.writeHead(502);
    res.end("Proxy error: " + err?.message);
  });
});

// Forward WebSocket upgrades (Metro hot-reload) to Metro
server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, { target: `http://localhost:${METRO_PORT}` });
});

server.listen(PORT, () => {
  console.log(`[proxy] listening on :${PORT}`);
  console.log(`[proxy] /api/* → :${API_PORT}`);
  console.log(`[proxy] rest   → :${METRO_PORT} (Metro)`);
});
