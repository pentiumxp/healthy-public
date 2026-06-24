# Product Requirements

本文档保存 Healthy 的长期产品规则。实现细节放在 architecture/module/implementation 文档中。

## Product Position

Healthy 是个人健康结构化数据仓库，提供统计展示界面，并通过 MCP 工具向 Hermes Mobile 暴露入库、查询和分析能力。

## Non-Negotiable Rules

- 所有健康数据必须归属到明确用户。
- MCP 写入不得在缺少 Hermes 用户上下文时落到默认用户或 Owner 用户。
- 数据库只把可追溯、可重复测量、可跨时间比较的数据作为事实保存。
- OCR、图片分析、模型提取结果默认是候选事实，必须保留来源、置信度和确认状态。
- confirmed 事实不得被低置信度候选自动覆盖。
- 分析结果必须与原始事实分开保存。
- Healthy 可以做趋势、统计、异常提示和数据质量提示，不输出医学诊断式结论。
- 用药信息只作为用户事实和分析上下文，不用于自动建议停药、换药或改剂量。
- 原始健康报告、真实身份信息、token、长 raw OCR 日志不得进入 Git、文档、handoff 或测试快照。

## First Release Scope

第一阶段只实现：

- 用户/Profile。
- 当前用药。
- 力量训练。
- Apple Health 同步状态和结构化数据底座；Apple workout 明细供 MCP/AI 查询，不在 Healthy 页面重复做有氧训练面板。
- 身体测量和体成分报告。
- 来源文件与提取候选。
- MCP 入库、查询、分析摘要。
- 基础统计 UI。
- Home AI host action labels must describe implemented embedded UI destinations. The first release exposes read-mostly views such as body metrics, trends, strength training, health overview, medications, and source-backed health priorities; direct metric/training entry forms, generated reports, and diagnosis-style advice are not host-visible UI actions until implemented and tested.

以下领域暂缓：

- 完整营养食物库。
- 睡眠设备集成。
- 化验单完整 OCR 流程。
- 症状日记。
- 医疗级风险评估。
