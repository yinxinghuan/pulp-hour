# Pulp Hour 技术文档

## 1. 技术栈

- React 18、TypeScript 5、Vite 5、Less；DOM/CSS 渲染杂志架、漫画 panel、结局海报与弹窗。
- `https://chat.aiwaves.tech/aigram/api/game-chat` 只负责故事正文、结局与翻译。
- 图片统一调用 AlterU 独立媒体服务 `https://game.aiwaves.tech/alteru-media/api/v1/images/generations`，任务提交后通过 `/v1/tasks/:id` 轮询；不再调用旧 `gen-image` 转发接口。
- 平台存档、事件、统计和资料页继续使用 Aigram 平台桥接；永久游戏 UUID 为 `7596f93a-1c72-48c1-8120-9e43a09c4c0d`。

## 2. 目录结构

- `src/PulpHour/PulpHour.tsx`：`wall / newsstand / beat / ending` 主状态机、身份等待、并行插图、发布与每日限制。
- `src/PulpHour/hooks/useBeatEngine.ts`：LLM beat/ending、媒体服务请求、身份提示合同、幂等重试和 Story 组装。
- `src/PulpHour/utils/me.ts`、`src/shared/runtime/identity-ready.ts`：等待平台身份并读取当前玩家资料。
- `src/shared/runtime/media.ts`：AlterU 图片/视频/音频任务客户端、尺寸归一、轮询、错误和请求键。
- `src/shared/runtime/useGenImage.ts`：共享 React 图片生成封装，已迁移到独立媒体服务。
- `src/PulpHour/utils/prompts.ts`、`scoring.ts`：结构化故事提示词和隐藏分值/动态收束。
- `src/PulpHour/components/BeatScreen.tsx`、`BeatPanel.tsx`、`EndingScreen.tsx`：写作页、插图状态和结局页。
- `src/PulpHour/components/PulpIcons.tsx`：返回、关闭、选择轴、空态和反应按钮共用的自绘 SVG 图标。
- `src/PulpHour/hooks/useWall.ts`、`components/Wall.tsx`：公共杂志架、本人故事合并、反应和资料入口。
- `src/PulpHour/PulpHour.less`：纸浆漫画视觉与窄屏适配；`public/covers/*.jpg` 是选刊和失败回退素材。
- `doc/requirements.md`、`doc/visual.md`、`doc/technical.md`：玩法、视觉与最终实现合同。

## 3. 核心模块

- 状态与玩法：`PulpHour.tsx` 保存当前封面、beats、ending 和发布状态；`judgeStory()` 在 3–12 次选择间依据 `insight / agency / cover / heat` 决定继续、成功或失败。
- 身份准备：启动时 `fetchMe()` 通过 `waitForAigramIdentity()` 最多等待 10 秒，仅在真实平台 `api_origin` 环境等待；第一张图复用同一个资料 Promise，避免桥接稍慢时误走匿名路径。
- 插图路由：有公开头像时使用 `edit`、只传 1 个原始 HTTPS 引用，并把玩家命名为 `SUBJECT A`；前置完整视觉身份合同与中央案件照布局压过 LLM 的泛化角色词。无头像时使用 `text`、引用数组为空，生成当前 beat 现场而非封面复制。
- 尺寸与并发：图片请求为 768×512，与最终 4:3 panel 一致，避免展示裁切完整身份；多个 beat 可并行生成，每个任务有独立 UUID `request_id`，不会共享 AbortController 或状态。
- 超时与重试：单次等待上限 280 秒。明确可重试错误遵守 `retry_after_seconds`；服务 `TIMEOUT` 或传输中断复用原请求键，其余可重试错误生成新键；最多受控重试 1 次。
- 失败恢复：panel 生成失败后显示本地封面和可点重试章，不阻断后续叙事；发布最多等待进行中的插图 60 秒。终局图失败则保留无图/既有回退链。
- 存档与共享：`useGameSave<PulpSave>('pulp-hour')` 保存本人最多 20 篇；公共墙按 `story.id` 去重并乐观合并本人刚发布的故事。
- 多语言与输入：UI 文案走轻量 i18n；他人故事按需翻译并缓存。动作按钮用 `onPointerDown`，滚动容器内卡片用 `onClick`。
- 音频：`installTapFeedback()` 首次交互恢复 Web Audio，播放约 45 ms 三角波并触发 6 ms 震动。

## 4. 扩展点

- 改剧情、JSON 合同或语言约束：`src/PulpHour/utils/prompts.ts`。
- 改分值、页数与收束：`src/PulpHour/utils/scoring.ts`、`src/PulpHour/types.ts`。
- 改媒体尺寸、身份布局、超时或重试：`src/PulpHour/hooks/useBeatEngine.ts`；通用媒体协议改 `src/shared/runtime/media.ts`。
- 换封面：替换 `public/covers/*.jpg` 并同步 `src/PulpHour/data/covers.manifest.json`。
- 改视觉和响应式：`src/PulpHour/PulpHour.less`，并同步 `doc/visual.md`。
- 改发布/存档：`src/PulpHour/PulpHour.tsx` 和 `src/PulpHour/hooks/useWall.ts`；保持平台 bridge 与浏览器 storage scope 合同不变。
