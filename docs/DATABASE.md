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
| `push_up` | 俯卧撑 | pushup、push-up、push up、俯卧撑、伏地挺身 |
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
- `elevation_gain_m`
- `elevation_loss_m`
- `active_energy_kcal`
- `total_energy_kcal`
- `average_heart_rate_bpm`
- `source_type`
- `source_name`
- `source_bundle_identifier`
- `device_name`
- `device_manufacturer`
- `device_model`
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

### apple_health_workout_heart_rate_summaries

保存 Apple Health workout 期间心率的 bounded 汇总，供 workout 列表和详情
展示平均/最低/最高心率及区间时间。

- `id`
- `user_id`
- `workout_id`
- `source_type`
- `external_id`
- `average_heart_rate_bpm`
- `min_heart_rate_bpm`
- `max_heart_rate_bpm`
- `zone1_seconds`
- `zone2_seconds`
- `zone3_seconds`
- `zone4_seconds`
- `zone5_seconds`
- `created_at`
- `updated_at`

约束：

- `workout_id` 唯一；`user_id + source_type + external_id` 也唯一。
- 缺失字段的重复同步不会把已有汇总值清空。

### apple_health_workout_heart_rate_samples

保存 workout 时间窗内的心率点，用于详情页心率图。Owner 的 Apple Health
清洗导出中 workout 明细 CSV 没有 per-workout 心率样本；这些样本需要原生
iOS 壳按 `HKWorkout` 起止时间查询 `HeartRate` 后随 workout bulk payload
传入。

- `id`
- `user_id`
- `workout_id`
- `source_type`
- `external_id`
- `sampled_at`
- `heart_rate_bpm`
- `created_at`
- `updated_at`

约束：

- `user_id + source_type + external_id` 唯一。
- 推荐 `external_id` 使用 HealthKit heart-rate sample UUID；fallback
  使用 workout 外部键、采样时间和数组位置，只用于避免插入冲突，不表达删除语义。
- 列表投影最多回传 2000 个样本点，避免初次同步后 dashboard payload 过大。

### apple_health_workout_route_points

保存 Apple Health 导出包里的 workout route GPX trackpoint，用于长期保留
轨迹原始序列。Healthy 当前主界面不展示路线图；该表用于后续审计、导出或
AI 工具按需读取。

- `id`
- `user_id`
- `source_type`
- `external_id`
- `route_file`
- `point_index`
- `recorded_at`
- `latitude`
- `longitude`
- `elevation_m`
- `metadata_json`
- `created_at`
- `updated_at`

约束：

- `user_id + source_type + external_id` 唯一。
- `external_id` 使用 route 文件名和点位序号，例如
  `apple_health_export_route:<route-file>:<point-index>`。
- 经纬度保存为 decimal degrees，海拔保存为米。

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

保存 Apple Health electrocardiogram 的结果级记录。电压波形采样点不直接
塞入本表，而是保存到 `apple_health_ecg_voltage_samples`，以支持心电图绘制
和 AI 分析。

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
- bulk sync 写入后只返回 bounded summary，不回显完整 ECG waveform。

### apple_health_ecg_voltage_samples

保存 ECG 电压波形采样点，供服务接口返回 plot-ready 数据。

- `id`
- `user_id`
- `ecg_id`
- `source_type`
- `external_id`
- `sample_index`
- `offset_ms`
- `voltage_microvolts`
- `created_at`
- `updated_at`

约束：

- `ecg_id + sample_index` 唯一；`user_id + source_type + external_id` 也唯一。
- 同一个 ECG 记录带 `voltageSamples` 或 `voltagesMicrovolts` 重传时，服务端会替换该
  ECG 的旧样本点，避免绘图残留旧 waveform。
- `voltageSamples` 元素字段为 `externalId`、`sampleIndex`、`offsetMs`、
  `voltageMicrovolts`；也支持紧凑数组 `voltagesMicrovolts`。
- 如果未传 `offsetMs` 且提供 `samplingFrequencyHz`，服务端按
  `sampleIndex * 1000 / samplingFrequencyHz` 计算 offset。
- 读取接口：
  `GET /api/v1/apple-health/ecg-records/:recordId` 或
  `GET /api/v1/apple-health/ecg-records/by-external-id?externalId=<id>`。

## Apple Health 清洗导出兼容记录

已抽样核对 Owner 工作区
`健身，健康/苹果健康/全量清洗分类数据`。当前 Healthy 首批长期表直接覆盖：

- `01_body_composition`: `BodyMass`、`BodyFatPercentage`、`LeanBodyMass`、
  `BodyMassIndex`、`WaistCircumference`。
- `02_activity_energy`: `StepCount`、`ActiveEnergyBurned`、
  `BasalEnergyBurned`、`DistanceWalkingRunning`、`AppleExerciseTime`、
  `AppleStandTime`、`FlightsClimbed`。
- `03_cardiorespiratory`: `HeartRate`、`RestingHeartRate`、
  `WalkingHeartRateAverage`、`HeartRateVariabilitySDNN`、`BloodPressure*`、
  `OxygenSaturation`、`RespiratoryRate`、`VO2Max`。
- `04_sleep_recovery`: `SleepAnalysis`。
- `05_workouts_routes`: workout 明细字段 `workout_type` / `type`、起止时间、
  duration、distance、energy、source metadata；route GPX 点位保存到
  `apple_health_workout_route_points`。
- `42_ecg_manifest`: ECG 记录日期、classification、sampling rate、sample count、
  duration、device/software bounded metadata。

### apple_health_observations

保存 Apple Health 清洗导出的全量 daily/source-daily 聚合记录。该表用于承接
暂未建专表的 mobility/gait、nutrition、hearing/environment、habits/events
等长期观察域，也保存已建专表域的聚合事实，便于后续 AI 查询完整时间线。

- `id`
- `user_id`
- `source_type`
- `external_id`
- `category_id`
- `category_name`
- `record_type`
- `metric_name`
- `source_name`
- `period`
- `granularity`
- `count`
- `numeric_sum`
- `numeric_avg`
- `numeric_min`
- `numeric_max`
- `duration_min`
- `non_numeric_count`
- `unit`
- `metadata_json`
- `created_at`
- `updated_at`

约束：

- `user_id + source_type + external_id` 唯一。
- `source_type` 区分 `apple_health_export_daily_observation` 和
  `apple_health_export_source_daily_observation`。
- 单位来自清洗导出的 record type dictionary；不把这些通用观察强行塞入
  body、workout 或 sleep 专表。

### apple_health_import_files

保存 Apple Health 导出包成员和清洗 route manifest 的文件级 provenance。

- `id`
- `user_id`
- `source_type`
- `external_id`
- `file_path`
- `file_kind`
- `byte_size`
- `row_count`
- `sha256`
- `metadata_json`
- `created_at`
- `updated_at`

约束：

- `user_id + source_type + external_id` 唯一。
- `file_kind` 示例：`ecg_csv`、`workout_route_gpx`、`zip_member`、
  `workout_route_manifest`。

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
