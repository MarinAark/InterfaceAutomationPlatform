"""
Generated from requirement:
帮我写一个谷歌搜索“自动化测试”的UI自动化测试脚本

Install:
  pip install pytest playwright
  python -m playwright install chromium

Run:
  pytest search_ui.py
"""
import re
from playwright.sync_api import Page, expect


def test_baidu_search(page: Page):
    page.goto("https://example.com")
    page.get_by_role("textbox").fill("自动化测试")
    page.keyboard.press("Enter")
    expect(page).to_have_title(re.compile("自动化测试|百度"))
    expect(page.locator("body")).to_contain_text("自动化测试")
