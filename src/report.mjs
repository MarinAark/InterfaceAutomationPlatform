import { mkdir, writeFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

export const REPORTS_DIR = "reports";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statusLabel(ok) {
  return ok ? "通过" : "失败";
}

function buildHtmlReport(report) {
  const passed = report.results.filter((item) => item.ok).length;
  const failed = report.results.length - passed;
  const passRate = report.results.length ? Math.round((passed / report.results.length) * 100) : 0;
  const rows = report.results
    .map(
      (item) => `
        <article class="case ${item.ok ? "passed" : "failed"}">
          <div class="case-head">
            <div>
              <p class="label">${escapeHtml(item.kind || "脚本")}</p>
              <h2>${escapeHtml(item.fileName)}</h2>
            </div>
            <span class="badge">${statusLabel(item.ok)}</span>
          </div>
          <dl>
            <div><dt>命令</dt><dd>${escapeHtml(item.command)}</dd></div>
            <div><dt>耗时</dt><dd>${escapeHtml(item.durationMs)} ms</dd></div>
            <div><dt>结束时间</dt><dd>${escapeHtml(item.finishedAt)}</dd></div>
          </dl>
          <pre>${escapeHtml(item.output || "无输出")}</pre>
        </article>
      `
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>自动化测试报告 - ${escapeHtml(report.id)}</title>
    <style>
      :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #17202a; background: #f4f6f8; }
      body { margin: 0; }
      main { max-width: 1160px; margin: 0 auto; padding: 32px 20px 48px; }
      header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; margin-bottom: 24px; }
      h1, h2, p { margin-top: 0; }
      h1 { font-size: 30px; margin-bottom: 8px; }
      .muted { color: #667085; margin-bottom: 0; }
      .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
      .metric, .case { border: 1px solid #d8dee8; border-radius: 8px; background: #fff; }
      .metric { padding: 16px; }
      .metric span { display: block; color: #667085; font-size: 13px; }
      .metric strong { display: block; margin-top: 8px; font-size: 26px; }
      .case { margin-top: 14px; overflow: hidden; }
      .case-head { display: flex; justify-content: space-between; gap: 16px; padding: 16px; border-bottom: 1px solid #e5e7eb; }
      .case h2 { margin-bottom: 0; font-size: 17px; word-break: break-all; }
      .label { margin-bottom: 6px; color: #0f766e; font-size: 12px; font-weight: 700; text-transform: uppercase; }
      .badge { align-self: flex-start; border-radius: 999px; padding: 5px 10px; font-size: 13px; font-weight: 700; }
      .passed .badge { background: #dcfce7; color: #166534; }
      .failed .badge { background: #fee2e2; color: #991b1b; }
      dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 14px 16px; }
      dt { color: #667085; font-size: 12px; }
      dd { margin: 4px 0 0; word-break: break-all; }
      pre { margin: 0; padding: 16px; overflow: auto; background: #0b1020; color: #dbeafe; font-size: 12px; line-height: 1.55; }
      @media (max-width: 760px) { header, .summary, dl { grid-template-columns: 1fr; display: grid; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>自动化测试报告</h1>
          <p class="muted">报告 ID：${escapeHtml(report.id)}，生成时间：${escapeHtml(report.createdAt)}</p>
        </div>
      </header>
      <section class="summary">
        <div class="metric"><span>总数</span><strong>${report.results.length}</strong></div>
        <div class="metric"><span>通过</span><strong>${passed}</strong></div>
        <div class="metric"><span>失败</span><strong>${failed}</strong></div>
        <div class="metric"><span>通过率</span><strong>${passRate}%</strong></div>
      </section>
      ${rows || "<p class=\"muted\">没有可展示的执行结果。</p>"}
    </main>
  </body>
</html>`;
}

export async function writeRunReport(rootDir, results, id = `run_${Date.now()}`) {
  const reportsDir = resolve(rootDir, REPORTS_DIR);
  await mkdir(reportsDir, { recursive: true });
  const report = {
    id,
    createdAt: new Date().toISOString(),
    results
  };
  const jsonName = `${id}.json`;
  const htmlName = `${id}.html`;
  await writeFile(join(reportsDir, jsonName), JSON.stringify(report, null, 2), "utf8");
  await writeFile(join(reportsDir, htmlName), buildHtmlReport(report), "utf8");
  return {
    ...report,
    jsonName,
    htmlName,
    jsonPath: join(reportsDir, jsonName),
    htmlPath: join(reportsDir, htmlName),
    htmlUrl: `/reports/${htmlName}`,
    jsonUrl: `/reports/${jsonName}`
  };
}

export async function listReports(rootDir) {
  const reportsDir = resolve(rootDir, REPORTS_DIR);
  let files = [];
  try {
    files = await readdir(reportsDir);
  } catch {
    return [];
  }
  const reports = [];
  for (const file of files) {
    if (!file.endsWith(".html")) continue;
    const filePath = join(reportsDir, file);
    const info = await stat(filePath);
    reports.push({
      name: file,
      url: `/reports/${file}`,
      updatedAt: info.mtime.toISOString(),
      size: info.size
    });
  }
  return reports.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
