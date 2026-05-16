"""
Stable UI automation example for the local demo QA console.

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


def expect_toast(page, text):
    expect(page.locator("#toast")).to_contain_text(text)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1366, "height": 900})

        page.goto("http://127.0.0.1:5173/demo-search.html", wait_until="domcontentloaded")
        expect(page).to_have_title(re.compile("Demo Search"))
        expect(page.locator("h1")).to_contain_text("自动化测试工作台")
        capture(page, "01_open_dashboard")

        page.locator("#searchBox").fill("自动化测试")
        page.locator("#typeSelect").select_option("ui")
        page.locator("#searchButton").click()
        expect_toast(page, "搜索完成")
        expect(page).to_have_title(re.compile("自动化测试"))
        expect(page.locator("#results")).to_contain_text("自动化测试")
        expect(page.locator("#statusText")).to_contain_text("已搜索")
        capture(page, "02_search_results")

        page.locator("#projectSelect").select_option("订单中心")
        page.locator("#prioritySelect").select_option("P1")
        page.locator("#onlyFailed").check()
        page.locator("#includeApi").uncheck()
        page.locator("#coverageSlider").fill("90")
        page.locator("#applyFilters").click()
        expect_toast(page, "筛选已应用")
        expect(page.locator("#coverageValue")).to_contain_text("90%")
        expect(page.locator("#statusText")).to_contain_text("已筛选")
        capture(page, "03_filters")

        page.locator("#selectAll").check()
        for checkbox in page.locator(".case-check").all():
            expect(checkbox).to_be_checked()
        expect_toast(page, "已全选")
        capture(page, "04_table_select")

        page.get_by_role("button", name="执行详情").click()
        page.locator("#noteText").fill("自动化脚本已遍历搜索、筛选、表格、标签页和弹窗。")
        page.locator("input[name='runMode'][value='regression']").check()
        expect(page.locator("#detailsTab")).to_contain_text("回归测试")
        capture(page, "05_details_tab")

        page.get_by_role("button", name="历史记录").click()
        expect(page.locator("#historyTab")).to_contain_text("最新报告")
        capture(page, "06_history_tab")

        page.get_by_role("button", name="仪表盘").click()
        page.locator("#openCreateModal").click()
        expect(page.locator("#caseDialog")).to_be_visible()
        page.locator("#caseName").fill("复杂页面元素巡检")
        page.locator("#ownerName").fill("QA Bot")
        page.locator("#caseDescription").fill("覆盖输入框、下拉、滑块、复选框、单选框、表格、弹窗和通知。")
        capture(page, "07_modal")
        page.locator("#saveCase").click()
        expect_toast(page, "用例已保存")
        expect(page.locator("#statusText")).to_contain_text("已保存")
        capture(page, "08_modal_saved")

        page.locator("#exportButton").click()
        expect_toast(page, "报告已导出")
        page.locator("#resetButton").click()
        expect_toast(page, "页面已重置")
        expect(page.locator("#statusText")).to_contain_text("已重置")
        expect(page.locator("#results")).to_contain_text("等待搜索")
        capture(page, "09_reset")

        print("PASS: 本地复杂 UI 示例已遍历搜索、筛选、表格、标签页、弹窗、表单和通知")
        browser.close()


if __name__ == "__main__":
    main()
