// Mini-webserver om de site lokaal te bekijken (gestart door start-preview.bat).
// Serveert de bestanden uit deze projectmap op http://localhost:8000/
// zodat ook links naar "/" gewoon werken, net als op de echte site.
const http = require("http");
const fs = require("fs");
const path = require("path");

const POORT = 8000;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const bestand = path.join(__dirname, p);
    // Alleen bestanden binnen de projectmap serveren.
    if (!bestand.startsWith(__dirname)) {
      res.writeHead(403);
      res.end("geen toegang");
      return;
    }
    fs.readFile(bestand, (fout, data) => {
      if (fout) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Niet gevonden: " + p);
        return;
      }
      res.writeHead(200, { "Content-Type": types[path.extname(bestand).toLowerCase()] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(POORT, () => {
    console.log("");
    console.log("  Preview draait! Bekijk de site op: http://localhost:" + POORT + "/");
    console.log("  Stoppen? Sluit gewoon dit venster.");
    console.log("");
  });
