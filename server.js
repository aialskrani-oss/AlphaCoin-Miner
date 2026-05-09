/**
 * LOCAL DEVELOPMENT SERVER — NOT USED ON VERCEL
 *
 * Vercel serves static files directly (index.html, script.js, style.css…).
 * This file is only useful for running the app locally without Vercel CLI.
 *
 * To run locally:  node server.js
 * To run on Vercel: just push to GitHub, Vercel handles everything via vercel.json
 */

import { createServer } from "http";
import { readFile }     from "fs/promises";
import { extname, join } from "path";
import { fileURLToPath } from "url";
import { dirname }      from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT      = process.env.PORT || 5000;
const HOST      = "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

createServer(async (req, res) => {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/" || urlPath === "")  urlPath = "/index.html";
  if (urlPath === "/admin")              urlPath = "/admin.html";

  const filePath = join(__dirname, urlPath);
  const ext      = extname(filePath);

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type":  MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  } catch {
    const notFound = `<!DOCTYPE html><html><body style="background:#0a0a0a;color:#e8e8e8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column"><h2>404</h2><p>Not Found</p><a href="/" style="color:#f0b429">العودة للرئيسية</a></body></html>`;
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end(notFound);
  }
}).listen(PORT, HOST, () => {
  console.log(`AlphaCoin Miner running at http://${HOST}:${PORT}`);
});
