# Health Plugin And User Profile

## Scope

本模块定义 Hermes Mobile 开通 Healthy 插件时的用户映射、Profile 初始化、用药数据和权限边界。

## Source Of Truth

- Hermes Mobile 提供来源用户上下文。
- Healthy 保存内部 `user_id` 和 `hermes_user_ref` 的稳定映射。
- Profile、用药和健康数据归属以 Healthy 内部 `user_id` 为准。

## Required Behavior

- 开通插件时创建或复用 Healthy user。
- 每个 `hermes_user_ref` 只能对应一个 Healthy user。
- MCP 写入必须解析到明确的 Hermes 用户。
- 不允许静默写入默认用户或 Owner 用户。
- Profile 更新不得删除既有健康事实。

## Profile Data

首版 Profile 字段：

- 出生日期或出生年。
- 性别。
- 身高。
- 目标体重。
- 训练目标。
- 活动水平。

## Medication Data

当前用药应结构化保存：

- 药名。
- 剂量数值和单位。
- 频率。
- 开始时间。
- 结束时间。
- 状态：active、paused、stopped。
- 备注。

用药数据是事实记录，不是医学建议。分析输出不得擅自建议停药、换药或调整剂量。

## Tests

首批测试：

- ensure profile 幂等。
- 缺少 Hermes 用户上下文时拒绝写入。
- 同一 Hermes 用户不会创建多个 Healthy user。
- 当前用药查询只返回 active 且未结束记录。

