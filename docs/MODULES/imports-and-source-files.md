# Imports And Source Files

## Scope

本模块定义手动上传、图片/OCR、InBody-like 报告、薄荷健康/Boohee-like 数据和 MCP payload 的来源追踪。

## Source File Contract

每个来源文件必须保存：

- 用户。
- 来源类型。
- 存储引用。
- 文件名。
- MIME 类型。
- sha256。
- 捕获时间。
- 上传时间。
- 非敏感 metadata。

原始文件不进入 Git。数据库只保存存储引用。

## Extraction Contract

图片或文件解析结果分两层：

- raw structured extraction: 解析器返回的结构化候选。
- normalized payload: Healthy 规范化后的候选事实。

候选事实默认进入 `pending_review`，除非后续定义明确自动确认策略。

## Confirmation Rule

- 用户确认后才成为 confirmed fact。
- 低置信度候选不得覆盖 confirmed fact。
- 同一来源的重复 metric 不重复入库。
- rejected 候选应保留最小审计记录，便于解释为什么未入库。

## Privacy

不得在日志、文档、测试快照中保存：

- 真实报告图片。
- 完整 OCR 原文。
- 身份信息。
- 处方截图。
- token 或本机绝对路径。

## Tests

首批测试：

- sha256 去重。
- OCR 候选进入 pending review。
- confirm 操作幂等。
- rejected 候选不写入事实表。
- MCP 错误不泄漏 raw payload。

