import { spawn } from "node:child_process";
import { once } from "node:events";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const viteCli = fileURLToPath(
  new URL("../node_modules/vite/bin/vite.js", import.meta.url),
);
const playwrightCli = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isPreviewListening() {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port: 4173 });
    let settled = false;

    const finish = (listening) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(listening);
    };

    socket.setTimeout(500, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function waitForPreview(previewProcess) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (previewProcess.exitCode !== null) {
      throw new Error(
        `Vite preview exited with code ${previewProcess.exitCode}.`,
      );
    }

    if (await isPreviewListening()) return;
    await wait(100);
  }

  throw new Error("Timed out while waiting for the HTTPS preview server.");
}

async function runPlaywright() {
  const testProcess = spawn(process.execPath, [playwrightCli, "test"], {
    cwd: repositoryRoot,
    stdio: "inherit",
  });
  const [exitCode, signal] = await once(testProcess, "exit");

  if (exitCode !== 0) {
    throw new Error(
      `Playwright exited with ${signal ? `signal ${signal}` : `code ${exitCode}`}.`,
    );
  }
}

const previewProcess = spawn(process.execPath, [viteCli, "preview"], {
  cwd: repositoryRoot,
  stdio: "inherit",
});

try {
  await waitForPreview(previewProcess);
  await runPlaywright();
} finally {
  if (previewProcess.exitCode === null) {
    previewProcess.kill("SIGTERM");
    await once(previewProcess, "exit");
  }
}
