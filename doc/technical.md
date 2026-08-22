# 《开往黎明的末班车》技术文档

## 1. 技术栈

- React 18 + TypeScript 5 + Less + Vite 5。
- 游戏采用独立导出的 Cinematic Civic 叙事壳；构建 `base: './'`，可部署到任意子路径。
- 权威状态由本地 reducer 管理，大语言模型负责场景文本。普通自由行动仍可使用结构化协议；命中领域规则的行动则由本地原子事务独占整回合状态，模型的全部协议命令（包括 `choices`）都会丢弃，后续选项由本地 resolution 安装。
- 运行时图片通过 AlterU 独立媒体服务生成，当前目标尺寸为 `512×640`。仅当玩家是画面主要行动者时才带玩家头像参考；图片导演以同一列两节编组乡镇柴油列车的车厢/驾驶室为默认空间舞台，明确排除汽车、巴士、城市地铁和现代通勤地铁，并在提示版本升级时重建尚未完成的旧提示。当前场景提示版本为 `10`。

## 2. 目录结构

- `src/story/cartridges/lastTrainToDawn.ts`：世界规则、开场、三项数值、人物、地图、物品、八章结构、危险导演和中英文演示切片。
- `src/story/engine/domainRules.ts`：自由文本意图匹配、前置条件裁判、原子效果结算、本地后续选项、模型协议隔离和派生物品指标；拒绝动作不推进危险计时，丢弃命令不参与图片/里程碑触发。
- `src/story/engine/` 其余模块：协议解析、状态 reducer、危险导演、图片导演、结局导演和世界上下文构建。
- `src/story/engine/reducer.ts` 同时维护角色首次登场：`hiddenUntilIntroduced` 人物不进入初始/旧存档人物面板，可见 `character_update` 后才以 Cartridge 稳定 ID 创建。
- `src/story/engine/endingDirector.ts` 只为结局快照里真实出现过的必需角色生成后日谈，隐藏人物不会在最终页被提前泄漏。
- `src/story/StoryShell.tsx`：封面、仪表盘、竖幅场景、结果/选择阶段、状态抽屉和继续/重开流程。
- `src/story/audio/`：基于 Web Audio 的雨、柴油机、车轮节奏、提示和危险反馈。
- `src/shared/runtime/`：Aigram bridge、独立媒体服务（图片与五秒里程碑视频）、上传和平台调用适配。
- `src/shared/save/useGameSave.ts`：AIgram 存档与浏览器本地镜像。
- `public/poster.png`：1024×1024 英文正式海报；`meta.json` 指向该文件。
- `_qa/domain-rules.ts`：8 条规则的对抗式状态回放；`_qa/browser-domain-play.mjs`：真实浏览器游玩；`_qa/ui/domain-rules/`：390×844 运行截图。
- `_qa/character-debut.ts`：验证未来固定人物不会提前进入面板，旧预载状态可修复，可见介绍后恢复稳定 Cartridge 身份。

## 3. 核心模块

### 状态与主循环

每次输入先得到即时界面反馈，再由 `useStoryEngine` 解析生成结果。`protocol.ts` 将文本中的 `widget`、`party_change`、`inventory`、`map_update`、`fact`、`encounter`、`choices` 等命令转换为权威事务，并清除完整或缺括号的 `image_prompt / image_subject` 元数据；`stageNarrative.ts` 只把真正有信息量的局面、后果和对白送进字幕。`reducer.ts` 执行事务并保留历史，存档规范化会移除旧协议残留。

输入在危险导演之前先经过 `resolveDomainAction()`。未命中规则时沿用原有 AI 主持流程；命中时先检查地图、事实、物品、角色与危险阶段。合法动作以一个事务一次结算数值、事实、物品、小队、地图、危险与后续选项，非法动作零结算并返回具体原因，且不推进危险计时。受管辖回合拒绝模型产生的全部协议命令，并从图片导演/里程碑检测中隐藏这些命令，避免模型把“修启动机”和“搜燃料棚”等两个行动合并或让伪造奖励影响场景图。总调度钥匙的剩余次数由 `switch-key-uses` 单一事实派生，不保存第二份可漂移计数。

### 屏幕适配

