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

Apple Health 原生数据：

- `mcp_health_apple_health_bulk_sync`
- `mcp_health_apple_daily_summaries_list`
- `mcp_health_apple_daily_summary_record`
- `mcp_health_apple_daily_summaries_bulk_record`
- `mcp_health_apple_workouts_list`
- `mcp_health_apple_workout_record`
- `mcp_health_apple_workouts_bulk_record`
- `mcp_health_apple_ecg_records_list`
- `mcp_health_apple_ecg_record_get`

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

Apple Health：

- 原生 App 壳从 HealthKit 获取授权数据后，通过 Healthy HTTP API 或 MCP
  bulk 工具写入 `apple_health_daily_summaries`、
  `apple_health_workouts`、`apple_health_sleep_records`、
  `apple_health_ecg_records` 和 body
  measurement/vitals。
- 初次同步近几年数据时应优先使用 `mcp_health_apple_health_bulk_sync`；
  服务端按当前 MCP wrapper workspace 和 `source_type + external_id`
  幂等更新，不回显完整大 payload。
- Apple Health workout 只表示 HealthKit 层面的运动项目。深蹲、卧推、推肩等
  专项力量动作仍使用 `mcp_health_strength_session_record` 和 canonical
  strength catalog。
- Workout 支持 `averageHeartRateBpm`、`minHeartRateBpm`、`maxHeartRateBpm`、
  `heartRateSummary` 和 `heartRateSamples`。`heartRateSamples` 元素字段为
  `externalId`、`sampledAt`、`heartRateBpm`；原生壳应优先传 HealthKit
  sample UUID 作为 `externalId`，用于幂等覆盖。
- Owner 的 Apple Health 清洗导出 workout CSV 没有训练期间心率曲线；训练心率图
  需要 iOS 壳按 workout 时间窗读取 HealthKit heart-rate samples 后写入。
- 睡眠同步长期保存到 `apple_health_sleep_records`；人工或非 Apple
  来源的睡眠/恢复观察仍可使用 `mcp_health_recovery_sleep_record`。
- ECG 同步长期保存到 `apple_health_ecg_records` 和
  `apple_health_ecg_voltage_samples`；bulk payload 字段为 `ecg_records`，
  也兼容 `ecgRecords` 和 `electrocardiograms`。
- Apple Watch ECG 分类会归一为 canonical key，例如中文 `窦性心律` ->
  `sinus_rhythm`、`房颤` -> `atrial_fibrillation`、`不确定` ->
  `inconclusive`、`高心率` -> `high_heart_rate`、`记录结果不佳` ->
  `poor_recording`。
- ECG waveform 写入支持两种格式：
  `voltageSamples: [{ externalId, sampleIndex, offsetMs, voltageMicrovolts }]`
  或紧凑数组 `voltagesMicrovolts: []`。如果有 `samplingFrequencyHz`，
  服务端可从 sample index 推导 offset。
- `mcp_health_apple_ecg_records_list` 返回 ECG metadata 和分类列表，不回传
  waveform 采样点，避免大 payload。
- `mcp_health_apple_ecg_record_get` 可按 `recordId` 或 `externalId` 返回单条
  ECG 的 metadata 和 plot-ready `voltage_samples`，用于 AI 画图/分析。
- 身体指标通过 bulk payload 的 `body_measurements` 写入，推荐 metric：
  `weight`、`body_fat_percentage`、`lean_body_mass`、`waist_circumference`、
  `hip_circumference`、`bmi`。Apple camelCase 名称如
  `bodyFatPercentage`、`leanBodyMass`、`waistCircumference`、
  `hipCircumference` 会归一到上述 canonical metric。
- 已确认 Apple Health 清洗导出还包含 mobility/gait、nutrition、
  hearing/environment 和 habits/events；这些域不落入 body/workout，
  清洗导入时通过 `apple_health_observations` 长期保存，后续可再按使用频率
  拆出专域 MCP/API。
- Apple Health 导出包 provenance 保存到 `apple_health_import_files`；ECG
  waveform 和 workout route GPX 点位分别保存到采样点专表，不在工具返回中
  默认回显大 payload。
- Tool arguments 不得包含 workspace、workspace_id、token、cookie、raw key
  或 launch token；workspace 必须由 MCP wrapper / Gateway 当前上下文解析。

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
