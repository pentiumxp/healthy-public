# Healthy Documentation Index

本文件是 Healthy 仓库的文档入口。非平凡工作应先读 `.agent-context/PROJECT_CONTEXT.md` 和 `.agent-context/HANDOFF.md`，再读本索引，并只打开任务相关的最小文档集合。

## 文档层级

- `docs/ARCHITECTURE.md` - 系统架构、模块分层、MCP/HTTP/UI 调用路径。
- `docs/ARCHITECTURE_BOUNDARY.md` - Service-first 架构边界、入口文件职责、结构化架构门禁。
- `docs/PROJECT_REQUIREMENTS.md` - 项目需求分析、角色、场景、非目标、数据和隐私边界。
- `docs/PRODUCT_REQUIREMENTS.md` - 长期产品规则、首版范围、医学边界。
- `docs/IMPLEMENTATION_PLAN.md` - 阶段划分、交付物、迁移、验证和回滚策略。
- `docs/DATABASE.md` - 健康结构化数据模型、来源追踪、数据库约束。
- `docs/HARNESS_RULES.md` - H1/H2/H3 harness 分级规则。
- `docs/HARNESS.md` - 测试与架构约束总览。
- `docs/TEST_MATRIX.md` - 按变更类型选择验证命令和 harness。
- `docs/DELIVERY_CHECKLIST.md` - 每次交付前检查清单。
- `docs/HERMES_PLUGIN_INTEGRATION.md` - Healthy 作为 Hermes Mobile 独立插件的总体边界。
- `docs/HERMES_PLUGIN_MANIFEST.md` - manifest endpoint 和 bounded metadata 合同。
- `docs/HERMES_PLUGIN_PROVISIONING.md` - workspace provisioning、状态和 key/config 边界。
- `docs/HERMES_PLUGIN_MCP.md` - `health` MCP/toolset、workspace isolation 和 summary-first 输出。
- `docs/HERMES_PLUGIN_HARNESS.md` - 插件接入 H1/H2 harness 矩阵。
- `docs/MODULES/` - 模块级职责、接口、数据、约束。
- `docs/IMPLEMENTATION_NOTES/` - 复杂流程、分阶段计划、harness 分类矩阵。
- `docs/RUNBOOKS/` - 反复出现的问题、诊断路径、修复流程。
- `.agent-context/HANDOFF.md` - 当前工作状态和下一步，只放短期交接。

## 当前优先模块

- 健康插件用户开通与 Profile: `docs/MODULES/health-plugin.md`
- MCP 工具边界: `docs/MODULES/mcp-tools.md`
- 结构化健康数据域: `docs/MODULES/data-domains.md`
- 来源文件、图片/OCR/导入: `docs/MODULES/imports-and-source-files.md`
- 统计展示界面: `docs/MODULES/statistics-ui.md`
- Hermes Mobile 插件接入: `docs/HERMES_PLUGIN_INTEGRATION.md`

## 当前优先 Implementation Notes

- Harness 分类矩阵: `docs/IMPLEMENTATION_NOTES/harness-required-matrix.md`

## 当前优先 Runbooks

- Runbook 目录入口: `docs/RUNBOOKS/README.md`
- Apple Health 清洗导出导入: `docs/RUNBOOKS/apple-health-export-import.md`

## 更新规则

如果代码、数据模型、MCP 合约或产品行为发生变化，同一变更必须更新最小相关文档：

- 架构边界变化 -> `ARCHITECTURE.md` 和/或 `ARCHITECTURE_BOUNDARY.md`
- 数据库 schema 或约束变化 -> `DATABASE.md`
- 模块行为变化 -> `MODULES/<module>.md`
- 复杂流程或分阶段实现变化 -> `IMPLEMENTATION_NOTES/<feature>.md`
- 测试/harness 选择变化 -> `TEST_MATRIX.md` 和/或 `IMPLEMENTATION_NOTES/harness-required-matrix.md`
- 反复出现的线上/本地问题 -> `RUNBOOKS/<incident>.md`
- 当前交接状态 -> `.agent-context/HANDOFF.md`

## 隐私规则

文档、测试 fixture、handoff 和示例中不得保存真实健康报告图片、真实姓名、身份证、手机号、处方截图、访问令牌、数据库密钥、完整 OCR 日志、完整模型提示词或私密长文本。
