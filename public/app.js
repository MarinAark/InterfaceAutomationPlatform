const apiBase = window.location.protocol === "file:" ? "http://127.0.0.1:5173" : "";
const navItems = document.querySelectorAll(".nav-item");
const viewPanels = document.querySelectorAll(".view-panel");
const pageTitleEl = document.querySelector("#pageTitle");
const pageDescriptionEl = document.querySelector("#pageDescription");
const requirementEl = document.querySelector("#requirement");
const kindEl = document.querySelector("#kind");
const languageEl = document.querySelector("#language");
const generateEl = document.querySelector("#generate");
const validateEl = document.querySelector("#validate");
const runScriptEl = document.querySelector("#runScript");
const refreshScriptsEl = document.querySelector("#refreshScripts");
const refreshAssetsEl = document.querySelector("#refreshAssets");
const codeEl = document.querySelector("#code");
const fileNameEl = document.querySelector("#fileName");
const assumptionsEl = document.querySelector("#assumptions");
const scriptsEl = document.querySelector("#scripts");
const assetScriptsEl = document.querySelector("#assetScripts");
const assetCodeEl = document.querySelector("#assetCode");
const assetFileNameEl = document.querySelector("#assetFileName");
const validateAssetEl = document.querySelector("#validateAsset");
const runAssetEl = document.querySelector("#runAsset");
const runResultsEl = document.querySelector("#runResults");

let currentFileName = "";
let currentAssetFileName = "";
const viewMeta = {
  generate: {
    title: "需求转自动化脚本",
    description: "输入自然语言需求，生成 UI 自动化或接口自动化测试脚本。"
  },
  assets: {
    title: "脚本资产",
    description: "查看、刷新和校验已经生成的自动化测试脚本。"
  },
  results: {
    title: "执行结果",
    description: "查看最近一次语法检查或执行校验的反馈。"
  }
};

async function requestJson(url, options = {}) {
  const response = await fetch(`${apiBase}${url}`, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.output || "请求失败");
  }
  return payload;
}

function switchView(view) {
  for (const item of navItems) {
    item.classList.toggle("active", item.dataset.view === view);
  }
  for (const panel of viewPanels) {
    panel.classList.toggle("active", panel.dataset.panel === view);
  }
  pageTitleEl.textContent = viewMeta[view].title;
  pageDescriptionEl.textContent = viewMeta[view].description;
  if (view === "assets") loadScripts();
}

function setRunResult(message, ok = true) {
  runResultsEl.textContent = message;
  runResultsEl.classList.toggle("error", !ok);
}

function formatExecutionResult(fileName, result) {
  return [
    `${fileName}: ${result.ok ? "执行通过" : "执行失败"}`,
    `命令：${result.command}`,
    `耗时：${result.durationMs} ms`,
    "",
    result.output
  ].join("\n");
}

function renderAssumptions(items) {
  assumptionsEl.innerHTML = "";
  for (const item of items || []) {
    const li = document.createElement("li");
    li.textContent = item;
    assumptionsEl.append(li);
  }
}

async function loadScripts() {
  const { scripts } = await requestJson("/api/scripts");
  scriptsEl.innerHTML = "";
  assetScriptsEl.innerHTML = "";
  if (!scripts.length) {
    scriptsEl.textContent = "暂无脚本";
    assetScriptsEl.textContent = "暂无脚本";
    return;
  }

  for (const script of scripts) {
    const item = document.createElement("button");
    item.className = "script-item";
    item.type = "button";
    item.innerHTML = `
      <div class="script-name"></div>
      <div class="script-time"></div>
    `;
    item.querySelector(".script-name").textContent = script.name;
    item.querySelector(".script-time").textContent = new Date(script.updatedAt).toLocaleString();
    scriptsEl.append(item);

    const assetItem = item.cloneNode(true);
    assetItem.addEventListener("click", () => loadScriptAsset(script.name));
    assetScriptsEl.append(assetItem);
  }
}

