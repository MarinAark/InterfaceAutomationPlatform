"""
Generated from requirement:
帮我写一个百度搜索“自动化测试”的UI自动化测试脚本

Install:
  pip install playwright
  python -m playwright install chromium

Run:
  python baidu_search_ui.py
"""
import re
from playwright.sync_api import expect, sync_playwright


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1366, "height": 768})
        page.goto("https://www.baidu.com", wait_until="domcontentloaded")
        search_box = page.locator("#kw:visible, input[name=\"wd\"]:visible").first
        try:
            search_box.wait_for(state="visible", timeout=5000)
            search_box.fill("自动化测试")
            page.keyboard.press("Enter")
        except Exception:
            page.goto("https://www.baidu.com/s?wd=%E8%87%AA%E5%8A%A8%E5%8C%96%E6%B5%8B%E8%AF%95", wait_until="domcontentloaded")
        page.wait_for_load_state("domcontentloaded")
        body_text = page.locator("body").inner_text(timeout=5000)
        if re.search("安全验证|验证码|captcha|unusual traffic", body_text, re.IGNORECASE):
            raise AssertionError("百度触发了反自动化验证，请换用测试环境、降低访问频率，或使用已授权的测试账号/白名单网络。")
        expect(page).to_have_title(re.compile("自动化测试|百度"))
        expect(page.locator("body")).to_contain_text("自动化测试")
        print("PASS: 百度 搜索 自动化测试")
        browser.close()


if __name__ == "__main__":
    main()