主要画面是 4:5 竖幅场景，Civic 版采用“行动选择 → 处理中 → 行动结果 → 下一步选择”四阶段。第 0 场额外把 Cartridge 的六个开场叙事块作为玩家主动翻阅的顺序页，保持每页原有的叙述者/说话者身份，并在最后一页以前隐藏 Composer、自由输入和数字键选择。320×568、390×844 和 1280×800 均使用内部响应式布局，不依赖整页缩放。

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

- 改玩法与章节：编辑 `lastTrainToDawn.ts` 的 `director.chapters`、`dangerDirector`、`domainRules` 和演示回合；新增章节完成事实时同步结局条件。
- 换素材与画风：替换 `src/story/img/worlds/`，并同步调整 `sceneImageDirection`、`sceneImageAvoid`、`itemImageDirection` 和 `doc/visual.md`。修改运行时空间合同时递增 `SCENE_IMAGE_PROMPT_VERSION`，让未完成的旧场景图提示自动升级。
- 调数值：受管辖动作修改 `domainRules.effects`；非受管辖自由行动才修改模型协议与 `widget` 限制。三项主数值仍保持燃料、车况、人心。
- 加人物/物品/地点：使用稳定 ID 添加到 `characters`、`initialInventory`、`initialMap`，并通过协议事务显式改变状态。
- 加后端或多人痕迹：在 `src/story/adapters/` 增加适配器；共享内容只能补充站点传闻、援助或痕迹，不能覆盖本地权威主线状态。

## 连续性守门（2026-08-13）

- Cartridge 通过 `transitionAnchor` 声明“同一节列车车厢里的调度图与岗位表”；`src/story/engine/continuity.ts` 生成地点桥接、压缩 `decisionContext` 并核验选项名词是否已有可见依据。
- `reducer.ts` 在 `map_update` 与受管辖地图事务提交前插入桥接，并在选择落入 UI 前执行 grounded-choice 检查；旧存档升级到 StorySave v8 时从现有目标补齐 `decisionContext`。
- `filterGroundedChoices()` 逐条保留合法选项；一条成立也直接展示。平静态零条成立时快捷选项保持为空，由自由输入继续，不再生成会反复出现的通用兜底；危险态才恢复绑定同一威胁的确定性应对。`_qa/continuity-gate.ts` 同时覆盖全坏与部分合法两组输入。
- `protocol.ts` 先按 `|` 分段再剥每段首尾成对引号，`Mira's recording` 一类单词内部撇号不会再破坏英文选项协议；`_qa/protocol.ts` 固定回归该输入。

## 镜头导演与迁移（2026-08-17）

- StoryImageDirector.perspective 分别配置普通镜头、重要对话和新地点；当前产品使用 balanced / first-person / observer。
- engine/imageDirector.ts 在每次图片决策中写入 perspective，第一人称自动取消 playerVisible 与头像参考；玩家主导动作强制 observer。SCENE_IMAGE_PROMPT_VERSION=11 只重写尚未完成的旧图片任务，不批量重画历史成图。
- _qa/perspective-director.ts 对中英文各运行 20 张普通镜头，并覆盖重要对话、新地点和玩家主导动作。运行 npm run test:perspective 后再构建。

## 行动权威影子审计（2026-08-20）

- `engine/authorityShadow.ts` 在不改变确定性列车阶段流的前提下，将已显示选项按原有 `domainRules` 分类为 `accepted / rejected / open`，并报告非终局空 tray。
- 结果只保留在页面内存最近 100 条，不持久化、不上传、不生成替代选项；`?authority_shadow=0` 可关闭，`npm run test:authority-shadow` 验证零改写合同。
## 2026-08-23 混合音频升级

`src/story/audio/` 新增本作专属的柴油列车主题与积水车厢环境声，精确反馈继续由 Web Audio 负责。未知地点使用默认环境声；长音频自然结束后等待再播放，文件或自动播放失败不影响故事状态。

普通选择只有一次轻确认；普通正文、常规数值和图片完成静音，检定、稀有物、关系、危险、抵达与章节节点才追加结果提示。Cartridge 合成反馈上限为 `0.045`，引擎再乘 `0.52`；`180 ms` 内合并，合成/录制短音效并发上限为 6/2。

## 2026-08-23 阅读优先 A/B 配乐

列车区域底乐 A 采用低密度、长留白结构，结束后至少静默 30 秒；更完整的 B 只在关键发现、关系转折和章节收束出现。B 暂停 A、结束后恢复，同源触发至少间隔 180 秒。
