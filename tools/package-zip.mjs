#!/usr/bin/env node
/**
 * PACKAGE
 * =============================================================================
 * Copies the repository, without node_modules or any previous archive, into a
 * staging folder and compresses it into dist/shape-project-space.zip.
 *
 * Run with:  npm run package
 *
 * The result opens directly in Visual Studio Code: the workspace settings and
 * the extension recommendation travel with it, and `npm install` is needed only
 * to run the tests.
 *
 * No dependency is used. Compression goes through the platform's own archiver.
 */

import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const toolsDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(toolsDirectory, "..");
const distDirectory = join(root, "dist");
const archivePath = join(distDirectory, "shape-project-space.zip");

/**
 * Staging happens outside the repository. Copying a directory into a folder
 * beneath itself is refused by the platform, and excluding it afterwards would
 * be a race with the copy.
 */
const stagingRoot = join(tmpdir(), "shape-project-space-package");
const stagingDirectory = join(stagingRoot, "shape-project-space");

const EXCLUDED = ["node_modules", "dist", ".git", "package-lock.json"];

/**
 * @param {string} source
 * @returns {boolean} True when the entry should be copied.
 */
function shouldCopy(source)
{
    const name = source.slice(root.length + 1).split(/[\\/]/)[0];
    return EXCLUDED.indexOf(name) < 0;
}

if (existsSync(distDirectory) === true)
{
    rmSync(distDirectory, { recursive: true, force: true });
}

if (existsSync(stagingRoot) === true)
{
    rmSync(stagingRoot, { recursive: true, force: true });
}

mkdirSync(distDirectory, { recursive: true });
mkdirSync(stagingDirectory, { recursive: true });

cpSync(root, stagingDirectory,
{
    recursive: true,
    filter: shouldCopy
});

if (process.platform === "win32")
{
    execFileSync("powershell.exe",
    [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Compress-Archive -Path '" + stagingDirectory + "' -DestinationPath '" + archivePath + "' -Force"
    ],
    { stdio: "inherit" });
}
else
{
    execFileSync("zip", ["-r", "-q", archivePath, "shape-project-space"], { cwd: stagingRoot, stdio: "inherit" });
}

rmSync(stagingRoot, { recursive: true, force: true });

const size = statSync(archivePath).size;
process.stdout.write("Packaged " + archivePath + "\n");
process.stdout.write("  " + String(Math.round(size / 1024)) + " kB\n");
