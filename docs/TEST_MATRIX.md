# Test Matrix

本文档用于根据变更类型选择验证范围。实际命令会在技术栈确定后补齐。

## Full Gates

技术栈确定后应提供：

- 全量测试命令。
- 架构边界测试命令。
- 隐私扫描命令。
- 数据库迁移检查命令。
- `git diff --check`。

当前初始化阶段通用命令：

```powershell
git status -sb --untracked-files=all
codegraph status
git diff --check
```

Current Phase 1 commands:

```powershell
npm test
npm run check:utf8
npm run check:architecture
npm run check
```

## Module Matrix

| 模块 | 必跑测试 | 触发条件 |
| --- | --- | --- |
| 数据导入服务 | source-file/import workflow harness, repository tests | 图片/OCR/InBody-like 导入、候选确认、来源去重 |
| 健康记录 repository | repository constraint tests, migration checks | schema、唯一约束、事务、删除/导出 |
| 报告生成服务 | service harness, privacy scan | 生成、保存或导出健康报告 |
| API routes | route contract tests, auth/context tests | HTTP API 入参、鉴权、响应结构变化 |
| UI 投影 | projection/UI harness | 图表、空状态、pending/confirmed 展示变化 |
| MCP/plugin contract | MCP contract tests, privacy-safe error tests | MCP tool 入参、出参、权限或错误语义变化 |
| Hermes plugin manifest | manifest contract/privacy tests | `/api/v1/hermes/plugin/manifest` 字段、权限、embedding metadata |
| Hermes plugin provisioning | provisioning workflow/API harness | workspace bind、key/config 状态、active/manual/failed 状态 |
| Hermes plugin launch | launch contract/privacy tests | `/api/v1/hermes/plugin/launch`、短期 token、iframe entry |
| Hermes plugin postMessage | postMessage/projection harness | back、navigation、refresh、theme/font sync |
| 隐私扫描 | privacy scan | 上传、日志、fixture、报告、导出相关变化 |
| 架构边界测试 | architecture boundary test | 新增入口、route、tool handler、service、repository |

在以下情况运行 full gates：

- 数据库 schema 或迁移变化。
- MCP 工具合约变化。
- 用户/Profile/权限边界变化。
- OCR/图片导入自动确认策略变化。
- 分析结论或健康风险提示策略变化。
- 发布、部署或数据迁移前。

## Focused Gates

### 用户与 Profile

相关文档：

- `docs/MODULES/health-plugin.md`
- `docs/DATABASE.md`

需要覆盖：

- Hermes 用户开通插件时创建或复用 Healthy user。
- 缺少 Hermes 用户上下文时拒绝写入。
- 用药状态查询和结束时间逻辑。

### MCP 工具

相关文档：

- `docs/MODULES/mcp-tools.md`
- `docs/ARCHITECTURE_BOUNDARY.md`

需要覆盖：

- 工具入参 schema。
- 工具出参 canonical id。
- 错误不泄漏 token、绝对路径、长 raw payload。
- tool handler 调用 service，不直接写数据库。

### 训练数据

相关文档：

- `docs/MODULES/data-domains.md`
- `docs/DATABASE.md`

需要覆盖：

- 力量训练 kg 规范化。
- reps、weight、set_index 约束。
- 有氧 km、心率、zone 约束。
- 训练统计由 service 计算，不在 UI 重复实现核心算法。

### 身体数据与导入

相关文档：

- `docs/MODULES/imports-and-source-files.md`
- `docs/MODULES/data-domains.md`

需要覆盖：

- source file hash 去重。
- 图片/OCR 提取结果进入 pending review。
- 低置信度候选不会覆盖 confirmed 事实。
- 同一来源同一 metric 不重复入库。

### 统计 UI

相关文档：

- `docs/MODULES/statistics-ui.md`

需要覆盖：

- 图表数据来自 API/service 返回的 chart-ready 结果。
- UI 不直接做医学解释。
- 空数据、部分数据、待确认数据有明确展示。

## Harness 分类

非平凡变更必须先用 `docs/IMPLEMENTATION_NOTES/harness-required-matrix.md` 分类：

- H1: 必须新增或更新 workflow/contract harness。
- H2: 必须有边界、投影或 DOM/route contract 测试。
- H3: focused 单元测试或语法检查即可。
