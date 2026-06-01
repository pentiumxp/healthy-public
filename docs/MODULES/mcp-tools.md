# MCP Tools

## Scope

MCP 是 Hermes Mobile 调用 Healthy 的主要分析和入库边界。MCP tool handler 只做边界适配，业务逻辑必须委托给 service。

## Tool Groups

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

## Output Contract

工具输出应包含：

- `ok`
- canonical id 或 query scope。
- 来源信息。
- 确认状态。
- 数据质量警告。
- 可解释的错误码。

工具输出不得包含：

- access token。
- 本机绝对路径。
- 数据库连接字符串。
- 完整 raw OCR payload。
- 医学诊断式结论。

## Error Contract

错误应区分：

- `missing_user_context`
- `permission_denied`
- `invalid_input`
- `source_not_found`
- `low_confidence_extraction`
- `duplicate_source`
- `unsupported_metric`

## Tests

首批 contract tests：

- 每个 tool 的入参 schema 拒绝无效单位和缺少用户上下文。
- 写入型 tool 返回 canonical id。
- 图片导入 tool 返回 extraction id 和待确认候选。
- 错误输出通过隐私检查。

