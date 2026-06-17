# Structured Health Data Domains

## Scope

本模块描述首版进入数据库的健康数据域。判断标准是：可重复测量、有时间戳、有单位、有来源、可跨时间比较。

## First Slice

第一阶段实现：

- 用户 Profile。
- 当前用药。
- 力量训练。
- Apple Health workout 长期保存；Healthy 页面不重复展示 Apple Fitness/Health 有氧面板。
- 身体测量。
- 体成分报告。
- 来源文件和提取结果。

## Strength Training

必须支持：

- session。
- exercise catalog。
- set-level 记录。
- kg 规范化。
- reps、weight、RPE、warmup、failure。

可计算：

- 周训练量。
- 单动作容量趋势。
- 估算 1RM。
- 肌群频率。

## Cardio Training

必须支持：

- 活动类型。
- 时长。
- 距离。
- 平均/最大心率。
- 心率区间。
- RPE。

可计算：

- 周有氧总量。
- Zone 2 时间。
- 配速/心率趋势。

## Body And Composition

必须支持：

- 体重。
- 围度。
- 血压、静息心率等基础生命体征。
- InBody-like 体成分报告。
- 分段肌肉/脂肪数据。

## Deferred Domains

第二阶段再展开：

- 营养每日汇总。
- 睡眠与恢复。
- 化验/体检指标。
- 症状和主观状态。

这些领域可以预留专表方向，但首版不应让范围膨胀。

## Apple Health Export Compatibility

Owner 工作区 Apple Health 清洗导出已确认包含 daily activity、body
composition、cardiorespiratory/vitals、sleep、workout、ECG、mobility/gait、
nutrition、hearing/environment 和 habits/events。当前 Healthy 已对 daily
activity、workout、sleep、ECG、body/vitals 建立稳定同步入口。

清洗导出的 full daily/source-daily 聚合记录会保存到
`apple_health_observations`，用于承接 mobility/gait、nutrition、
hearing/environment、habits/events 等暂未建专表但仍需长期保留的观察域。
导出包文件清单保存到 `apple_health_import_files`，ECG 波形和 workout route
GPX 点位分别保存到采样点专表。

Workout 明细导出不包含 per-workout 心率样本；训练心率图的数据应由 iOS
原生壳按 workout 时间窗读取 HealthKit `HeartRate` samples，并在
`heartRateSamples` 中传入。

日常自动同步不得把最近一年或全量 Apple Health 作为单个 payload 发送。
原生壳应先读取 `GET /api/v1/apple-health/sync-state` 或
`mcp_health_apple_health_sync_state_get`，按每个 domain 的
`recommended_since` 查询 HealthKit；没有新样本时跳过写入，有新样本时再
调用 `POST /api/v1/apple-health/incremental-sync` 或
`mcp_health_apple_health_incremental_sync`。

ECG 需要能绘制心电图时，原生壳应同步 ECG waveform：优先传
`voltageSamples`，也可传 `voltagesMicrovolts`。Healthy 会长期保存采样点，
并通过 ECG record 读取接口返回 plot-ready `voltage_samples`。

Apple Health bulk-sync 入库前必须把会绑定到 SQLite 的文本字段规整为标量
字符串或 `null`，包括 workout/ECG `sourceRef`、`notes`、ECG sample
`externalId`、body/vitals `bodyPart` 和 `notes`。如果 iOS 壳传入
device/source revision 这类对象或数组，Healthy 应保存 bounded JSON 字符串，
不能把对象/数组原样传给 SQLite bind。

UI 边界：Apple Health 数据在 Healthy 主界面只显示同步状态，不重复展示步数、
消耗热量、睡眠或 Apple workout 详情；这些具体指标属于 Apple Health 原生界面。
Healthy 主界面优先展示服药、体检/医疗重点、来源发现和专项力量训练等互补数据。

## Tests

首批测试：

- 单位规范化。
- 数据范围约束。
- 来源去重。
- confirmed 数据保护。
- service 统计结果可复现。
