const slugMap = [
  ["百度", "baidu"],
  ["谷歌", "google"],
  ["搜索", "search"],
  ["登录", "login"],
  ["接口", "api"],
  ["用户", "user"],
  ["订单", "order"]
];

function slugify(text) {
  let value = text.toLowerCase();
  for (const [from, to] of slugMap) value = value.replaceAll(from, ` ${to} `);
  value = value
    .replace(/https?:\/\/[^\s]+/g, "url")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return value || "generated_test";
}

function inferKind(requirement, requestedKind) {
  if (requestedKind && requestedKind !== "auto") return requestedKind;
  const text = requirement.toLowerCase();
  if (/接口|api|http|post|get|put|delete|状态码|响应|json/.test(text)) return "api";
  return "ui";
}

function inferSearchKeyword(requirement) {
  const match =
    requirement.match(/搜索["“']?([^"”'，。,\s]+)["”']?/) ||
    requirement.match(/search\s+for\s+["']?([^"',.]+)["']?/i);
  return match?.[1] || "自动化测试";
}

function inferTarget(requirement, kind) {
  const url = requirement.match(/https?:\/\/[^\s，。'"]+/)?.[0];
  if (/百度|baidu/i.test(requirement)) {
    return {
      url: url || "https://www.baidu.com",
      siteName: "百度",
      searchSelector: '#kw:visible, input[name="wd"]:visible',
      searchUrlTemplate: "https://www.baidu.com/s?wd={keyword}",
      titlePattern: "百度"
    };
  }
  if (/谷歌|google/i.test(requirement)) {
    return {
      url: url || "https://www.google.com",
      siteName: "Google",
      searchSelector: 'textarea[name="q"]:visible, input[name="q"]:visible',
      searchUrlTemplate: "https://www.google.com/search?q={keyword}",
      titlePattern: "Google"
    };
  }
  return {
    url: url || (kind === "api" ? "https://httpbin.org/get" : "https://example.com"),
    siteName: kind === "api" ? "接口" : "网页",
    searchSelector: 'input[type="search"]:visible, input[name="q"]:visible, textarea[name="q"]:visible, input[type="text"]:visible',
    searchUrlTemplate: "",
    titlePattern: ""
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pyString(value) {
  return JSON.stringify(value).replaceAll("\\u2028", "\\\\u2028").replaceAll("\\u2029", "\\\\u2029");
}

function jsString(value) {
  return JSON.stringify(value);
}

function makePythonUi({ requirement, target, keyword }) {
  const titlePattern = [escapeRegExp(keyword), target.titlePattern].filter(Boolean).join("|");
  const fallbackUrl = target.searchUrlTemplate
    ? target.searchUrlTemplate.replace("{keyword}", encodeURIComponent(keyword))
    : "";
  return `"""
Generated from requirement:
${requirement}

Install:
  pip install playwright
  python -m playwright install chromium

Run:
  python ${slugify(requirement)}.py
"""
import re
from playwright.sync_api import expect, sync_playwright


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1366, "height": 768})
        page.goto(${pyString(target.url)}, wait_until="domcontentloaded")
        search_box = page.locator(${pyString(target.searchSelector)}).first
        try:
            search_box.wait_for(state="visible", timeout=5000)
            search_box.fill(${pyString(keyword)})
            page.keyboard.press("Enter")
        except Exception:
            page.goto(${pyString(fallbackUrl || target.url)}, wait_until="domcontentloaded")
        page.wait_for_load_state("domcontentloaded")
        body_text = page.locator("body").inner_text(timeout=5000)
        if re.search("安全验证|验证码|captcha|unusual traffic", body_text, re.IGNORECASE):
            raise AssertionError("${target.siteName} 触发了反自动化验证，请换用测试环境、降低访问频率，或使用已授权的测试账号/白名单网络。")
        expect(page).to_have_title(re.compile(${pyString(titlePattern)}))
        expect(page.locator("body")).to_contain_text(${pyString(keyword)})
        print("PASS: ${target.siteName} 搜索 ${keyword}")
        browser.close()


if __name__ == "__main__":
    main()
`;
}

function makeJsUi({ requirement, target, keyword }) {
  const titlePattern = [escapeRegExp(keyword), target.titlePattern].filter(Boolean).join("|");
  const fallbackUrl = target.searchUrlTemplate
    ? target.searchUrlTemplate.replace("{keyword}", encodeURIComponent(keyword))
    : "";
  return `/**
 * Generated from requirement:
 * ${requirement}
 *
 * Install:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *
 * Run:
 *   npx playwright test ${slugify(requirement)}.spec.js
 */
import { test, expect } from "@playwright/test";

test("${target.siteName} 搜索自动化", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(${jsString(target.url)});
  const searchBox = page.locator(${jsString(target.searchSelector)}).first();
  try {
    await searchBox.waitFor({ state: "visible", timeout: 5000 });
    await searchBox.fill(${jsString(keyword)});
    await page.keyboard.press("Enter");
  } catch {
    await page.goto(${jsString(fallbackUrl || target.url)});
  }
  await page.waitForLoadState("domcontentloaded");
  const bodyText = await page.locator("body").innerText({ timeout: 5000 });
  if (/安全验证|验证码|captcha|unusual traffic/i.test(bodyText)) {
    throw new Error("${target.siteName} 触发了反自动化验证，请换用测试环境、降低访问频率，或使用已授权的测试账号/白名单网络。");
  }
  await expect(page).toHaveTitle(new RegExp(${jsString(titlePattern)}));
  await expect(page.locator("body")).toContainText(${jsString(keyword)});
});
`;
}

function makePythonApi({ requirement, url }) {
  return `"""
Generated from requirement:
${requirement}

Install:
  No third-party dependency required.

Run:
  python ${slugify(requirement)}.py
"""
from urllib.request import urlopen


def main():
    with urlopen(${pyString(url)}, timeout=10) as response:
        body = response.read()
        status = response.status

    assert status == 200, f"Expected 200, got {status}"
    assert body, "Expected non-empty response body"
    print(f"PASS: API status={status}, bytes={len(body)}")


if __name__ == "__main__":
    main()
`;
}

function makeJsApi({ requirement, url }) {
  return `/**
 * Generated from requirement:
 * ${requirement}
 *
 * Node.js 18+ has built-in fetch.
 *
 * Run:
 *   node --test ${slugify(requirement)}.test.js
 */
import test from "node:test";
import assert from "node:assert/strict";

test("接口请求成功", async () => {
  const startedAt = Date.now();
  const response = await fetch(${jsString(url)});
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.ok(Date.now() - startedAt < 3000);
  assert.ok(text.length > 0);
});
`;
}

export function generateScript({ requirement, kind, language }) {
  const trimmed = requirement.trim();
  if (!trimmed) {
    throw new Error("请输入测试需求，例如：帮我写一个百度搜索的自动化测试脚本");
  }

  const resolvedKind = inferKind(trimmed, kind);
  const resolvedLanguage = language === "javascript" ? "javascript" : "python";
  const target = inferTarget(trimmed, resolvedKind);
  const keyword = inferSearchKeyword(trimmed);
  const baseName = `${slugify(trimmed)}_${Date.now()}`;

  let code;
  let fileName;
  if (resolvedKind === "ui" && resolvedLanguage === "python") {
    code = makePythonUi({ requirement: trimmed, target, keyword });
    fileName = `${baseName}.py`;
  } else if (resolvedKind === "ui") {
    code = makeJsUi({ requirement: trimmed, target, keyword });
    fileName = `${baseName}.spec.js`;
  } else if (resolvedLanguage === "python") {
    code = makePythonApi({ requirement: trimmed, url: target.url });
    fileName = `${baseName}.py`;
  } else {
    code = makeJsApi({ requirement: trimmed, url: target.url });
    fileName = `${baseName}.test.js`;
  }

  return {
    code,
    fileName,
    kind: resolvedKind,
    language: resolvedLanguage,
    assumptions: [
      `识别为${resolvedKind === "ui" ? "UI 自动化" : "接口自动化"}`,
      `目标地址：${target.url}`,
      resolvedKind === "ui" ? `搜索关键词：${keyword}` : "默认校验状态码、响应时长和响应正文"
    ]
  };
}
