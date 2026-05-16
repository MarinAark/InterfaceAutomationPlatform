"""
Stable UI automation example for the local demo search page.

Run:
  1. npm run dev
  2. python generated/demo_search_ui.py
"""
import re
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


ARTIFACT_DIR = Path("reports/assets")


def capture(page, name):
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    path = ARTIFACT_DIR / f"demo_search_ui_{name}.png"
    page.screenshot(path=str(path), full_page=True)
    print(f"SCREENSHOT: {path}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1366, "height": 768})
        page.goto("http://127.0.0.1:5173/demo-search.html", wait_until="domcontentloaded")
        capture(page, "01_open")
        page.locator("#searchBox:visible").fill("自动化测试")
        capture(page, "02_input")
        page.locator("#searchButton").click()
        page.wait_for_load_state("domcontentloaded")
        capture(page, "03_result")
        expect(page).to_have_title(re.compile("自动化测试|Demo Search"))
        expect(page.locator("#results")).to_contain_text("自动化测试")
        print("PASS: 本地示例搜索 自动化测试")
        browser.close()


if __name__ == "__main__":
    main()
