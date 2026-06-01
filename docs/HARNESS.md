# Harness And Architecture Constraints

## 目标

Harness 用来约束 Healthy 的实现方式，防止后续代码退化成入口文件、路由文件或 MCP handler 的业务逻辑堆积。

本文档是架构契约。后续应把这些规则落实为自动化测试或 CI 检查。

## Service-first 硬规则

禁止把以下逻辑放在入口文件、路由文件、MCP tool handler 或 UI 组件中：

- 健康数据状态变更。
- 单位转换和字段规范化。
- 权限范围判断。
- Hermes 用户映射。
- 文件导入流程编排。
- OCR/图片分析结果采纳策略。
- 训练负荷、趋势、PR、统计摘要计算。
- 药物、体检、体成分等敏感数据解释策略。

这些逻辑必须进入 `domain/*/*.service.*` 或明确命名的 provider。

## 文件大小约束

首版建议阈值：

- 入口文件：不超过 120 行。
- 路由文件：不超过 180 行。
- MCP tool handler 文件：不超过 160 行。
- service 文件：不超过 260 行。
- repository 文件：不超过 220 行。
- UI component 文件：不超过 220 行。
- 单个测试文件：不超过 300 行。

超过阈值时，优先拆分：

- schema/validator
- pure helper
- repository
- service method group
- route group
- test fixture

阈值是上限，不是目标。

## 模块边界检查

应建立架构测试，至少检查：

- `src/app/*` 不直接 import `src/db/client` 之外的业务实现细节，只做依赖注入。
- `src/adapters/mcp/tools/*` 不直接写数据库。
- `src/adapters/http/routes/*` 不直接写数据库。
- `src/ui/*` 不直接 import `src/db/*` 或 `src/domain/*/*.repository.*`。
- `repository` 不 import HTTP、MCP、UI、Hermes adapter。
- `service` 可以 import repository interface/type，但不直接依赖具体 HTTP/MCP handler。

## 测试 Harness 分层

### Service tests

每个领域 service 必须有 focused tests。

首批测试：

- 用户开通健康插件时创建或复用 profile。
- MCP 请求缺少 Hermes 用户上下文时拒绝写入。
- 力量训练入库时规范化 kg、校验 reps/weight。
- 有氧训练入库时规范化 km、校验心率。
- InBody/图片提取结果进入 pending review。
- confirmed 数据不会被低置信度提取结果覆盖。

### Repository tests

覆盖数据库约束和事务。

首批测试：

- `hermes_user_ref` 唯一。
- 同一来源的重复 body metric 不重复写入。
- strength set 顺序唯一。
- source file sha256 去重。

### MCP contract tests

覆盖工具入参、出参和错误语义。

首批测试：

- `health.user.ensure_profile` 返回稳定 user id。
- `health.strength.record_session` 不接受无用户上下文。
- `health.body.import_from_image` 返回 extraction id 和待确认候选。
- 工具错误不暴露 token、文件绝对路径或长原始日志。

### Architecture tests

自动扫描文件大小和 import 边界。

建议脚本：

```text
scripts/check-architecture.ts
```

检查项：

- 文件行数阈值。
- 禁止 import 规则。
- MCP 工具必须调用 service。
- route 文件必须调用 service。
- service 文件必须有对应测试。

## 数据安全约束

禁止进入 Git 或测试快照：

- 原始健康报告图片。
- 真实姓名、身份证、手机号。
- 真实药物处方截图。
- 原始 access token。
- 长 raw OCR 日志。

允许进入测试 fixture：

- 人工构造的匿名测量数据。
- 手写的最小 InBody-like JSON。
- 合成图片或极小样例文本。

## MCP 输出约束

MCP 工具输出应包含：

- 操作是否成功。
- 写入或查询的 canonical id。
- 数据来源。
- 确认状态。
- 必要的数据质量警告。

MCP 工具输出不应包含：

- 数据库连接信息。
- 本机绝对文件路径。
- 原始 token。
- 不必要的完整 raw payload。
- 医学诊断式结论。

## Done Criteria

任何新增健康数据域必须同时完成：

- schema 或迁移设计。
- service。
- repository。
- MCP 或 HTTP 边界。
- focused service tests。
- 架构边界测试更新。
- 文档更新。

