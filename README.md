# 自动化测试生成平台

这是一个本地可运行的自动化平台雏形，支持把自然语言需求转换为测试脚本：

- UI 自动化：生成 Playwright + Pytest 或 Playwright Test 脚本
- 接口自动化：生成 Requests + Pytest 或 Node.js 内置测试脚本
- 脚本资产：生成后的脚本自动保存到 `generated/`
- 语法检查：Python 使用 `py_compile`，JavaScript 使用 `node --check`
- 在线执行：执行完成后自动生成 HTML/JSON 可视化报告到 `reports/`
- Jenkins 集成：内置 `Jenkinsfile`，支持定时触发和归档报告

## 启动

```bash
npm run dev
```

打开：

```text
http://localhost:5173
```

## 示例需求

```text
帮我写一个百度搜索“自动化测试”的UI自动化测试脚本
```

```text
帮我写一个 GET https://httpbin.org/get 的接口自动化测试脚本，校验状态码为 200
```

## 运行生成脚本所需依赖

Python UI 自动化：

```bash
pip install pytest playwright
python -m playwright install chromium
pytest generated/xxx.py
```

Python 接口自动化：

```bash
pip install pytest requests
pytest generated/xxx.py
```

JavaScript UI 自动化：

```bash
npm install -D @playwright/test
npx playwright install chromium
npx playwright test generated/xxx.spec.js
```

JavaScript 接口自动化：

```bash
node --test generated/xxx.test.js
```

## 可视化报告

在页面点击“执行脚本”后，平台会生成：

```text
reports/run_xxx.html
reports/run_xxx.json
```

也可以在命令行批量执行 `generated/` 下的脚本：

```bash
npm run ci:test
```

批量执行会生成：

```text
reports/jenkins_xxx.html
reports/jenkins_xxx.json
```

## Jenkins 定时触发

仓库根目录已包含 `Jenkinsfile`，默认每天定时执行一次：

```groovy
cron('H 2 * * *')
```

Jenkins 任务建议配置：

- Pipeline from SCM
- SCM URL: `https://github.com/MarinAark/InterfaceAutomationPlatform.git`
- Script Path: `Jenkinsfile`

执行后会归档 `reports/*.html` 和 `reports/*.json`。如果安装了 Jenkins HTML Publisher 插件，会展示 `Automation Test Report`。

## 后续可扩展方向

- 接入 OpenAI API 或本地大模型，提高复杂需求的理解能力
- 增加测试项目、测试套件、环境变量、账号密钥管理
- 增加执行队列、报告、截图、失败重试和 CI 集成
- 增加录制回放能力，把页面操作转成稳定脚本
