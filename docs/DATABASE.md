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

- 首版实现中 `name` 保存 canonical key，是统计、分组、趋势和 MCP 写入的稳定键，不使用 OCR/模型解析出的自由文本做分组键。
- 后续如需把显示名和 key 拆开，可新增 `canonical_key` / `display_name` 字段并做迁移；迁移前不要改变 `name` 的 canonical 语义。
- 系统动作 `user_id` 可为空。
- 用户自定义动作必须有 `user_id`。
- 首版不允许模型自动创建用户自定义动作；未命中 catalog/alias 的动作应返回 `unsupported_exercise` 或进入导入候选确认流程。
- UI/MCP 输出通过 catalog 把 canonical key 映射为中文优先显示名，括号中可带英文说明。

首版系统动作 canonical key：

| canonical_key | 中文显示名 | 常见 alias |
|---|---|---|
| `barbell_back_squat` | 杠铃深蹲 | 深蹲、杠铃深蹲、Barbell Squat、Back Squat、Squat |
| `barbell_overhead_press` | 杠铃推肩 | 推肩、杠铃推举、杠铃肩推、Overhead Press、Barbell Overhead Press |
| `barbell_bench_press` | 杠铃卧推 | 卧推、平板卧推、Bench Press、Barbell Bench Press |
| `barbell_deadlift` | 杠铃硬拉 | 硬拉、Deadlift、Barbell Deadlift |
| `barbell_row` | 杠铃划船 | 划船、Barbell Row、Bent-over Row |
| `pull_up` | 引体向上 | 引体、Pull-up、Pullup |

### exercise_aliases

- `id`
- `canonical_key`
- `alias`
- `locale`
- `source`

约束：

- alias 匹配只用于归一化，不作为长期统计 key。
- 同一个 alias 只能指向一个 canonical key。
- 模型/OCR 写入可以附带原始解析文本，但入库动作必须先归一到 canonical key。

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

有氧训练同样使用固定 activity catalog。入库字段 `activity_type` 保存
canonical key，不保存模型自由文本。首版系统 activity key：

| activity_type | 中文显示名 | 常见 alias |
|---|---|---|
| `indoor_walk` | 室内步行 | 室内走路、跑步机步行、Treadmill Walk、Indoor Walk、Technogym walk |
| `outdoor_walk` | 户外步行 | 户外走路、Outdoor Walk |
| `elliptical` | 椭圆机 | 椭圆仪、Elliptical、Cross Trainer |
| `run` | 跑步 | Running、Run |
| `cycling` | 骑行 | 单车、Cycling、Bike |
| `rowing` | 划船机 | Rowing、Rowing Machine |
| `other` | 其他有氧 | 仅在人工确认后使用 |

约束：

- 服务端必须把 alias 归一到上述 canonical key。
- 未命中 alias 的 activity 不得自动创建新分类，应返回 `unsupported_activity_type`。
- 图片/OCR 的原始活动描述只能作为来源/notes/候选字段，不得成为统计分组键。

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

## Apple Health 原生数据

原生 App 壳可以从 HealthKit 读取授权后的长期健康数据，并通过
Healthy API 批量写入。Apple Health 数据以可长期累积、可按 workspace
隔离查询的结构化事实保存；主界面只展示简洁摘要，AI/MCP 可读取完整
时间线。

### apple_health_daily_summaries

按 `source_type + external_id` 幂等更新，适合初次同步近几年数据。

- `id`
- `user_id`
- `external_id`
- `summary_date`
- `step_count`
- `active_energy_kcal`
- `basal_energy_kcal`
- `total_energy_kcal`
- `exercise_minutes`
- `stand_hours`
- `walking_running_distance_m`
- `flights_climbed`
- `resting_heart_rate_bpm`
- `average_heart_rate_bpm`
- `source_type`
- `created_at`
- `updated_at`

约束：

- `user_id + source_type + external_id` 唯一；推荐 `external_id`
  为 `apple_health_daily:<YYYY-MM-DD>` 或 HealthKit 稳定来源键。
- 距离统一规范为 `m`，能量统一规范为 `kcal`。
- 不保存 HealthKit 原始授权 token 或设备私密标识。

### apple_health_workouts

保存 Apple Health/HealthKit 层面的 workout 事件，例如步行、跑步、骑行、
传统力量训练等。深蹲、卧推、推肩这类专项力量动作仍由 Healthy
strength session / MCP strength 工具保存，不从 Apple Health workout
自由文本里自动拆解。

