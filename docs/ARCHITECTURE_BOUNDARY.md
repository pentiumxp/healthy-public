# Architecture Boundary

本文件是 Healthy 的架构契约。目标是把业务逻辑稳定放在小型 service/provider 中，避免入口、路由、MCP handler、UI 组件变成大文件。

## Service-first 规则

新增产品行为必须先落在 service/provider，再由 MCP、HTTP 或 UI 边界调用。

默认位置：

```text
src/domain/<domain>/<name>.service.ts
src/domain/<domain>/<name>.repository.ts
src/domain/<domain>/<name>.types.ts
tests/services/<domain>/<name>.service.test.ts
```

MCP handler、HTTP route 和 UI component 只能做：

- 解析用户上下文。
- 校验请求边界的基本形状。
- 调用 service。
- 格式化响应。
- 处理显示或传输层错误。

它们不得拥有：

- 健康数据状态机。
- 用户/Profile 创建策略。
- Hermes 用户映射策略。
- 单位规范化。
- OCR/图片提取结果采纳策略。
- 训练负荷、趋势、PR、统计摘要计算。
- 用药、体检、体成分等敏感数据解释策略。

## 入口与组合根

`src/app/*` 是进程入口和依赖组合根。它可以注册 MCP server、HTTP server、worker 和 provider，但不应直接读写健康业务表。

如果后续出现运行时组合文件，必须保持为胶水层，不允许吸收领域逻辑。

## Module Boundary

首版领域模块：

- `users`: Hermes 用户映射、Profile、用药。
- `training`: 力量训练、有氧训练、动作库。
- `body`: 身体测量、体成分报告、分段体成分。
- `imports`: 来源文件、OCR/图片解析、候选事实确认。
- `analysis`: 趋势、训练负荷、统计摘要、分析记录。

模块之间通过 service 接口协作。repository 不跨模块直接读写其他模块表，除非通过明确的事务服务编排。

## Architecture Gates

Architecture gates measure ownership and module boundaries, not physical line
counts. Do not use line-count ceilings as pass/fail gates because they can be
gamed by deleting blank lines or compressing readable helpers into dense
single-line code.

Healthy architecture checks should assert:

- entrypoints and app files stay as process/composition glue;
- routes and MCP handlers delegate health behavior to named services/providers;
- health state machines, normalization, profile policy, import adoption, trend
  calculation, and sensitive interpretation stay out of routes and UI;
- repositories own persistence details and do not import HTTP, MCP, UI, or
  Hermes adapters;
- services expose stable factories and have focused tests;
- frontend modules stay split by UI ownership instead of moving back into one
  monolithic file.

Physical line counts may be collected as diagnostic metadata during review, but
must not fail CI or define whether a refactor succeeded.

## Import 边界

后续架构测试应检查：

- `src/adapters/mcp/tools/*` 不直接 import `src/db/client`。
- `src/adapters/http/routes/*` 不直接 import `src/db/client`。
- `src/ui/*` 不 import `src/db/*` 或 repository。
- repository 不 import HTTP、MCP、UI、Hermes adapter。
- service 不依赖具体 MCP/HTTP handler。
- app 层只负责依赖注入和启动。

## Review Checklist

提交非平凡变更前，至少确认：

- 是否有明确 owning service/provider。
- service 是否有 focused tests。
- MCP/HTTP/UI 是否只是边界适配。
- 是否保持明确的结构边界，且没有为了满足行数而压缩可读性。
- 数据来源、置信度、确认状态是否被保存。
- 测试和文档是否同步更新。
