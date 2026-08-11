# 《开往黎明的末班车》技术文档

## 1. 技术栈

- React 18 + TypeScript 5 + Less + Vite 5。
- 游戏采用独立导出的 Cinematic Civic 叙事壳；构建 `base: './'`，可部署到任意子路径。
- 权威状态由本地 reducer 管理，大语言模型负责生成遵守协议的场景文本；数值、同伴、地图、物品、危险阶段和结局均通过结构化指令落盘。
- 运行时图片通过 AlterU 独立媒体服务生成，当前目标尺寸为 `512×640`。仅当玩家是画面主要行动者时才带玩家头像参考。

## 2. 目录结构

- `src/story/cartridges/lastTrainToDawn.ts`：世界规则、开场、三项数值、人物、地图、物品、八章结构、危险导演和中英文演示切片。
- `src/story/engine/`：协议解析、状态 reducer、危险导演、图片导演、结局导演和世界上下文构建。
- `src/story/StoryShell.tsx`：封面、仪表盘、竖幅场景、结果/选择阶段、状态抽屉和继续/重开流程。
- `src/story/audio/`：基于 Web Audio 的雨、柴油机、车轮节奏、提示和危险反馈。
- `src/shared/runtime/`：Aigram bridge、独立媒体服务（图片与五秒里程碑视频）、上传和平台调用适配。
- `src/shared/save/useGameSave.ts`：AIgram 存档与浏览器本地镜像。
- `public/poster.png`：1024×1024 英文正式海报；`meta.json` 指向该文件。
- `_qa/`：协议、危险、结局检查与真实界面截图证据。

## 3. 核心模块

### 状态与主循环

每次输入先得到即时界面反馈，再由 `useStoryEngine` 解析生成结果。`protocol.ts` 将文本中的 `widget`、`party_change`、`inventory`、`map_update`、`fact`、`encounter`、`choices` 等命令转换为权威事务；`reducer.ts` 执行事务并保留历史。

### 屏幕适配

主要画面是 4:5 竖幅场景，Civic 版采用“行动选择 → 处理中 → 行动结果 → 下一步选择”四阶段。320×568、390×844 和 1280×800 均使用内部响应式布局，不依赖整页缩放。

### 危险、同伴与背包

危险导演安排 1–3 个安全回合、2 回合冷却，并以预警、对峙、结算三阶段推进。三类回应为直接处理、交涉保护和侦察绕路。伙伴通过稳定 `character_id` 持续存在；物品获得、消耗和交换必须进入 `inventory` 事务，不能只写在叙述中。

### 音频

`StorySynth` 用 Web Audio 合成 62 BPM 的低频柴油脉冲、轮轨节奏、雨声、按钮确认、检定和危险提示。浏览器首次交互后解锁；媒体生成失败不会阻塞故事推进。

### 多语言

游戏提供中文和英文两套开场、章节、人物、地图、物品与演示回合。语言由平台/浏览器检测，可由现有语言入口切换。

### 存档与平台

永久游戏 UUID 为 `b2f2886f-46ec-459f-a70f-ab120a7b8edd`。存档命名空间为 `last-train-to-dawn`；平台存档不可用时保留浏览器本地恢复。再次进入有存档时使用模板现有的“继续游戏 / 重新开始”流程。

正式叙事与旧 `chat_id` 兼容入口统一调用 AlterU `game-chat` 网关；运行时媒体统一调用 `https://game.aiwaves.tech/alteru-media/api`。公开源码不包含模型提供商或私人测试机地址。

## 4. 扩展点

- 改玩法与章节：编辑 `lastTrainToDawn.ts` 的 `director.chapters`、`dangerDirector` 和演示回合；新增章节完成事实时同步结局条件。
- 换素材与画风：替换 `src/story/img/worlds/`，并同步调整 `sceneImageDirection`、`sceneImageAvoid`、`itemImageDirection` 和 `doc/visual.md`。
- 调数值：修改 `statDefinitions`、危险 DC、回退代价和各回合 `widget` 事务；三项主数值仍保持燃料、车况、人心。
- 加人物/物品/地点：使用稳定 ID 添加到 `characters`、`initialInventory`、`initialMap`，并通过协议事务显式改变状态。
- 加后端或多人痕迹：在 `src/story/adapters/` 增加适配器；共享内容只能补充站点传闻、援助或痕迹，不能覆盖本地权威主线状态。