- `id`
- `user_id`
- `external_id`
- `started_at`
- `ended_at`
- `apple_activity_type`
- `normalized_activity_type`
- `duration_seconds`
- `distance_m`
- `active_energy_kcal`
- `total_energy_kcal`
- `average_heart_rate_bpm`
- `source_type`
- `source_ref`
- `metadata_json`
- `notes`
- `created_at`
- `updated_at`

约束：

- `user_id + source_type + external_id` 唯一；优先使用 HealthKit UUID，
  fallback 使用 `apple_health_workout:<endedAt-or-startedAt>`。
- `apple_activity_type` 保留 HealthKit 原始 workout 类型。
- `normalized_activity_type` 只映射到现有有氧展示 catalog：
  `outdoor_walk`、`indoor_walk`、`run`、`cycling`、`elliptical`、
  `rowing`、`other`。
- 原生壳可使用统一 bulk API 同步多年的 daily summary、workout、
  sleep、ECG、body measurement 和 vitals。

### apple_health_sleep_records

保存 Apple Health sleepAnalysis 聚合后的睡眠记录；不把首次同步的睡眠
塞进临时 cardio 或 UI cache。

- `id`
- `user_id`
- `external_id`
- `sleep_start`
- `sleep_end`
- `total_sleep_minutes`
- `rem_minutes`
- `deep_sleep_minutes`
- `core_minutes`
- `awake_minutes`
- `in_bed_minutes`
- `hrv_ms`
- `resting_heart_rate`
- `source_type`
- `metadata_json`
- `notes`
- `created_at`
- `updated_at`

约束：

- `user_id + source_type + external_id` 唯一；推荐 HealthKit UUID 或
  `apple_health_sleep:<sleepEnd-or-sleepStart>`。
- 睡眠阶段单位统一为分钟。

### apple_health_ecg_records

保存 Apple Health electrocardiogram 的结果级记录。首版只保存可长期查询
和 AI 总结所需的 bounded metadata，不保存完整电压采样数组。

- `id`
- `user_id`
- `external_id`
- `recorded_at`
- `ended_at`
- `classification`
- `average_heart_rate_bpm`
- `sampling_frequency_hz`
- `voltage_measurement_count`
- `symptoms_status`
- `source_type`
- `source_ref`
- `metadata_json`
- `notes`
- `created_at`
- `updated_at`

约束：

- `user_id + source_type + external_id` 唯一；推荐 HealthKit UUID 或
  `apple_health_ecg:<recordedAt>`。
- `classification` 保存规范化结果，例如 `sinus_rhythm`、
  `atrial_fibrillation`、`inconclusive_low_heart_rate`、`inconclusive_high_heart_rate`、
  `inconclusive_poor_reading` 或 `unrecognized`。
- 不保存完整 ECG waveform/sample payload；如后续需要原始波形，应走单独
  加密附件/来源文件存储设计。

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

## 2026-06 Medical Timeline Tables

The first medical-profile expansion adds append-friendly tables for longitudinal checkup data. Annual physical exams, lab values, imaging findings, symptoms, sleep/recovery observations, risk assessments, and follow-up tasks must be stored as timeline records, not as latest-only profile fields.

Implemented tables:

- `source_documents`: bounded metadata for imported reports and Markdown summaries. It stores `title`, `document_type`, optional `document_date`, `source_ref`, `source_hash`, `privacy_level`, `summary`, and `metadata_json`. It must not store raw report text or private attachments.
- `lab_results`: one row per lab value with `observed_at`, `panel`, `test_name`, optional `test_code`, numeric `value`, `unit`, reference range fields, `flag`, source document link, and notes.
- `clinical_events`: one row per checkup, imaging exam, cardiac test, renal scan, ultrasound, or similar event with `event_date`, `event_type`, `title`, `institution`, summary, source document link, confidence, and metadata.
- `clinical_findings`: one row per structured finding such as plaque, stenosis, fatty liver, borderline renal function, or low testosterone pattern. It stores `finding_key`, title, status, severity, body site, onset/observed dates, evidence, source links, confidence, and notes.
- `symptoms`: one row per symptom observation with `observed_at`, `symptom_key`, severity, duration, frequency, status, notes, and optional source document link.
- `recovery_sleep_records`: one row per sleep/recovery observation with sleep start/end, total sleep, REM, deep sleep, HRV, resting heart rate, recovery score, source type, and notes.
- `risk_profiles`: one row per risk assessment with `assessed_at`, `risk_key`, label, priority, status, confidence, summary, and evidence. New assessments append rows instead of overwriting prior years.
- `followup_tasks`: one row per follow-up item with title, category, priority, status, due date, notes, and source document link.

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
