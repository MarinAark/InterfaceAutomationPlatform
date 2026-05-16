"""
Stable UI automation example for the local production-like QAFlow Pro demo.

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
        page.set_viewport_size({"width": 1440, "height": 960})

        page.goto("http://127.0.0.1:5173/demo-search.html", wait_until="domcontentloaded")
        expect(page).to_have_title(re.compile("QAFlow Pro"))
        expect(page.locator("h1")).to_contain_text("质量运营工作台")
        expect(page.locator("#caseTable")).to_contain_text("本地搜索流程")
        capture(page, "01_dashboard")

        page.locator("#searchBox").fill("自动化测试")
        page.locator("#typeSelect").select_option("ui")
        page.locator("#environmentSelect").select_option("staging")
        page.locator("#searchButton").click()
        expect_toast(page, "搜索完成")
        expect(page).to_have_title(re.compile("自动化测试"))
        expect(page.locator("#statusText")).to_contain_text("已搜索")
        expect(page.locator("#caseTable")).to_contain_text("报告生成校验")
        capture(page, "02_search")

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
        capture(page, "04_bulk_select")

        page.locator(".row-action").first.click()
        expect_toast(page, "已打开用例详情")
        expect(page.locator("#statusText")).to_contain_text("查看详情")
        capture(page, "05_case_detail")

        page.get_by_role("button", name="执行配置").click()
        page.locator("#noteText").fill("生产级示例已覆盖搜索、筛选、表格、队列、缺陷、弹窗和报告。")
        page.locator("input[name='runMode'][value='regression']").check()
        expect(page.locator("#detailsTab")).to_contain_text("回归测试")
        capture(page, "06_run_config")

        page.get_by_role("button", name="报告历史").click()
        expect(page.locator("#historyTab")).to_contain_text("Demo UI 遍历报告")
        capture(page, "07_report_history")

        page.locator("#runSuiteButton").click()
        expect_toast(page, "套件已启动")
        expect(page.locator("#queueState")).to_contain_text("执行中")
        expect(page.locator("#statusText")).to_contain_text("执行中")
        capture(page, "08_run_queue")

        page.locator("#syncDefects").click()
        expect_toast(page, "缺陷已同步")
        capture(page, "09_defects")

        page.locator("#openCreateModal").click()
        expect(page.locator("#caseDialog")).to_be_visible()
        page.locator("#caseName").fill("生产级结算流程回归")
        page.locator("#ownerName").fill("QA Bot")
        page.locator("#caseType").select_option("UI")
        page.locator("#casePriority").select_option("P0")
        page.locator("#caseDescription").fill("验证完整业务流程、可视化报告和关键质量指标。")
        capture(page, "10_create_case")
        page.locator("#saveCase").click()
        expect_toast(page, "用例已保存")
        expect(page.locator("#caseTable")).to_contain_text("生产级结算流程回归")
        expect(page.locator("#statusText")).to_contain_text("已保存")
        capture(page, "11_case_saved")

        page.locator("#exportButton").click()
        expect_toast(page, "报告已导出")
        page.locator("#resetButton").click()
        expect_toast(page, "页面已重置")
        expect(page.locator("#statusText")).to_contain_text("已重置")
        expect(page.locator("#caseTable")).to_contain_text("本地搜索流程")
        capture(page, "12_reset")

        print("PASS: QAFlow Pro 示例已完成生产级页面主要功能巡检")
        browser.close()


if __name__ == "__main__":
    main()
