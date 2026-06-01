# Architecture

## 目标

Healthy 的核心目标是把个人健康数据变成可验证、可统计、可由 Hermes Mobile 调用的结构化系统。

系统分为三类入口：

- MCP tools: Hermes Mobile 调用的主要入口，用于创建用户、入库、查询和分析。
- HTTP API: Web UI 和后续管理界面的边界入口。
- Web UI: 面向人看的统计、趋势、数据校验和来源审阅界面。

所有入口只做上下文解析、权限校验入口调用、请求/响应格式转换。业务决策必须进入 service 层。

## 推荐目录结构

```text
src/
  app/
    http-server.ts
    mcp-server.ts
    worker.ts
  config/
    env.ts
    limits.ts
  db/
    client.ts
    migrations/
    schema/
  domain/
    users/
      user-profile.service.ts
      medication.service.ts
      user-profile.repository.ts
      user-profile.types.ts
    training/
      strength-training.service.ts
      cardio-training.service.ts
      exercise-catalog.service.ts
      training.repository.ts
      training.types.ts
    body/
      body-measurement.service.ts
      body-composition.service.ts
      body.repository.ts
      body.types.ts
    imports/
      import-job.service.ts
      source-file.service.ts
      extraction-result.service.ts
      imports.repository.ts
      imports.types.ts
    analysis/
      trend-analysis.service.ts
      training-load.service.ts
      health-summary.service.ts
      analysis.repository.ts
      analysis.types.ts
  adapters/
    mcp/
      tools/
      tool-registry.ts
      mcp-context.ts
    http/
      routes/
      middleware/
    storage/
      file-storage.provider.ts
    vision/
      image-extraction.provider.ts
  ui/
    routes/
    components/
    charts/
  tests/
    services/
    routes/
    mcp/
    architecture/
```

命名可随最终技术栈调整，但边界必须保持。

## 模块职责

### app

只负责进程入口、依赖注入、启动 HTTP/MCP/worker，不包含健康业务逻辑。

### config

集中读取环境变量、运行限制、文件大小限制、MCP 开关和数据库连接参数。

### db

只暴露数据库 client、迁移和 schema 定义。禁止在入口或 UI 组件中直接写 SQL。

### domain

业务核心。所有状态变更、单位规范化、来源校验、趋势计算、训练负荷计算、用户确认流程都在这里。

### adapters

外部边界适配层。MCP、HTTP、文件存储、图片分析、OCR、Hermes Mobile context 解析都属于 adapter。adapter 不拥有业务规则。

### ui

只展示数据、发起请求、提供校验操作。图表计算如果涉及业务语义，应由 service/API 返回，不在前端重复实现核心算法。

## Service-first 调用路径

MCP 入库示例：

```text
Hermes Mobile
  -> MCP tool handler
  -> mcp-context resolves hermes user
  -> service validates and normalizes payload
  -> repository writes database transaction
  -> service returns canonical result
  -> MCP handler formats response
```

Web UI 查询示例：

```text
Browser UI
  -> HTTP route
  -> auth/user context
  -> query service
  -> repository reads normalized data
  -> service computes chart-ready summary
  -> route returns JSON
```

图片入库示例：

```text
Upload file
  -> source-file service stores file metadata
  -> extraction provider returns structured candidates
  -> extraction-result service records raw extraction
  -> domain service validates units and ranges
  -> pending measurements await confirmation unless confidence policy allows auto-confirm
```

## MCP 工具分组

首版 MCP 工具建议按领域拆分，避免一个工具承担太多职责。

用户/Profile：

- `health.user.ensure_profile`
- `health.user.get_profile`
- `health.user.update_profile`
- `health.medication.list`
- `health.medication.upsert`

训练：

- `health.strength.record_session`
- `health.strength.query_progress`
- `health.cardio.record_session`
- `health.cardio.query_summary`

身体数据：

- `health.body.record_measurement`
- `health.body.query_trends`
- `health.body.import_from_image`

来源和确认：

- `health.import.create_source_file`
- `health.import.review_extraction`
- `health.import.confirm_measurements`

分析：

- `health.analysis.training_load`
- `health.analysis.body_trend`
- `health.analysis.summary`

## 权限与用户映射

Hermes Mobile 开通健康插件时，Healthy 创建或链接一个内部用户。

必须保存：

- Hermes user id 或 gateway context id。
- Healthy user id。
- 插件启用状态。
- MCP 工具授权范围。
- 创建时间、更新时间。

MCP 工具不得在无法解析来源用户时静默落到默认用户。

## 分析边界

Healthy 可以做趋势、统计、异常提示和数据质量提示，但不应输出医学诊断。涉及药物、化验异常、慢病风险时，输出应保留数据依据和不确定性。

## Hermes Mobile Plugin Boundary

Healthy is an independent Hermes Mobile plugin. Hermes Mobile owns plugin host, manifest normalization, provisioning status, same-origin proxy, iframe lifecycle, launch-token exchange, workspace switching, appearance sync, and Gateway/Hermes Agent toolset routing.

Healthy owns health business logic, database, migrations, import/archive behavior, plugin UI/API, MCP server/toolset, deployment scripts, harnesses, and privacy scan.

Detailed contracts:

- `docs/HERMES_PLUGIN_INTEGRATION.md`
- `docs/HERMES_PLUGIN_MANIFEST.md`
- `docs/HERMES_PLUGIN_PROVISIONING.md`
- `docs/HERMES_PLUGIN_MCP.md`
- `docs/HERMES_PLUGIN_HARNESS.md`
