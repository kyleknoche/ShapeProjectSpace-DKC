#!/usr/bin/env node
/**
 * STATIC SERVER
 * =============================================================================
 * Serves the repository over HTTP so the pages can be opened with real module
 * loading. ES modules do not load from the file system in most browsers, so
 * double-clicking index.html will not work; this will.
 *
 * Run with:  npm run serve
 * Then open: http://localhost:8080/
 *
 * No dependencies, no build step, no watch mode. The site is the source.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, resolve, extname, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const toolsDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(toolsDirectory, "..");
const port = Number(process.env.PORT === undefined ? 8080 : process.env.PORT);

const MEDIA_TYPES =
{
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".md": "text/plain; charset=utf-8",
    ".txt": "text/plain; charset=utf-8"
};

/**
 * @param {string} path
 * @returns {string}
 */
function mediaTypeFor(path)
{
    const type = MEDIA_TYPES[extname(path).toLowerCase()];
    return type === undefined ? "application/octet-stream" : type;
}

/**
 * Resolves a request path inside the repository, refusing to escape it.
 *
 * @param {string} requestUrl
 * @returns {string|null}
 */
function resolveRequest(requestUrl)
{
    const withoutQuery = requestUrl.split("?")[0].split("#")[0];
    const decoded = decodeURIComponent(withoutQuery);
    const relativeName = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
    const target = resolve(root, normalize(relativeName));

    if (target.startsWith(root) === false)
    {
        return null;
    }

    return target;
}

async function handleRequest(request, response)
{
    const target = resolveRequest(request.url);

    if (target === null)
    {
        response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
        response.end("Refused.");
        return;
    }

    try
    {
        const info = await stat(target);
        const path = info.isDirectory() === true ? join(target, "index.html") : target;
        const body = await readFile(path);

        response.writeHead(200,
        {
            "content-type": mediaTypeFor(path),
            "cache-control": "no-store"
        });

        response.end(body);
    }
    catch (error)
    {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found: " + request.url);
    }
}

const server = createServer(handleRequest);

server.listen(port, function reportReady()
{
    process.stdout.write("Shape Project Space is served from " + root + "\n");
    process.stdout.write("  http://localhost:" + String(port) + "/            the site\n");
    process.stdout.write("  http://localhost:" + String(port) + "/controls.html    the Gen-2 gallery\n");
    process.stdout.write("  http://localhost:" + String(port) + "/three-gen.html   the pattern reference\n");
});
