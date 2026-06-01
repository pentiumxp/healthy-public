# Statistics UI

## Scope

统计 UI 面向人展示趋势、数据质量、待确认来源和健康数据摘要。它不是主要分析引擎，复杂分析由 service/API/MCP 提供。

## Screens

首版界面建议：

- Profile 概览。
- 力量训练趋势。
- 有氧训练趋势。
- 体重/体成分趋势。
- 来源文件和待确认候选。
- 数据质量提示。

## UI Boundary

UI 可以：

- 请求 chart-ready API。
- 展示趋势图。
- 触发确认、拒绝、编辑。
- 展示来源和置信度。

UI 不应：

- 直接连接数据库。
- 重复实现训练负荷核心算法。
- 把低置信度候选当 confirmed fact 展示。
- 输出医学诊断式结论。

## Empty And Partial States

必须设计：

- 无数据。
- 仅有待确认数据。
- 来源缺失。
- 单位不完整。
- 趋势样本不足。

## Tests

首批测试：

- 空数据状态。
- pending 与 confirmed 的视觉区分。
- 图表输入来自 API 返回。
- 隐私字段不进入前端 payload。

