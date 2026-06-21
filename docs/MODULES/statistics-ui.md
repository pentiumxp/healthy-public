# Statistics UI

## Scope

统计 UI 面向人展示趋势、数据质量和健康数据摘要。它不是主要分析引擎，复杂分析由 service/API/MCP 提供。

## Screens

首版界面建议：

- Profile 概览。
- 力量训练趋势。
- 体重/体成分趋势。
- 来源文件状态。
- 数据质量提示。

Current first slice:

- `public/health.html`
- `public/health.css`
- `public/health.js`

The embedded UI reads `/api/v1/dashboard` through workspace-bound launch context and shows Profile, medications, strength training, body metrics, and medical timeline priorities. It does not read from the database directly and does not show a duplicate Hermes shell. Pending import candidates remain a service/API concern and are not shown as a bottom review panel on the embedded home screen.

Apple Health data is not duplicated as a full dashboard in Healthy. The UI shows only whether Apple Health has synced and leaves concrete native metrics such as steps, calories, sleep, and Apple workout summaries to Apple Health itself. Healthy stores those records for AI analysis and focuses the visible interface on complementary data: medications, medical timeline priorities, source-backed findings, and strength training. Historical screenshot/cardio rows from Apple Fitness are not shown as a separate cardio panel because they duplicate HealthKit workout data after Apple Health sync is available.

## UI Boundary

UI 可以：

- 请求 chart-ready API。
- 展示趋势图。
- 进入专门的确认、拒绝、编辑流程。
- 展示来源和置信度。

UI 不应：

- 直接连接数据库。
- 重复实现训练负荷核心算法。
- 把低置信度候选当 confirmed fact 展示。
- 输出医学诊断式结论。

## Empty And Partial States

必须设计：

- 无数据。
- 仅有待确认数据时，首页不显示底部待确认面板。
- 来源缺失。
- 单位不完整。
- 趋势样本不足。

## Tests

首批测试：

- 空数据状态。
- confirmed 首页展示不混入 pending 候选。
- 图表输入来自 API 返回。
- 隐私字段不进入前端 payload。
