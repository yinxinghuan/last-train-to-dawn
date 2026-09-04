# Story Session React canary 视觉 QA

## Context

- 游戏：`last-train-to-dawn`，本机隔离 Story Session React canary。
- 目标：复用真实电影式 `StoryGameView`，检查首回合故障恢复、旧旅程目录、终局恢复和中英文移动端状态。
- 视觉依据：`doc/visual.md` 与 `ui-foundation`。
- 视口：中文 `390×844`，英文 `320×568`。
- 证据：`_qa/ui/platform-layout-last-train-to-dawn-*.png` 的首轮与 `-recheck` 配对截图。

## Executive assessment

- 决策：Pass。
- P0 / P1 / P2：`0 / 0 / 0`。
- 最强项：旧旅程目录自然嵌入原作列车控制台视觉，当前旅程、切换和危险重开具有明确层级。
- 最大剩余风险：真实平台身份、真实设备、生产网络故障和外部访客层不属于本机 canary 证据。

## Scorecard

| Category | Score | Evidence | Required action |
|---|---:|---|---|
| Hierarchy | 5 | 场景、三项列车状态、行动、结果和旅程目录层级明确 | 无 |
| Coherence | 5 | 延续原作墨绿、琥珀和铁路控制台视觉 | 无 |
| Readability | 4 | 中英文窄屏正文、状态和目录按钮均可读 | 真实设备复验留到 staging |
| Game feel | 4 | pending、故障恢复、结果与下一步阶段可见 | 真实网络时延留到 staging |
| Asset quality | 5 | 沿用原作列车场景与终局版式，无新增拼贴素材 | 无 |
| Responsive UX | 4 | 390×844 / 320×568 无页面横向溢出，目录行 52px | 真实设备复验留到 staging |
| Polish | 4 | focus、disabled、错误、loading、切换和危险重开均有合同 | 无 |

平均分 `4.43`，无低于 3 的类别。

## Foundation audit

- 功能 Emoji：无；严格审计零发现。
- 图标：继续使用现有统一 SVG 家族；没有新增功能图标。
- 触控目标：旅程行 `52px`，恢复和重开按钮至少 `44px`。
- 状态：当前旅程同时使用边界、文字和 disabled；故障有就地恢复按钮，不只依赖颜色。
- 本地化与溢出：中文 390、英文 320 均通过；320 宽度的标题省略沿用原作既有行为，不遮挡主行动。
- 平台构图：QA 截图不渲染外部访客栏，也没有让外部覆盖层反向改变主界面构图。

## Iteration evidence

- 首轮：四张 platform-layout 截图经人工检查，无 P0/P1。
- 功能修复：首场未知结果曾被 `scene === 0` 的展示 effect 重置成 decision，导致恢复按钮留在 DOM 但视觉隐藏；现仅在没有 engine error 时重置首场阶段。
- 匹配复验：修复后重新运行完整浏览器故障链并保存同四状态的 `-recheck`；版式与交互结论一致。
- 例外：没有把真实 `guest-shell.js` 注入本机 QA 入口，以免外部网络脚本污染合成测试；该状态留到 staging 发布检查。

## Final recommendation

本机 React canary 可通过并作为 `local-react-canary-passed` 证据；不得据此宣称生产身份、真实设备、真实模型/媒体或线上部署已完成。
