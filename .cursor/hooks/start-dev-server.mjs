import { exec, spawn } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8081;
const URL = `http://localhost:${PORT}`;
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const STARTUP_TIMEOUT_MS = 45_000;
const POLL_INTERVAL_MS = 500;

function drainStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }

    let data = "";
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    };

    const timeout = setTimeout(() => finish(data), 100);

    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => finish(data));
    process.stdin.resume();
  });
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    socket.setTimeout(1000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

async function waitForPort(port, maxMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "dev"], {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: "ignore",
      shell: true,
      windowsHide: true,
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function openBrowser(url) {
  if (process.platform === "win32") {
    exec(`start "" "${url}"`, { shell: true, windowsHide: true });
    return;
  }

  if (process.platform === "darwin") {
    exec(`open "${url}"`);
    return;
  }

  exec(`xdg-open "${url}"`);
}

async function main() {
  await drainStdin();

  const alreadyRunning = await isPortOpen(PORT);
  if (!alreadyRunning) {
    await startDevServer();
    const ready = await waitForPort(PORT, STARTUP_TIMEOUT_MS);
    if (!ready) {
      process.stderr.write(
        `[start-dev-server] Timed out waiting for ${URL} after ${STARTUP_TIMEOUT_MS}ms\n`,
      );
      process.exit(0);
    }
  }

  openBrowser(URL);
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`[start-dev-server] ${String(error)}\n`);
  process.exit(0);
});
