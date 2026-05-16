import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { writeRunReport } from "../src/report.mjs";

const ROOT = process.cwd();
const GENERATED_DIR = resolve(ROOT, "generated");

function runCommand(command, args, cwd, timeoutMs = 60000) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { cwd, shell: false });
    let settled = false;
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish({ code: 124, output: `执行超时，已在 ${timeoutMs / 1000} 秒后停止` });
    }, timeoutMs);
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveRun(result);
    };
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
  if (fileName.endsWith(".py")) return { command: "python3", args: [filePath] };
  if (fileName.endsWith(".test.js")) return { command: "node", args: ["--test", filePath] };
  if (fileName.endsWith(".spec.js")) {
    return { command: "npx", args: ["playwright", "test", filePath, "--reporter=line"] };
  }
  return { command: "node", args: [filePath] };
}

async function listScripts() {
  const pattern = process.env.TEST_PATTERN ? new RegExp(process.env.TEST_PATTERN) : null;
  const files = await readdir(GENERATED_DIR);
  const scripts = [];
  for (const file of files) {
    if (file.startsWith(".")) continue;
    const filePath = join(GENERATED_DIR, file);
    const info = await stat(filePath);
    if (!info.isFile()) continue;
    if (!/\.(py|js)$/.test(file)) continue;
    if (pattern && !pattern.test(file)) continue;
    scripts.push({ fileName: file, filePath });
  }
  return scripts.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

const scripts = await listScripts();
const results = [];
for (const script of scripts) {
  const { command, args } = getRunCommand(script.fileName, script.filePath);
  const startedAt = Date.now();
  const execution = await runCommand(command, args, ROOT, 60000);
  results.push({
    fileName: script.fileName,
    kind: script.fileName.includes("api") ? "接口自动化" : "UI 自动化",
    ok: execution.code === 0,
    command: [command, ...args].join(" "),
    durationMs: Date.now() - startedAt,
    finishedAt: new Date().toISOString(),
    output: execution.output || (execution.code === 0 ? "执行通过" : "执行失败，但没有输出更多信息")
  });
}

const report = await writeRunReport(ROOT, results, `jenkins_${Date.now()}`);
const failed = results.filter((item) => !item.ok).length;
console.log(`Report: ${report.htmlPath}`);
console.log(`Total: ${results.length}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
