# Healthy Docs

Healthy 的文档入口是 [DOCS_INDEX.md](DOCS_INDEX.md)。

新线程或新任务的读取顺序：

1. `.agent-context/PROJECT_CONTEXT.md`
2. `.agent-context/HANDOFF.md`
3. `docs/DOCS_INDEX.md`
4. 按任务读取最小相关文档

不要把当前 rollout 状态写进长期设计文档。短期交接写入 `.agent-context/HANDOFF.md`，长期规则写入 `docs/`。

