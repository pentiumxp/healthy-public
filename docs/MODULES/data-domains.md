# Structured Health Data Domains

## Scope

本模块描述首版进入数据库的健康数据域。判断标准是：可重复测量、有时间戳、有单位、有来源、可跨时间比较。

## First Slice

第一阶段实现：

- 用户 Profile。
- 当前用药。
- 力量训练。
- 有氧训练。
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
- Apple Health mobility/gait、nutrition、hearing/environment、habits/events
  等长期观察域。

这些领域可以预留 schema 方向，但首版不应让范围膨胀。

## Apple Health Export Compatibility

Owner 工作区 Apple Health 清洗导出已确认包含 daily activity、body
composition、cardiorespiratory/vitals、sleep、workout、ECG、mobility/gait、
nutrition、hearing/environment 和 habits/events。当前 Healthy 已对 daily
activity、workout、sleep、ECG、body/vitals 建立稳定同步入口。

Workout 明细导出不包含 per-workout 心率样本；训练心率图的数据应由 iOS
原生壳按 workout 时间窗读取 HealthKit `HeartRate` samples，并在
`heartRateSamples` 中传入。

ECG 需要能绘制心电图时，原生壳应同步 ECG waveform：优先传
`voltageSamples`，也可传 `voltagesMicrovolts`。Healthy 会长期保存采样点，
并通过 ECG record 读取接口返回 plot-ready `voltage_samples`。

## Tests

首批测试：

- 单位规范化。
- 数据范围约束。
- 来源去重。
- confirmed 数据保护。
- service 统计结果可复现。
