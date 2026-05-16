import { createServer } from "node:http";
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { spawn } from "node:child_process";
import { generateScript } from "./src/generator.mjs";

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, "public");
const GENERATED_DIR = join(ROOT, "generated");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function safeGeneratedPath(fileName) {
  const normalized = normalize(fileName).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = resolve(GENERATED_DIR, normalized);
  if (!fullPath.startsWith(resolve(GENERATED_DIR))) {
    throw new Error("Invalid generated file path");
  }
  return fullPath;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function runCommand(command, args, cwd, timeoutMs = 30000) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { cwd, shell: false });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveRun(result);
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish({ code: 124, output: `执行超时，已在 ${timeoutMs / 1000} 秒后停止` });
    }, timeoutMs);
    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.stderr.on("data", (data) => {
      output += data.toString();
    });
    child.on("error", (error) => {
      finish({ code: 127, output: error.message });
    });
    child.on("close", (code) => {
      finish({ code, output: output.trim() });
    });
  });
}

function getRunCommand(fileName, filePath) {
  if (fileName.endsWith(".py")) {
    return { command: "python3", args: [filePath] };
  }
  if (fileName.endsWith(".test.js")) {
    return { command: "node", args: ["--test", filePath] };
  }
  if (fileName.endsWith(".spec.js")) {
    return { command: "npx", args: ["playwright", "test", filePath, "--reporter=line"] };
  }
  return { command: "node", args: [filePath] };
}

async function handleApi(req, res) {
  if (req.method === "POST" && req.url === "/api/generate") {
    const body = await readBody(req);
    const result = generateScript({
      requirement: String(body.requirement || ""),
      kind: body.kind || "auto",
      language: body.language || "python"
    });

    await mkdir(GENERATED_DIR, { recursive: true });
    const filePath = safeGeneratedPath(result.fileName);
    await writeFile(filePath, result.code, "utf8");

    return sendJson(res, 200, {
      ...result,
      savedPath: filePath
    });
  }

  if (req.method === "GET" && req.url === "/api/scripts") {
    await mkdir(GENERATED_DIR, { recursive: true });
    const files = await readdir(GENERATED_DIR);
    const scripts = [];
    for (const file of files) {
      if (file.startsWith(".")) continue;
      const filePath = safeGeneratedPath(file);
      const info = await stat(filePath);
      if (!info.isFile()) continue;
      scripts.push({
        name: file,
        path: filePath,
        updatedAt: info.mtime.toISOString(),
        size: info.size
      });
    }
    scripts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return sendJson(res, 200, { scripts });
  }

  if (req.method === "GET" && (req.url || "").startsWith("/api/script")) {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const fileName = String(url.searchParams.get("fileName") || "");
    const filePath = safeGeneratedPath(fileName);
    if (!existsSync(filePath)) return sendJson(res, 404, { error: "脚本不存在" });
    const info = await stat(filePath);
    if (!info.isFile()) return sendJson(res, 404, { error: "脚本不存在" });
    const code = await readFile(filePath, "utf8");
    return sendJson(res, 200, {
      fileName,
      code,
      updatedAt: info.mtime.toISOString(),
      size: info.size
    });
  }

  if (req.method === "POST" && req.url === "/api/validate") {
    const body = await readBody(req);
    const fileName = String(body.fileName || "");
    const filePath = safeGeneratedPath(fileName);
    if (!existsSync(filePath)) return sendJson(res, 404, { error: "脚本不存在" });

    const ext = extname(fileName);
    const validation =
      ext === ".py"
        ? await runCommand("python3", ["-m", "py_compile", filePath], ROOT)
        : await runCommand("node", ["--check", filePath], ROOT);

    return sendJson(res, validation.code === 0 ? 200 : 422, {
      ok: validation.code === 0,
      output: validation.output || "语法检查通过"
    });
  }

  if (req.method === "POST" && req.url === "/api/run") {
    const body = await readBody(req);
    const fileName = String(body.fileName || "");
    const filePath = safeGeneratedPath(fileName);
    if (!existsSync(filePath)) return sendJson(res, 404, { error: "脚本不存在" });
    const info = await stat(filePath);
    if (!info.isFile()) return sendJson(res, 404, { error: "脚本不存在" });

    const { command, args } = getRunCommand(fileName, filePath);
    const startedAt = Date.now();
    const execution = await runCommand(command, args, ROOT, 45000);
    const durationMs = Date.now() - startedAt;

    return sendJson(res, 200, {
      ok: execution.code === 0,
      command: [command, ...args].join(" "),
      durationMs,
      output:
        execution.output ||
        (execution.code === 0 ? "执行通过" : "执行失败，但没有输出更多信息")
    });
  }

  return sendJson(res, 404, { error: "API not found" });
}

async function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const fullPath = resolve(PUBLIC_DIR, `.${requestedPath}`);
  if (!fullPath.startsWith(resolve(PUBLIC_DIR))) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const content = await readFile(fullPath);
    res.writeHead(200, {
      "content-type": contentTypes[extname(fullPath)] || "application/octet-stream"
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type"
      });
      res.end();
      return;
    }
    if ((req.url || "").startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal server error" });
  }
}).listen(PORT, HOST, () => {
  console.log(`Auto test platform running at http://${HOST}:${PORT}`);
});
