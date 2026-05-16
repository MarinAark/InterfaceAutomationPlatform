"""
Generated from requirement:
帮我写一个谷歌搜索 自动化测试 的UI自动化测试脚本

Install:
  pip install playwright
  python -m playwright install chromium

Run:
  python google_search_ui.py
"""
import re
from playwright.sync_api import expect, sync_playwright


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.google.com", wait_until="domcontentloaded")
        search_box = page.locator("textarea[name=\"q\"], input[name=\"q\"]").first
        search_box.fill("自动化测试")
        page.keyboard.press("Enter")
        page.wait_for_load_state("domcontentloaded")
        expect(page).to_have_title(re.compile("自动化测试|Google"))
        expect(page.locator("body")).to_contain_text("自动化测试")
        print("PASS: Google 搜索 自动化测试")
        browser.close()


if __name__ == "__main__":
    main()
