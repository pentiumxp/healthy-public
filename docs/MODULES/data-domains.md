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

这些领域可以预留 schema 方向，但首版不应让范围膨胀。

## Tests

首批测试：

- 单位规范化。
- 数据范围约束。
- 来源去重。
- confirmed 数据保护。
- service 统计结果可复现。

