# Harness Required Matrix

本文档定义 Healthy 变更何时必须增加 workflow/contract harness，而不是只依赖单元测试或手工验证。

## Classification Rule

非平凡变更先分类：

- **H1 Required Harness**: 影响用户归属、权限、数据库事实写入、导入确认、异步处理、MCP 合约、健康分析解释或数据迁移。完成条件包括对应 workflow/contract harness。
- **H2 Contract/Projection Harness**: 主要是展示、查询、统计投影、图表、错误状态或跨界面一致性。需要 route/UI/contract 测试，但不一定需要完整 workflow harness。
- **H3 Focused Tests Only**: 小型纯函数、文案、样式或孤立 helper，不改变状态、权限、异步行为、schema、MCP 合约或健康解释。

如果一个变更同时触及多类，按最高等级执行。

## H1 Flows

### Health Plugin User Provisioning

适用：

- Hermes Mobile 开通 Healthy 插件。
- 创建或复用 Healthy user。
- Profile 初始化。
- MCP 用户上下文解析。

必须覆盖：

- 幂等创建。
- 缺少用户上下文拒绝写入。
- 不落到 Owner/default 用户。
- 权限范围不越界。

### Source Import And Confirmation

适用：

- 图片/OCR/InBody-like 报告导入。
- 候选事实确认、拒绝、覆盖。
- 自动确认策略。

必须覆盖：

- source file 去重。
- raw extraction 与 normalized payload 分离。
- pending -> confirmed/rejected 状态转换。
- 低置信度不覆盖 confirmed fact。
- 错误输出不泄漏原始图片、长 OCR、token、绝对路径。

### MCP Write Tools

适用：

- `record_session`
- `record_measurement`
- `import_from_image`
- `confirm_measurements`
- 用药写入。

必须覆盖：

- 入参 schema。
- 用户上下文。
- repository 事务。
- canonical id 返回。
- 重试幂等或明确重复错误。

### Health Analysis

适用：

- 训练负荷。
- body trend。
- 健康摘要。
- 化验/用药相关解释。

必须覆盖：

- 输入数据范围记录。
- 可复现结果。
- 不把推断写回事实表。
- 不输出医学诊断式结论。

## H2 Flows

适用：

- 统计 UI 图表。
- 待确认候选展示。
- 数据质量提示。
- 查询 API 投影。

必须覆盖：

- confirmed/pending/rejected 的展示差异。
- 空数据和样本不足状态。
- chart-ready payload 结构。
- 隐私字段不出现在 UI payload。

## H3 Changes

适用：

- 小型文案。
- 无状态样式调整。
- 不影响健康解释的小型 helper。
- 文档索引更新。

仍需运行：

- 相关语法检查。
- 相关 focused test。
- `git diff --check`。

