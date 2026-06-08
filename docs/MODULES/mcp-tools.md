# MCP Tools

## 范围

MCP 是 Hermes Mobile 和大模型访问 Healthy 数据的主要边界。MCP tool handler 只做参数边界、workspace 绑定和 Health API 调用；业务规则仍归属 service/provider 层。

## 编码和文本完整性

- MCP JSON-RPC、Health HTTP API 和本机生产 wrapper 都必须按 UTF-8 处理中文文本。
- MCP HTTP client 发送写入请求时使用 `application/json; charset=utf-8`。
- MCP tool 入参不得包含已经损坏的文本，例如 `????`、单独 `?`、Unicode replacement character 或常见 mojibake 片段。
- 服务端写入入口也会执行同一类文本完整性校验，错误码为 `invalid_text_encoding`。
- 检测到损坏文本时必须 fail closed，不得把损坏值写入数据库，也不得尝试猜测 Owner/workspace 回退。

## 工具组

Profile 和用药：

- `mcp_health_profile_get`
- `mcp_health_profile_update`
- `mcp_health_medications_list`
- `mcp_health_medication_add`

力量训练：

- `mcp_health_strength_exercise_catalog_list`
- `mcp_health_strength_sessions_list`
- `mcp_health_strength_session_record`
- `mcp_health_strength_session_update`

有氧训练：

- `mcp_health_cardio_activity_catalog_list`
- `mcp_health_cardio_sessions_list`
- `mcp_health_cardio_session_record`

## 运动分类归一化

所有通过 MCP 从图片/OCR/模型解析写入的运动记录，都必须先归一到
Healthy 的 canonical catalog。

力量训练：

- `set.exercise.key` 是首选字段，例如 `barbell_back_squat`。
- 如果只提供 `set.exercise.name`，服务端只接受已登记 alias，例如
  `深蹲`、`杠铃深蹲`、`Barbell Squat`。
- 服务端保存 canonical key，不用模型自由文本做统计分组。
- 未命中 catalog/alias 时返回 `unsupported_exercise`，不得自动创建新动作。

有氧训练：

- `activityType` 应为 canonical key，例如 `indoor_walk`、`elliptical`。
- 服务端可接受已登记 alias，例如 `室内步行`、`跑步机步行`、
  `Technogym walk`，并归一为 `indoor_walk`。
- 未命中 catalog/alias 时返回 `unsupported_activity_type`。

模型调用顺序建议：

1. 先调用 catalog list 工具获取支持的动作/活动和 alias。
2. 解析图片时保留 raw label 作为 notes/source metadata。
3. 写入时传 canonical key；不能确定时停止写入并要求人工确认。
4. 不得把训练记录写入 `mcp_health_clinical_event_record`。

身体指标：

- `mcp_health_body_measurements_list`
- `mcp_health_body_measurement_record`
- `mcp_health_body_measurement_update`
- `mcp_health_metrics_trends`

医疗时间线：

- `mcp_health_source_document_record` / `mcp_health_source_documents_list`
- `mcp_health_lab_result_record` / `mcp_health_lab_results_list` / `mcp_health_lab_result_update`
- `mcp_health_clinical_event_record` / `mcp_health_clinical_events_list`
- `mcp_health_clinical_finding_record` / `mcp_health_clinical_findings_list`
- `mcp_health_symptom_record` / `mcp_health_symptoms_list`
- `mcp_health_recovery_sleep_record` / `mcp_health_recovery_sleep_list`
- `mcp_health_risk_profile_record` / `mcp_health_risk_profiles_list`
- `mcp_health_followup_task_create` / `mcp_health_followup_tasks_list` / `mcp_health_followup_task_update`

## 时间线规则

- Lab values use `observedAt`.
- Clinical events use `eventDate`.
- Clinical findings use `observedAt` and optional `onsetDate`.
- Symptoms use `observedAt`.
- Sleep/recovery records use `sleepStart`.
- Risk profiles use `assessedAt` and append new assessments instead of overwriting old ones.
- Follow-up tasks keep creation/update state and optional `dueDate`.

## 输出合同

工具输出应包含：

- `ok`
- canonical id 或 query scope
- 来源信息
- 确认状态
- 数据质量警告
- 可解释的错误码

工具输出不得包含：

- access token
- raw workspace key
- cookie
- launch token
- 本机绝对路径
- 数据库连接字符串
- 完整 raw OCR payload
- 完整报告正文或附件内容

## 错误码

- `missing_user_context`
- `permission_denied`
- `invalid_input`
- `invalid_text_encoding`
- `source_not_found`
- `low_confidence_extraction`
- `duplicate_source`
- `unsupported_metric`
- `unsupported_exercise`
- `unsupported_activity_type`

## 测试要求

- MCP wrapper 缺 config/key 时 fail closed。
- MCP wrapper 不接受模型传入 workspace/key/token/cookie 覆盖。
- MCP client 写请求必须发送 UTF-8 JSON content type。
- MCP tool 入参含损坏文本时返回 `invalid_text_encoding`，并且数据库不产生记录。
- MCP 写入未知力量动作时返回 `unsupported_exercise`，并且数据库不产生记录。
- MCP 写入未知有氧活动时返回 `unsupported_activity_type`，并且数据库不产生记录。
- 服务端写入入口同样拒绝损坏文本。
- 文档、测试输出和 handoff 不写 raw key、token、cookie、完整健康记录或长日志。
