# Database Design

## 建模原则

- 每条健康事实必须归属到一个用户。
- 每条可测量数据必须有时间戳、单位、来源和确认状态。
- 导入数据必须保留原始来源引用和解析结果。
- AI/OCR 结果默认是候选事实，除非符合明确的自动确认策略。
- 分析结果与原始事实分表保存，避免把推断当成事实。

## 通用字段

建议多数业务表包含：

- `id`
- `user_id`
- `created_at`
- `updated_at`
- `recorded_at` 或 `measured_at`
- `source_id`
- `confirmation_status`
- `notes`

`confirmation_status` 建议枚举：

- `pending`
- `confirmed`
- `rejected`
- `superseded`

## 用户与 Profile

### users

- `id`
- `hermes_user_ref`
- `display_name`
- `plugin_enabled`
- `created_at`
- `updated_at`

约束：

- `hermes_user_ref` 唯一。
- MCP 请求无法解析 `hermes_user_ref` 时拒绝写入。

### user_profiles

- `id`
- `user_id`
- `birth_date`
- `sex`
- `height_cm`
- `target_weight_kg`
- `training_goal`
- `activity_level`
- `created_at`
- `updated_at`

约束：

- `user_id` 唯一。
- `height_cm` 必须大于 0。

### medications

- `id`
- `user_id`
- `name`
- `dose_value`
- `dose_unit`
- `frequency`
- `started_at`
- `ended_at`
- `status`
- `notes`

约束：

- `status` 枚举：`active`, `paused`, `stopped`.
- 当前用药查询以 `status = active` 且 `ended_at` 为空或晚于当前日期为准。

## 来源与导入

### source_files

- `id`
- `user_id`
- `source_type`
- `storage_uri`
- `file_name`
- `mime_type`
- `sha256`
- `captured_at`
- `uploaded_at`
- `metadata_json`

`source_type` 示例：

- `manual`
- `image_upload`
- `inbody_report`
- `boohee_export`
- `mcp_payload`
- `device_import`

约束：

- `sha256` 用于去重。
- 原始文件不进入 Git，数据库只保存存储引用。

### extraction_results

- `id`
- `user_id`
- `source_file_id`
- `provider`
- `extracted_at`
- `confidence`
- `raw_payload_json`
- `normalized_payload_json`
- `status`

约束：

- `status` 枚举：`pending_review`, `accepted`, `rejected`, `partially_accepted`.
- `raw_payload_json` 只存解析结构，不存不可控长日志。

## 力量训练

### exercise_catalog

- `id`
- `name`
- `category`
- `primary_muscle_group`
- `secondary_muscle_groups_json`
- `equipment`
- `is_user_defined`
- `user_id`

约束：

- 系统动作 `user_id` 可为空。
- 用户自定义动作必须有 `user_id`。

### strength_sessions

- `id`
- `user_id`
- `started_at`
- `ended_at`
- `duration_minutes`
- `session_rpe`
- `location`
- `notes`
- `source_id`

### strength_sets

- `id`
- `session_id`
- `exercise_id`
- `set_index`
- `weight_value`
- `weight_unit`
- `reps`
- `rpe`
- `is_warmup`
- `is_failure`
- `tempo`
- `rest_seconds`
- `notes`

约束：

- `reps` 大于 0。
- `weight_value` 大于等于 0。
- `weight_unit` 首版统一规范为 `kg`，导入时做单位转换。
- 同一 `session_id + exercise_id + set_index` 唯一。

## 有氧训练

### cardio_sessions

- `id`
- `user_id`
- `activity_type`
- `started_at`
- `ended_at`
- `duration_minutes`
- `distance_value`
- `distance_unit`
- `avg_heart_rate`
- `max_heart_rate`
- `calories_kcal`
- `avg_pace_seconds_per_km`
- `rpe`
- `source_id`
- `notes`

### cardio_zone_splits

- `id`
- `cardio_session_id`
- `zone`
- `duration_seconds`

约束：

- 距离首版统一规范为 `km`。
- 心率必须大于 0。
- zone 枚举可从 `z1` 到 `z5`。

## 身体数据与体成分

### body_measurements

通用身体测量表，适合体重、围度、血压等横向扩展。

- `id`
- `user_id`
- `measured_at`
- `metric`
- `value`
- `unit`
- `body_part`
- `source_id`
- `confirmation_status`
- `confidence`
- `notes`

`metric` 示例：

- `weight`
- `waist_circumference`
- `hip_circumference`
- `chest_circumference`
- `systolic_blood_pressure`
- `diastolic_blood_pressure`
- `resting_heart_rate`

约束：

- 同一来源提取出的同一 `metric + measured_at + body_part` 不重复入库。
- 单位必须规范化。

### body_composition_reports

适合 InBody 或类似体成分报告。

- `id`
- `user_id`
- `measured_at`
- `weight_kg`
- `body_fat_percentage`
- `skeletal_muscle_mass_kg`
- `body_water_kg`
- `protein_kg`
- `minerals_kg`
- `bmi`
- `basal_metabolic_rate_kcal`
- `visceral_fat_level`
- `source_id`
- `confirmation_status`
- `confidence`

### body_segment_composition

- `id`
- `report_id`
- `segment`
- `metric`
- `value`
- `unit`

`segment` 示例：

- `left_arm`
- `right_arm`
- `trunk`
- `left_leg`
- `right_leg`

## 营养、睡眠、化验的二阶段扩展

首版可预留模块，不必立即实现完整 UI。

### nutrition_daily_summaries

- 每日热量、蛋白质、碳水、脂肪、纤维、水、钠、咖啡因、酒精。

### sleep_sessions

- 睡眠开始/结束、总时长、REM、深睡、浅睡、静息心率、HRV、主观恢复评分。

### lab_results

- 指标名、数值、单位、参考范围、异常标记、检测时间、机构、来源文件。

## 分析结果

### analysis_runs

- `id`
- `user_id`
- `analysis_type`
- `started_at`
- `completed_at`
- `input_scope_json`
- `result_json`
- `model_or_rule_version`
- `source`

约束：

- 分析结果可重算，不作为原始事实。
- 分析必须记录输入范围，便于解释和复现。