async function loadScriptAsset(fileName) {
  const script = await requestJson(`/api/script?fileName=${encodeURIComponent(fileName)}`);
  currentAssetFileName = script.fileName;
  assetFileNameEl.textContent = script.fileName;
  assetCodeEl.textContent = script.code;
  validateAssetEl.disabled = false;
  runAssetEl.disabled = false;
}

async function validateFile(fileName) {
  const result = await requestJson("/api/validate", {
    method: "POST",
    body: JSON.stringify({ fileName })
  });
  setRunResult(`${fileName}: ${result.output || "语法检查通过"}`, true);
  return result;
}

async function runFile(fileName) {
  const result = await requestJson("/api/run", {
    method: "POST",
    body: JSON.stringify({ fileName })
  });
  setRunResult(formatExecutionResult(fileName, result), result.ok);
  switchView("results");
  return result;
}

for (const item of navItems) {
  item.addEventListener("click", () => switchView(item.dataset.view));
}

generateEl.addEventListener("click", async () => {
  generateEl.disabled = true;
  generateEl.textContent = "生成中";
  try {
    const result = await requestJson("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        requirement: requirementEl.value,
        kind: kindEl.value,
        language: languageEl.value
      })
    });

    currentFileName = result.fileName;
    fileNameEl.textContent = result.fileName;
    codeEl.textContent = result.code;
    validateEl.disabled = false;
    runScriptEl.disabled = false;
    renderAssumptions(result.assumptions);
    await loadScripts();
    setRunResult(`${result.fileName}: 已生成脚本`, true);
  } catch (error) {
    alert(error.message);
  } finally {
    generateEl.disabled = false;
    generateEl.textContent = "生成脚本";
  }
});

runScriptEl.addEventListener("click", async () => {
  if (!currentFileName) return;
  runScriptEl.disabled = true;
  runScriptEl.textContent = "执行中";
  setRunResult(`${currentFileName}: 执行中...`, true);
  try {
    await runFile(currentFileName);
  } catch (error) {
    setRunResult(`${currentFileName}: ${error.message}`, false);
    switchView("results");
    alert(error.message);
  } finally {
    runScriptEl.disabled = false;
    runScriptEl.textContent = "执行脚本";
  }
});

validateEl.addEventListener("click", async () => {
  if (!currentFileName) return;
  validateEl.disabled = true;
  validateEl.textContent = "检查中";
  try {
    const result = await validateFile(currentFileName);
    alert(result.output || "语法检查通过");
  } catch (error) {
    setRunResult(`${currentFileName}: ${error.message}`, false);
    alert(error.message);
  } finally {
    validateEl.disabled = false;
    validateEl.textContent = "语法检查";
  }
});

runAssetEl.addEventListener("click", async () => {
  if (!currentAssetFileName) return;
  runAssetEl.disabled = true;
  runAssetEl.textContent = "执行中";
  setRunResult(`${currentAssetFileName}: 执行中...`, true);
  try {
    await runFile(currentAssetFileName);
  } catch (error) {
    setRunResult(`${currentAssetFileName}: ${error.message}`, false);
    switchView("results");
    alert(error.message);
  } finally {
    runAssetEl.disabled = false;
    runAssetEl.textContent = "执行脚本";
  }
});

validateAssetEl.addEventListener("click", async () => {
  if (!currentAssetFileName) return;
  validateAssetEl.disabled = true;
  validateAssetEl.textContent = "检查中";
  try {
    const result = await validateFile(currentAssetFileName);
    alert(result.output || "语法检查通过");
  } catch (error) {
    setRunResult(`${currentAssetFileName}: ${error.message}`, false);
    alert(error.message);
  } finally {
    validateAssetEl.disabled = false;
    validateAssetEl.textContent = "语法检查";
  }
});

refreshScriptsEl.addEventListener("click", loadScripts);
refreshAssetsEl.addEventListener("click", loadScripts);
loadScripts().catch(() => {
  scriptsEl.textContent = "脚本列表加载失败";
  assetScriptsEl.textContent = "脚本列表加载失败";
});
