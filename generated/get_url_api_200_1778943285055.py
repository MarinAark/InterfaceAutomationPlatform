"""
Generated from requirement:
帮我写一个 GET https://httpbin.org/get 的接口自动化测试脚本，校验状态码为 200

Install:
  No third-party dependency required.

Run:
  python get_url_api_200.py
"""
from urllib.request import urlopen


def main():
    with urlopen("https://httpbin.org/get", timeout=10) as response:
        body = response.read()
        status = response.status

    assert status == 200, f"Expected 200, got {status}"
    assert body, "Expected non-empty response body"
    print(f"PASS: API status={status}, bytes={len(body)}")


if __name__ == "__main__":
    main()
